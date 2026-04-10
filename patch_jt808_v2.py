"""
patch_jt808_v2.py
Corrections basées sur le protocole TA125/JT808 officiel:
1. Fix coordonnées: latRaw / 1000000 (pas × 10)
2. Fix latitude Sud: signe négatif si bit 2 du status = 1
3. Gérer 0x0102 authentication → répondre avec 0x8001
4. Extraire valeur fuel du tag 0x02
5. server.js: envoyer 0x8001 pour 0x0102 (en plus du 0x8100 pour 0x0100)
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

# 1a. Handle 0x0102 authentication (after 0x0100 block)
content = patch(content,
    '''            // Handle Heartbeat (0x0002)
            if (msgId === 0x0002) {
                return { imei, isHeartbeat: true, latitude: 0, longitude: 0, speed: 0, heading: 0, timestamp: new Date(), raw: data.toString('hex') };
            }''',
    '''            // Handle Terminal Authentication (0x0102) — reply with 0x8001
            if (msgId === 0x0102) {
                logger_1.default.info(`[JT808] Authentication from IMEI ${imei} serial=${serial}`);
                return { imei, isLoginPacket: true, isAuth0102: true, jt808Serial: serial, jt808Phone: content.slice(4, 10), latitude: 0, longitude: 0, speed: 0, heading: 0, timestamp: new Date(), raw: data.toString('hex') };
            }
            // Handle Heartbeat (0x0002)
            if (msgId === 0x0002) {
                return { imei, isHeartbeat: true, latitude: 0, longitude: 0, speed: 0, heading: 0, timestamp: new Date(), raw: data.toString('hex') };
            }''',
    'handle 0x0102 authentication'
)

# 1b. Fix coordinate formula: (latRaw * 10) / 1000000 → latRaw / 1000000
content = patch(content,
    '''            const lat = (latRaw * 10) / 1000000; // Adjusting to match user example logic
            let lng = (lngRaw * 10) / 1000000;''',
    '''            const lat = latRaw / 1000000; // per JT808 spec: value × 10^6
            let lng = lngRaw / 1000000;''',
    'fix coordinate formula ÷1000000'
)

# 1c. Fix South latitude sign (was commented out)
content = patch(content,
    '''            // Status Bit 2 = South Latitude
            if ((status & 0x04) !== 0) {
                // lat = -lat; // User example was North (68), bit 2 was 0.
            }''',
    '''            // Status Bit 2 = South Latitude
            let finalLat = lat;
            if ((status & 0x04) !== 0) {
                finalLat = -lat;
            }''',
    'fix South latitude sign'
)

# 1d. Use finalLat in return + extract fuel value
content = patch(content,
    '''                if (tag === 0x01) {
                    // Mileage
                }
                else if (tag === 0x02) {
                    // Fuel
                }''',
    '''                if (tag === 0x01) {
                    // Mileage (DWORD, 1/10km) — not stored for now
                }
                else if (tag === 0x02 && len === 2) {
                    // Fuel amount (WORD, 1/10L)
                    fuel = valueBuf.readUInt16BE(0) / 10;
                }''',
    'extract fuel value from tag 0x02'
)

# 1e. Use finalLat in the return statement
content = patch(content,
    '''            return {
                imei,
                latitude: lat,''',
    '''            return {
                imei,
                latitude: finalLat,''',
    'use finalLat in location return'
)

# 1f. Add fuel to return statement
content = patch(content,
    '''                raw: data.toString('hex'),
                status: status.toString(2)
            };''',
    '''                raw: data.toString('hex'),
                status: status.toString(2),
                ...(fuel !== undefined ? { fuel } : {})
            };''',
    'include fuel in location return'
)

# 1g. Add generateAuthAck method (0x8001 platform common reply for 0x0102)
content = patch(content,
    '''    generateRegistrationAck(regSerial, phoneBytes) {''',
    '''    generateAuthAck(authSerial, phoneBytes) {
        // Build 0x8001 platform common reply for 0x0102 authentication
        // Body: [answerSerial(2)] + [answerId(2)=0x0102] + [result(1)=0x00]
        const body = Buffer.alloc(5);
        body.writeUInt16BE(authSerial, 0);
        body.writeUInt16BE(0x0102, 2);
        body[4] = 0x00; // success
        const msgId = Buffer.from([0x80, 0x01]);
        const bodyLen = Buffer.alloc(2);
        bodyLen.writeUInt16BE(body.length);
        const phone = phoneBytes || Buffer.alloc(6);
        const serial = Buffer.alloc(2);
        serial.writeUInt16BE((authSerial + 1) & 0xffff);
        const inner = Buffer.concat([msgId, bodyLen, phone, serial, body]);
        let cs = 0;
        for (const b of inner) cs ^= b;
        const raw = Buffer.concat([Buffer.from([0x7e]), inner, Buffer.from([cs & 0xff]), Buffer.from([0x7e])]);
        return raw;
    }
    generateRegistrationAck(regSerial, phoneBytes) {''',
    'add generateAuthAck (0x8001 for 0x0102)'
)

if write(PARSER_PATH, content):
    print('  jt808.js written OK')
else:
    print('  ERROR writing jt808.js')

# ═══════════════════════════════════════════════════════
# PATCH 2 — server.js : envoyer 0x8001 après 0x0102
# ═══════════════════════════════════════════════════════
print('[2/2] Patching server.js — JT808 auth ACK (0x8001)...')
content = read(SERVER_PATH)

# Add 0x8001 ACK block + guard !isAuth0102 on 0x8100 block
content = patch(content,
    '''                        // JT808: send 0x8100 registration ACK so device proceeds to send positions
                        if (parsedData.isLoginPacket && usedParser.generateRegistrationAck && parsedData.jt808Serial !== undefined) {
                            try {
                                const ack = usedParser.generateRegistrationAck(parsedData.jt808Serial, parsedData.jt808Phone);
                                socket.write(ack);
                                logger_1.default.info(`[JT808] Sent 0x8100 registration ACK to IMEI ${imei}`);
                            } catch(e) { /* ignore */ }
                        }''',
    '''                        // JT808: send 0x8100 registration ACK (0x0100) or 0x8001 auth ACK (0x0102)
                        if (parsedData.isLoginPacket && !parsedData.isAuth0102 && usedParser.generateRegistrationAck && parsedData.jt808Serial !== undefined) {
                            try {
                                const ack = usedParser.generateRegistrationAck(parsedData.jt808Serial, parsedData.jt808Phone);
                                socket.write(ack);
                                logger_1.default.info(`[JT808] Sent 0x8100 registration ACK to IMEI ${imei}`);
                            } catch(e) { /* ignore */ }
                        }
                        if (parsedData.isAuth0102 && usedParser.generateAuthAck && parsedData.jt808Serial !== undefined) {
                            try {
                                const ack = usedParser.generateAuthAck(parsedData.jt808Serial, parsedData.jt808Phone);
                                socket.write(ack);
                                logger_1.default.info(`[JT808] Sent 0x8001 auth ACK to IMEI ${imei}`);
                            } catch(e) { /* ignore */ }
                        }''',
    'add 0x8001 auth ACK for 0x0102'
)

if write(SERVER_PATH, content):
    print('  server.js written OK')
else:
    print('  ERROR writing server.js')

# Syntax check
r = subprocess.run(['ssh', 'trackyu-vps',
    'docker run --rm -v /var/www/trackyu-gps/backend/dist:/app/dist '
    'node:18-alpine sh -c "node --check /app/dist/gps-server/parsers/jt808.js && node --check /app/dist/gps-server/server.js && echo SYNTAX_OK"'],
    capture_output=True, text=True)
print('Syntax check:', r.stdout.strip() or r.stderr.strip()[:300])

# Restart
r2 = subprocess.run(['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
    capture_output=True, text=True)
print('Restart:', r2.stdout.strip())
