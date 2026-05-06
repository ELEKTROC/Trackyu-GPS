#!/bin/bash
# trackyu-uptime.sh — monitoring /api/health + bridge Healthchecks.io
#
# Comportement :
#   - OK (2xx) : ping heartbeat HC -> HC considère le service vivant.
#   - KO après $FAIL_THRESHOLD échecs consécutifs : ping HC/fail -> HC alerte immédiatement.
#   - Absence totale de heartbeat (VPS down) : HC alerte automatiquement après Grace Time.
#
# Config : /etc/default/trackyu-uptime doit exporter HC_URL="https://hc-ping.com/<UUID>"
# Log    : /var/log/trackyu-uptime.log
# Flag   : /var/run/trackyu-uptime.down (touché si >= FAIL_THRESHOLD consécutifs KO)

set -euo pipefail

# Charger config externe (HC_URL) si présente
[[ -f /etc/default/trackyu-uptime ]] && . /etc/default/trackyu-uptime

URL="${URL:-https://trackyugps.com/api/health}"
HC_URL="${HC_URL:-}"
TIMEOUT=5
RETRIES=3
FAIL_THRESHOLD=2
LOG=/var/log/trackyu-uptime.log
STATE=/var/run/trackyu-uptime.state
FLAG=/var/run/trackyu-uptime.down

log() { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $*" >> "$LOG"; }

hc_ping() {
    # $1 = suffixe ("" pour heartbeat OK, "/fail" pour alerte)
    # $2 = payload texte optionnel
    [[ -z "$HC_URL" ]] && return 0
    curl -fsS -m 10 --retry 2 -o /dev/null \
        --data-raw "${2:-}" \
        "${HC_URL}${1:-}" 2>/dev/null || log "HC ping failed (${1:-ok})"
}

check() {
    for i in $(seq 1 "$RETRIES"); do
        if curl -fsS -m "$TIMEOUT" -o /dev/null -w '%{http_code}' "$URL" | grep -q '^2'; then
            return 0
        fi
        sleep 1
    done
    return 1
}

CONSECUTIVE_FAILS=0
[[ -f "$STATE" ]] && CONSECUTIVE_FAILS=$(cat "$STATE" 2>/dev/null || echo 0)

if check; then
    if [[ "$CONSECUTIVE_FAILS" -ge "$FAIL_THRESHOLD" ]]; then
        log "UP: recupere apres $CONSECUTIVE_FAILS echecs"
        rm -f "$FLAG"
    fi
    echo 0 > "$STATE"
    hc_ping "" "OK $(date -u +%H:%M:%SZ)"
else
    CONSECUTIVE_FAILS=$((CONSECUTIVE_FAILS + 1))
    echo "$CONSECUTIVE_FAILS" > "$STATE"
    log "DOWN #$CONSECUTIVE_FAILS (URL=$URL)"

    if [[ "$CONSECUTIVE_FAILS" -ge "$FAIL_THRESHOLD" ]]; then
        touch "$FLAG"
        hc_ping "/fail" "[trackyu] /api/health DOWN depuis $CONSECUTIVE_FAILS verifications"
    fi
fi
