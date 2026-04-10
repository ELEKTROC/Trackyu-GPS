#!/bin/bash
# =============================================================================
# TrackYu GPS - TimescaleDB Automated Backup Script
# =============================================================================
# Usage: ./scripts/backup-db.sh [daily|weekly|manual]
# Cron:  0 2 * * * /var/www/trackyu-gps/scripts/backup-db.sh daily >> /var/log/trackyu-backup.log 2>&1
#        0 3 * * 0 /var/www/trackyu-gps/scripts/backup-db.sh weekly >> /var/log/trackyu-backup.log 2>&1
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_TYPE="${1:-manual}"
BACKUP_DIR="/var/www/trackyu-gps/backups"
DB_CONTAINER="trackyu-gps_postgres_1"
DB_USER="${DB_USER:-fleet_user}"
DB_NAME="${DB_NAME:-fleet_db}"
RETENTION_DAILY=7    # Keep 7 daily backups
RETENTION_WEEKLY=4   # Keep 4 weekly backups
RETENTION_MANUAL=10  # Keep 10 manual backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }

# Create backup directory
mkdir -p "${BACKUP_DIR}"

log "${GREEN}Starting ${BACKUP_TYPE} backup...${NC}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "${DB_CONTAINER}"; then
  log "${RED}ERROR: Database container '${DB_CONTAINER}' is not running!${NC}"
  exit 1
fi

# Perform backup (pg_dump with compression)
log "Dumping database '${DB_NAME}'..."
docker exec "${DB_CONTAINER}" pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --compress=9 \
  --verbose \
  2>/dev/null | gzip > "${BACKUP_FILE}"

# Verify backup
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
if [ -s "${BACKUP_FILE}" ]; then
  log "${GREEN}Backup successful: ${BACKUP_FILE} (${BACKUP_SIZE})${NC}"
else
  log "${RED}ERROR: Backup file is empty!${NC}"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Cleanup old backups based on retention policy
case "${BACKUP_TYPE}" in
  daily)  RETENTION=$RETENTION_DAILY ;;
  weekly) RETENTION=$RETENTION_WEEKLY ;;
  manual) RETENTION=$RETENTION_MANUAL ;;
  *)      RETENTION=10 ;;
esac

BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}/${BACKUP_TYPE}_"*.sql.gz 2>/dev/null | wc -l)
if [ "${BACKUP_COUNT}" -gt "${RETENTION}" ]; then
  EXCESS=$((BACKUP_COUNT - RETENTION))
  log "${YELLOW}Cleaning up ${EXCESS} old ${BACKUP_TYPE} backup(s)...${NC}"
  ls -1t "${BACKUP_DIR}/${BACKUP_TYPE}_"*.sql.gz | tail -n "${EXCESS}" | xargs rm -f
fi

# Summary
log "---"
log "Backup type:  ${BACKUP_TYPE}"
log "File:         ${BACKUP_FILE}"
log "Size:         ${BACKUP_SIZE}"
log "Retained:     ${RETENTION} ${BACKUP_TYPE} backups"
log "Total files:  $(ls -1 "${BACKUP_DIR}/"*.sql.gz 2>/dev/null | wc -l)"
log "${GREEN}Done!${NC}"
