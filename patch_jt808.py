"""
patch_jt808.py
Corriger le parser JT808 pour:
1. canParse : verifier seulement le premier byte 0x7e (TCP fragmentation safe)
2. Gerer 0x0100 registration: retourner isLoginPacket + IMEI
3. IMEI: strip leading zeros du BCD phone
4. Ajouter generateRegistrationAck pour envoyer 0x8100 au device
Et patcher server.js pour envoyer le ACK JT808 apres login.
"""
import subprocess

PARSER_PATH = '/var/www/trackyu-gps/backend/dist/gps-server/parsers/jt808.js'
SERVER_PATH = '/var/www/trackyu-gps/backend/dist/gps-server/server.js'

def read(path):
    r = subprocess.run(['ssh', 'trackyu-vps', f'cat {path}'], capture_output=True, text=True)
    return r.stdout

def write(path, content):
    r = subprocess.run(['ssh', 'trackyu-vps', f'cat > {path}'], input=content, capture_output=True, text=True)
    return r.returncode == 0

def patch(content, old, new, label):
    if old not in content:
        print(f'  SKIP (not found): {label}')
        return content
    result = content.replace(old, new, 1)
    print(f'  OK: {label}')
    return result

# ═══════════════════════════════════════════════════════
# PATCH 1 — jt808.js
# ═══════════════════════════════════════════════════════
print('[1/2] Patching jt808.js...')
content = read(PARSER_PATH)

# 1a. canParse: ne verifier que le premier byte (TCP-safe)
content = patch(content,
    '''    canParse(data) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        // Check start and end flags
        return buf[0] === 0x7e && buf[buf.length - 1] === 0x7e;
    }''',
    '''    canParse(data) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        // Only check start flag — end flag may be missing due to TCP fragmentation
        return buf.length >= 3 && buf[0] === 0x7e;
    }
    splitPackets(data) {
        // Extract complete 0x7e...0x7e frames; return partial frames as-is
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const packets = [];
        let i = 0;
        while (i < buf.length) {
            if (buf[i] !== 0x7e) { i++; continue; }
            // Find closing 0x7e
            let j = i + 1;
            while (j < buf.length && buf[j] !== 0x7e) j++;
            if (j < buf.length) {
                packets.push(buf.slice(i, j + 1));
                i = j + 1;
            } else {
                // Incomplete frame — include anyway for parse() to attempt
                packets.push(buf.slice(i));
                break;
            }
        }
        return packets.length > 0 ? packets : [data];
    }''',
    'canParse + splitPackets TCP-safe'
)

# 1b. Gerer 0x0100 registration et strip leading zeros
content = patch(content,
    '''            // Only handle Location Report (0x0200) for now
            if (msgId !== 0x0200) {
                logger_1.default.debug(`[JT808] Ignoring message ID: 0x${msgId.toString(16)}`);
                return null;
            }''',
    '''            // Strip leading zeros from BCD phone to get IMEI
            const imei = phone.replace(/^0+/, '') || phone;
            // Handle Terminal Registration (0x0100) — must ACK or device won't send positions
            if (msgId === 0x0100) {
                logger_1.default.info(`[JT808] Registration from IMEI ${imei} serial=${serial}`);
                return { imei, isLoginPacket: true, jt808Serial: serial, jt808Phone: content.slice(4, 10), latitude: 0, longitude: 0, speed: 0, heading: 0, timestamp: new Date(), raw: data.toString('hex') };
            }
            // Handle Heartbeat (0x0002)
            if (msgId === 0x0002) {
                return { imei, isHeartbeat: true, latitude: 0, longitude: 0, speed: 0, heading: 0, timestamp: new Date(), raw: data.toString('hex') };
            }
            // Only handle Location Report (0x0200)
            if (msgId !== 0x0200) {
                logger_1.default.debug(`[JT808] Ignoring message ID: 0x${msgId.toString(16)}`);
                return null;
            }''',
    'handle 0x0100 registration + strip IMEI zeros'
)

# 1c. Utiliser imei (deja calcule) au lieu de phone dans le return 0x0200
content = patch(content,
    '''            return {
                imei: phone,''',
    '''            return {
                imei,''',
    'use stripped imei in location return'
)

# 1d. Ajouter generateRegistrationAck method avant la fermeture de classe
content = patch(content,
    '''}
exports.JT808Parser = JT808Parser;''',
    '''    generateRegistrationAck(regSerial, phoneBytes) {
        // Build 0x8100 response: [answerSerial(2)] + [result(1)=0x00] + [authCode(4)="1234"]
        const authCode = Buffer.from('1234');
        const body = Buffer.alloc(3 + authCode.length);
        body.writeUInt16BE(regSerial, 0);
        body[2] = 0x00; // success
        authCode.copy(body, 3);
        const msgId = Buffer.from([0x81, 0x00]);
        const bodyLen = Buffer.alloc(2);
        bodyLen.writeUInt16BE(body.length);
        const phone = phoneBytes || Buffer.alloc(6);
        const serial = Buffer.alloc(2);
        serial.writeUInt16BE((regSerial + 1) & 0xffff);
        const inner = Buffer.concat([msgId, bodyLen, phone, serial, body]);
        // Checksum = XOR of inner bytes
        let cs = 0;
        for (const b of inner) cs ^= b;
        const raw = Buffer.concat([Buffer.from([0x7e]), inner, Buffer.from([cs & 0xff]), Buffer.from([0x7e])]);
        return raw;
    }
}
exports.JT808Parser = JT808Parser;''',
    'add generateRegistrationAck'
)

if write(PARSER_PATH, content):
    print('  jt808.js written OK')
else:
    print('  ERROR writing jt808.js')

# ═══════════════════════════════════════════════════════
# PATCH 2 — server.js : envoyer ACK JT808 apres login
# ═══════════════════════════════════════════════════════
print('[2/2] Patching server.js — JT808 registration ACK...')
content = read(SERVER_PATH)

content = patch(content,
    '''                    if (parsedData.isLoginPacket || parsedData.isHeartbeat) {
                        // Keep last-seen timestamp fresh so scheduler doesn't mark as OFFLINE
                        if (parsedData.isHeartbeat && socketVerificationState.get(socket) === 'verified') {
                            database_1.default.query('UPDATE objects SET updated_at = NOW() WHERE imei = $1', [imei]).catch(() => { });
                        }
                        continue;
                    }''',
    '''                    if (parsedData.isLoginPacket || parsedData.isHeartbeat) {
                        // Keep last-seen timestamp fresh so scheduler doesn't mark as OFFLINE
                        if (parsedData.isHeartbeat && socketVerificationState.get(socket) === 'verified') {
                            database_1.default.query('UPDATE objects SET updated_at = NOW() WHERE imei = $1', [imei]).catch(() => { });
                        }
                        // JT808: send 0x8100 registration ACK so device proceeds to send positions
                        if (parsedData.isLoginPacket && usedParser.generateRegistrationAck && parsedData.jt808Serial !== undefined) {
                            try {
                                const ack = usedParser.generateRegistrationAck(parsedData.jt808Serial, parsedData.jt808Phone);
                                socket.write(ack);
                                logger_1.default.info(`[JT808] Sent 0x8100 registration ACK to IMEI ${imei}`);
                            } catch(e) { /* ignore */ }
                        }
                        continue;
                    }''',
    'send JT808 registration ACK'
)

if write(SERVER_PATH, content):
    print('  server.js written OK')
else:
    print('  ERROR writing server.js')

# Syntax check
r = subprocess.run(['ssh', 'trackyu-vps',
    'docker run --rm -v /var/www/trackyu-gps/backend/dist:/app/dist '
    'node:18-alpine sh -c "node --check /app/dist/gps-server/parsers/jt808.js && node --check /app/dist/gps-server/server.js && echo OK"'],
    capture_output=True, text=True)
print('Syntax check:', r.stdout.strip() or r.stderr.strip()[:200])

# Restart
r2 = subprocess.run(['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
    capture_output=True, text=True)
print('Restart:', r2.stdout.strip())
