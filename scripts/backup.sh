#!/usr/bin/env bash
# backup.sh — pg_dump per-DB (xblpp_prod, xblpp_staging) -> gzip -> GPG encrypt
# (AES256 symmetric) -> simpan tempatan (fallback) + push R2 (jika configured).
#
# Rujuk PRD Seksyen 5.5/7.1 — backup DB WAJIB encrypted memandangkan
# core.user_service_records simpan IC. GPG dipilih (bukan age) sebab dah
# terpasang atas VPS dikongsi ni — elak tambah pakej baharu tanpa keperluan.
#
# Cron: 0 2 * * * (2 pagi, PRD Seksyen 5.5) — rujuk docs/runbook/backup-restore.md
#
# Lokasi server (bukan lokasi repo — backup.sh sengaja bebas dari siklus
# deploy app supaya rollback/deploy gagal tak hilangkan backup automation):
#   /opt/xblpp/backup/backup.sh
set -euo pipefail

PG_CONTAINER="gerakops_pg"
DBS="xblpp_prod xblpp_staging"
DATE=$(date -u +%Y-%m-%d)
DAY_OF_MONTH=$(date -u +%d)
LOCAL_DIR="/opt/xblpp/backup/local"
DAILY_DIR="${LOCAL_DIR}/daily"
MONTHLY_DIR="${LOCAL_DIR}/monthly"
KEY_FILE="/opt/xblpp/secrets/backup_encryption_key.txt"
PG_APP_ENV="/opt/xblpp/secrets/pg_app.env"
# ⚠ Bucket R2 khusus xBLPP belum provision (PRD Seksyen 15 #6, status
# Tertunggak) — script cuba push, tapi gagal SENYAP (log amaran, bukan crash)
# sehingga rclone remote + bucket disediakan. Backup tempatan tetap jalan.
R2_REMOTE="r2:xblpp-backups"

mkdir -p "${DAILY_DIR}" "${MONTHLY_DIR}"

if [[ ! -f "${KEY_FILE}" ]]; then
  echo "RALAT: kunci enkripsi backup tiada di ${KEY_FILE}" >&2
  exit 1
fi
if [[ ! -f "${PG_APP_ENV}" ]]; then
  echo "RALAT: credential DB tiada di ${PG_APP_ENV}" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "${PG_APP_ENV}"

echo "==> Backup run: ${DATE}"

for DB in ${DBS}; do
  DUMP_NAME="${DB}_${DATE}.sql.gz.gpg"
  DUMP_PATH="${DAILY_DIR}/${DUMP_NAME}"
  echo "    dumping ${DB}..."
  docker exec -e PGPASSWORD="${PGPASSWORD}" -i "${PG_CONTAINER}" \
    pg_dump -U xblpp_app -d "${DB}" \
    | gzip \
    | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-file "${KEY_FILE}" \
      --output "${DUMP_PATH}"
  SIZE=$(du -h "${DUMP_PATH}" | cut -f1)
  echo "    ${DB}: ${SIZE} (encrypted, tempatan)"

  # Salin ke monthly/ pada hari pertama tiap bulan — retention 12 bulan.
  if [[ "${DAY_OF_MONTH}" == "01" ]]; then
    cp "${DUMP_PATH}" "${MONTHLY_DIR}/${DB}_$(date -u +%Y-%m).sql.gz.gpg"
  fi

  if rclone listremotes 2>/dev/null | grep -q '^r2:$'; then
    if rclone copy "${DUMP_PATH}" "${R2_REMOTE}/daily/" -q 2>/tmp/xblpp-backup-r2-err.log; then
      echo "    push R2: OK"
    else
      echo "    AMARAN: push R2 gagal (bucket xBLPP mungkin belum wujud) — dump kekal tempatan sahaja"
      cat /tmp/xblpp-backup-r2-err.log >&2
    fi
  else
    echo "    AMARAN: rclone remote r2: tiada — backup kekal tempatan sahaja"
  fi
done

# Retention: 30 hari harian + 12 bulan bulanan (PRD Seksyen 5.5).
find "${DAILY_DIR}" -name "*.sql.gz.gpg" -mtime +30 -delete
find "${MONTHLY_DIR}" -name "*.sql.gz.gpg" -mtime +365 -delete

echo "==> Backup selesai."
