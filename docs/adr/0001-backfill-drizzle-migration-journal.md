# ADR 0001 — Backfill `drizzle.__drizzle_migrations` untuk xblpp_staging + xblpp_prod

**Status:** Diterima, dilaksanakan 2026-07-21 (Fasa 0 Langkah 10).

## Konteks

Semasa bootstrap deploy pipeline (Langkah 10), `docker compose run --rm
migrate` (`drizzle-kit migrate`) gagal (exit code 1, tiada mesej ralat jelas —
spinner CLI telan output) pada percubaan pertama atas kedua-dua `xblpp_staging`
dan `xblpp_prod`.

Punca: jadual bookkeeping `drizzle.__drizzle_migrations` **kosong** (staging)
atau **tak wujud langsung** (prod), walaupun schema/data sebenar dari Langkah
3–9 (10 jadual `core.*`, `aset`/`latihan` schema, 7 role, 16 negeri, 128
daerah, dan untuk staging 20 user + 7 venue seed) memang sudah ada dan betul.
`drizzle-kit migrate` baca jadual ni untuk tahu migration mana dah applied;
jadual kosong bermakna ia cuba REPLAY migration `0000` dari awal —
`CREATE TABLE core.users` (antara lain) gagal sebab jadual dah wujud.

**Root cause pasti — TAK DAPAT disahkan 100%.** Siasatan (Langkah 10, rujuk
di bawah) MENGESAHKAN `drizzle-kit push` **tidak pernah** digunakan (sifar
padanan merentas seluruh git history + `package.json` cuma ada `db:generate`/
`db:migrate`, tiada `db:push`). Jadi bukan `push` yang jadi punca. Tapi commit
message Langkah 3/4/v3.1.1 ("Migration digenerate drizzle-kit... Applied ke
xblpp_staging + xblpp_prod") tidak merekod ARAHAN SHELL sebenar yang
dijalankan untuk langkah "apply" tu — git/checkpoint tidak simpan sejarah
terminal sesi lampau. Hipotesis paling munasabah (SQL fail yang digenerate
memang betul dan wujud dalam `/drizzle`, tapi bookkeeping `__drizzle_migrations`
tak pernah kena isi): fail SQL yang digenerate itu di-apply terus (cth. `psql`
interaktif melalui SSH tunnel) tanpa melalui `npx drizzle-kit migrate`
sebenar — situasi yang boleh berlaku bila sambungan tunnel tak stabil untuk
drizzle-kit CLI sendiri, atau sekadar pilihan mudah semasa sesi terdahulu.
**Jangan anggap ini pasti** — ia satu-satunya penjelasan yang konsisten dengan
bukti sedia ada, bukan fakta disahkan.

## Keputusan

1. **Backfill, bukan replay.** Jalankan `drizzle-kit migrate` atas Postgres 16
   **kosong/throwaway** (bukan staging/prod) untuk dapatkan 4 hash SHA-256
   sebenar (satu per fail migration `0000`–`0003`) yang drizzle-kit sendiri
   jana secara deterministik daripada kandungan fail SQL.
2. **Sahkan dulu, jangan andaikan.** Sebelum insert, query terus
   `information_schema` staging DAN prod untuk pastikan penanda schema
   sebenar setiap migration (`ic_hash`, `failed_login_attempts`, skema
   `aset`/`latihan`, dan set penuh 10 jadual `core.*`) memang wujud dalam DB
   sasaran. Kedua-dua DB disahkan padan 100% sebelum sebarang `INSERT`
   dijalankan.
3. **INSERT terus 4 baris** ke `drizzle.__drizzle_migrations` (hash + timestamp
   `created_at` daripada `drizzle/meta/_journal.json`, `on conflict do
   nothing`) — staging dan prod, hash sama (fail migration sama untuk
   kedua-dua environment). SQL penuh dalam `docs/runbook/deploy.md` seksyen
   "Bootstrap VPS — status: SIAP".
4. **TIDAK** menjalankan DDL sebenar (`CREATE TABLE`, dsb.) atas staging/prod
   — jadual/data sedia ada dibiarkan seperti asal, cuma bookkeeping yang
   dikemaskini supaya padan realiti.

## Akibat / garis panduan akan datang

- **Semua laluan apply schema dalam pipeline SEKARANG konsisten guna
  `drizzle-kit migrate` sahaja** — disahkan (bukan andaian) semasa Langkah
  10: `.github/workflows/deploy.yml` → `docker compose run --rm migrate` →
  Dockerfile stage `migrate` CMD `npx drizzle-kit migrate`; bootstrap manual
  VPS (Langkah 10) guna laluan SAMA. `package.json` cuma ada `db:generate` +
  `db:migrate`, tiada `db:push`.
- **Peraturan mengikat untuk semua sesi akan datang (termasuk Claude Code
  sesi lain):** schema baharu SENTIASA `drizzle-kit generate` → semak SQL →
  `drizzle-kit migrate` (throwaway → staging → prod). **JANGAN SEKALI-KALI**
  `psql -f`/tampal SQL terus, atau `drizzle-kit push`, terhadap
  `xblpp_staging`/`xblpp_prod` — walaupun "cuma nak cepat" — sebab tepat
  situasi macam ni yang berulang (bookkeeping `__drizzle_migrations` tercicir
  daripada realiti DB) kalau langkah tu diambil.
- **Jangan "betulkan" 4 baris dalam `drizzle.__drizzle_migrations` yang tiada
  Git commit sepadan** — ia backfill sengaja (ADR ni + `docs/runbook/deploy.md`),
  BUKAN data rosak. Jangan `DELETE`/`TRUNCATE` jadual ni untuk "reset bersih"
  — itu akan sebabkan `drizzle-kit migrate` cuba REPLAY migration lama dan
  gagal semula macam Langkah 10.
- Kalau isu sama berulang (jadual bookkeeping kosong/hilang sync dari realiti
  DB) selepas ADR ni, itu tanda peraturan di atas dilanggar di suatu tempat —
  siasat command sejarah shell/CI dulu sebelum backfill lagi.

## Rujukan

- `docs/runbook/deploy.md` — seksyen "Bootstrap VPS — status: SIAP" (SQL
  backfill penuh + bukti pengesahan schema).
- `docs/prd/xBLPP-Struktur-Repo-Schema.md` Seksyen 3 — peraturan asal "Semua
  perubahan schema melalui `drizzle-kit generate` → SQL file → commit →
  `drizzle-kit migrate`".
- Commit `cddb8b7` (Langkah 10 bootstrap) — pelaksanaan backfill sebenar.
