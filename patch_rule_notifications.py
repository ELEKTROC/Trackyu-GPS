"""
Patch: câble Email + SMS dans ruleEvaluationService.js
Complète le bloc 3 (PUSH) pour aussi dispatcher EMAIL et SMS
selon les préférences utilisateur (emailAlerts, smsAlerts).
"""
import subprocess, sys

REMOTE    = "root@148.230.126.62"
FILE      = "/var/www/trackyu-gps/backend/dist/services/ruleEvaluationService.js"
CONTAINER = "trackyu-gps-backend-1"

OLD = """                // 3. Envoyer Notification PUSH aux utilisateurs du tenant
                const usersRes = yield database_1.default.query(`SELECT user_id FROM push_notification_preferences
                 WHERE (preferences->>'vehicleAlerts')::boolean = true
                 AND user_id IN (SELECT id FROM users WHERE tenant_id = $1)`, [tenantId]);
                for (const userRow of usersRes.rows) {
                    yield dispatcher.dispatch({
                        channel: 'PUSH',
                        userId: userRow.user_id,
                        tenantId,
                        title: `Alerte: ${violation.vehicleName}`,
                        body: violation.message,
                        type: 'vehicle_alert',
                        metadata: {
                            vehicleId: violation.vehicleId,
                            ruleType: violation.ruleType,
                            severity: violation.severity
                        }
                    }).catch(e => logger_1.default.error(`[Push] Failed for user ${userRow.user_id}: ${e.message}`));
                }"""

NEW = """                // 3. Envoyer notifications (PUSH + EMAIL + SMS) aux utilisateurs du tenant
                const usersRes = yield database_1.default.query(`
                    SELECT p.user_id, u.email, u.phone, p.preferences
                    FROM push_notification_preferences p
                    JOIN users u ON u.id = p.user_id
                    WHERE u.tenant_id = $1
                    AND (p.preferences->>'vehicleAlerts')::boolean = true
                `, [tenantId]);
                for (const userRow of usersRes.rows) {
                    const prefs = userRow.preferences || {};
                    const notifTitle = `Alerte: ${violation.vehicleName}`;
                    const notifBody = violation.message;
                    // PUSH
                    if (prefs.pushEnabled !== false) {
                        yield dispatcher.dispatch({
                            channel: 'PUSH',
                            userId: userRow.user_id,
                            tenantId,
                            title: notifTitle,
                            body: notifBody,
                            type: 'vehicle_alert',
                            metadata: {
                                vehicleId: violation.vehicleId,
                                ruleType: violation.ruleType,
                                severity: violation.severity
                            }
                        }).catch(e => logger_1.default.error(`[Push] Failed for user ${userRow.user_id}: ${e.message}`));
                    }
                    // EMAIL
                    if (prefs.emailAlerts && userRow.email) {
                        yield dispatcher.dispatch({
                            channel: 'EMAIL',
                            tenantId,
                            email: {
                                to: userRow.email,
                                subject: notifTitle,
                                html: `<p><strong>${notifTitle}</strong></p><p>${notifBody}</p>`,
                                text: `${notifTitle} - ${notifBody}`
                            }
                        }).catch(e => logger_1.default.error(`[Email] Failed for user ${userRow.user_id}: ${e.message}`));
                    }
                    // SMS
                    if (prefs.smsAlerts && userRow.phone) {
                        yield dispatcher.dispatch({
                            channel: 'SMS',
                            tenantId,
                            sms: {
                                to: userRow.phone,
                                message: `[TrackYu] ${notifTitle}: ${notifBody}`
                            }
                        }).catch(e => logger_1.default.error(`[SMS] Failed for user ${userRow.user_id}: ${e.message}`));
                    }
                }"""

def ssh(cmd):
    r = subprocess.run(["ssh", "-o", "ConnectTimeout=10", REMOTE, cmd],
                       capture_output=True, text=True)
    return r.stdout, r.stderr, r.returncode

def main():
    # 1. Lire le fichier
    out, err, rc = ssh(f"cat {FILE}")
    if rc != 0:
        print(f"ERREUR lecture {FILE}: {err}"); sys.exit(1)
    content = out

    # 2. Vérifier si déjà patché
    if "emailAlerts" in content:
        print("Patch deja applique - rien a faire."); return

    # 3. Vérifier que l'ancre existe
    if OLD not in content:
        print("ERREUR: bloc cible introuvable dans le fichier"); sys.exit(1)

    # 4. Remplacer
    new_content = content.replace(OLD, NEW, 1)

    # 5. Ecrire via fichier temp
    tmp = "/tmp/ruleEvaluationService_patched.js"
    proc = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=10", REMOTE, f"cat > {tmp}"],
        input=new_content.encode(), capture_output=True
    )
    if proc.returncode != 0:
        print(f"ERREUR ecriture tmp: {proc.stderr.decode()}"); sys.exit(1)

    _, err, rc = ssh(f"cp {tmp} {FILE} && rm {tmp}")
    if rc != 0:
        print(f"ERREUR copie: {err}"); sys.exit(1)

    # 6. Vérifier
    out2, _, _ = ssh(f"grep -c 'emailAlerts' {FILE}")
    count = int(out2.strip()) if out2.strip().isdigit() else 0
    if count < 1:
        print("ERREUR: verification echouee"); sys.exit(1)

    # 7. Redémarrer le container
    print("Redemarrage du container backend...")
    _, err, rc = ssh(f"cd /var/www/trackyu-gps && docker compose up -d --no-deps backend 2>&1 | tail -3")
    if rc != 0:
        print(f"ERREUR restart: {err}"); sys.exit(1)

    import time; time.sleep(8)
    out3, _, _ = ssh(f"docker logs {CONTAINER} --since 30s 2>&1 | grep -i 'started\\|firebase\\|error' | head -5")
    print(f"OK - Patch applique ({count} occurrence emailAlerts)")
    print(f"Logs: {out3.strip()}")

if __name__ == "__main__":
    main()
