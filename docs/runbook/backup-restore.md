# Backup & Restore — xBLPP

Rujuk PRD v3.1 Seksyen 5.5 (backup & DR) + Seksyen 7.1 (backup encryption WAJIB
sebab `core.user_service_records` simpan IC).

## Ringkasan

| Item | Spesifikasi |
|---|---|
| Skrip | `scripts/backup.sh` (repo) → deploy ke `/opt/xblpp/backup/backup.sh` (VPS) |
| Jadual | Cron `0 2 * * *` (2 pagi UTC — VPS jalan UTC) |
| DB dibackup | `xblpp_prod`, `xblpp_staging` (per-DB dump, bukan whole-cluster) |
| Enkripsi | GPG symmetric AES256 (bukan `age` — `gpg` dah terpasang atas VPS dikongsi, elak tambah pakej baharu) |
| Kunci enkripsi | `/opt/xblpp/secrets/backup_encryption_key.txt` (root-only, 600) — **berasingan** dari credential DB (`pg_app.env`) dan R2 |
| Retention | 30 hari harian (`local/daily/`) + 12 bulan bulanan (`local/monthly/`, salinan hari pertama tiap bulan) |
| Storan tempatan | `/opt/xblpp/backup/local/{daily,monthly}/` — fallback bila R2 gagal/belum sedia |
| Storan luaran | Cloudflare R2 (`r2:xblpp-backups/daily/`) — **⚠ bucket belum provision**, rujuk Seksyen "Isu diketahui" bawah |
| Log | `/var/log/xblpp/backup.log` |

## Prosedur restore (diuji, rujuk log di bawah)

Restore ke DB **throwaway**, JANGAN restore terus ke `xblpp_prod`/`xblpp_staging`
sedia ada (elak timpa data semasa) — buat DB baharu, sahkan integriti, baru
putuskan langkah seterusnya (cth. rename/swap jika restore ni gantikan DB rosak).

```bash
# 1. Decrypt + gunzip
TMP_SQL=$(mktemp /tmp/xblpp-restore-XXXX.sql)
gpg --batch --yes --decrypt \
  --passphrase-file /opt/xblpp/secrets/backup_encryption_key.txt \
  /opt/xblpp/backup/local/daily/<fail>.sql.gz.gpg | gunzip > "${TMP_SQL}"

# 2. Cipta DB sasaran (throwaway untuk ujian; nama sebenar untuk restore sebenar)
docker exec gerakops_pg psql -U postgres -c "CREATE DATABASE xblpp_restore_test OWNER xblpp_app;"

# 3. Restore
docker exec -i gerakops_pg psql -U xblpp_app -d xblpp_restore_test -v ON_ERROR_STOP=1 < "${TMP_SQL}"

# 4. Sahkan integriti — banding row count dengan DB sumber
docker exec gerakops_pg psql -U xblpp_app -d xblpp_restore_test -c "SELECT count(*) FROM core.users;"

# 5. Buang DB ujian + fail decrypted (JANGAN biar .sql plaintext bertahan)
docker exec gerakops_pg psql -U postgres -c "DROP DATABASE xblpp_restore_test;"
rm -f "${TMP_SQL}"
```

## Log ujian restore

| Tarikh | Dijalankan oleh | Sumber dump | Sasaran | Keputusan | Nota |
|---|---|---|---|---|---|
| 2026-07-20 | Claude Code (Fasa 0 Langkah 9) | `xblpp_staging_2026-07-20.sql.gz.gpg` (backup manual pertama) | `xblpp_restore_test` (throwaway, dibuang selepas) | ✅ LULUS | Row count restored == sumber tepat semua table diperiksa: venues 7/7, facilities 8/8, courses 5/5, users 20/20, negeri 16/16, daerah 128/128. GPG decrypt + gunzip + psql restore semua jalan tanpa ralat. |

**Ujian restore seterusnya WAJIB bulanan** (metrik gate G3, PRD Seksyen 3/12) — tambah baris baharu jadual di atas setiap kali.

## Isu diketahui / tindakan tertunggak

1. **Bucket R2 khusus xBLPP belum provision** (PRD Seksyen 15 #6, status Tertunggak). Backup automation cuba push ke `r2:xblpp-backups/daily/` tapi gagal (`403 Forbidden`) sebab bucket/kredential tak wujud lagi — skrip log amaran dan **teruskan** (bukan crash), backup tempatan tetap berjaya. Sebelum go-live: cipta bucket R2 khusus xBLPP (bukan kongsi bucket GerakOps — data KEMAS tak patut bercampur dengan data client kempen politik lain), kemaskini `R2_REMOTE` dalam `backup.sh` jika nama berbeza.
2. **Backup fail** (`rsync /var/xblpp/files → R2`) belum ditambah dalam `backup.sh` — direktori `/var/xblpp/files` masih kosong (ciri upload fail belum dibina, Fasa 1a+). Tambah langkah rsync bila ciri upload fail wujud.
3. Retention `mtime +365` untuk `monthly/` ialah heuristik mudah (bukan tepat "12 bulan kalendar") — cukup untuk tujuan, semak semula jika perlu ketepatan lebih.
