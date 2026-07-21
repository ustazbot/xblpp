# Deploy — xBLPP

Rujuk PRD v3.1 Seksyen 6 (CI/CD) + `docs/prd/xBLPP-Struktur-Repo-Schema.md`
Seksyen 5 (konsep pipeline) + Seksyen 6 langkah 10.

## Ringkasan pipeline

| Item | Spesifikasi |
|---|---|
| Trigger prod | Push tag `v*` (cth. `v0.1.0`) |
| Trigger staging | Push ke branch `staging` |
| Workflow | `.github/workflows/deploy.yml` |
| Guard | Deploy staging **dilarang 8am–6pm hari bekerja** (Asia/Kuala_Lumpur) — job gagal awal jika langgar |
| Langkah | SSH ke VPS → `git fetch`/`checkout` → `docker compose build app` → `docker compose run --rm migrate` → `docker compose up -d --force-recreate app` |
| Smoke test | `GET /api/health` (`src/app/api/health/route.ts`, cuba `select 1` ke DB) — retry 10x/5s selepas restart, job gagal kalau tak 200 |
| Network Docker | `gerakops_net` (disahkan via `docker network ls` di VPS — **bukan** `gerakops_pg`, itu nama container Postgres sahaja) |

## GitHub Secrets diperlukan (tambah sendiri — Settings → Secrets and variables → Actions)

| Secret | Nilai |
|---|---|
| `SSH_PRIVATE_KEY` | Kandungan private key untuk akses VPS. **Jangan guna `~/.ssh/gerakops_vps` sedia ada** (dikongsi projek lain) — jana key BAHARU khusus deploy xBLPP, tambah public key ke `authorized_keys` VPS, scope kebenaran kalau boleh (cth. `command=` restriction) supaya tak sama akses penuh dengan key admin. |
| `SSH_HOST` | `212.47.72.248` |
| `SSH_USER` | User SSH yang ada akses `/opt/xblpp/clients/*` dan Docker (root, atau user dalam group `docker` dengan sudo terhad ke path ni sahaja) |

⚠ Saya (Claude Code) TIDAK memasukkan private key ke GitHub — itu credential, kena buat sendiri dari repo Settings.

## Bootstrap VPS — WAJIB sebelum run pertama workflow ni

Status disahkan via SSH semasa Langkah 10:

- `/opt/xblpp/clients/{prod,staging}` kosong, bukan git repo lagi (bootstrap
  ni jalankan clone pertama).
- **Caddy vhost SEBENARNYA dah wujud** — `xblpp-prod.caddy` /
  `xblpp-staging.caddy` dalam `/opt/gerakops/caddy/sites/` (mount ke
  `/etc/caddy/sites/` dalam container `gerakops_caddy`; direktori host
  `/etc/caddy/sites/` yang saya semak mula-mula silap path — checkpoint
  Langkah 9 memang betul pasal ni, saya yang tersilap semak). Isi:
  ```
  blpp.gerakops.com {
      reverse_proxy nextjs_xblpp_prod:3000
  }
  staging-blpp.gerakops.com {
      reverse_proxy nextjs_xblpp_staging:3000
  }
  ```
  Ini **reverse_proxy ke nama container** (bukan `localhost:<port>`), ikut
  pattern client sedia ada (n10/n14/.../gerakops) — semua atas network
  `gerakops_net` yang sama. **Tiada tindakan Caddy diperlukan** — hanya
  pastikan container app dinamakan TEPAT `nextjs_xblpp_prod` /
  `nextjs_xblpp_staging` (`docker-compose.yml` baca dari `.env`
  `CONTAINER_NAME`, WAJIB padan).
- DNS `blpp.gerakops.com` / `staging-blpp.gerakops.com` sudah resolve ke
  `212.47.72.248` — TLS auto-provision Caddy patut jalan sebaik container app
  hidup dan Caddy dapat proxy jawapan 200 daripadanya.

⚠ **Jangan publish port app ke host** (`ports:` dalam compose) — VPS ni pakai
ufw (22/80/443 sahaja) TAPI Docker letak rule sendiri dalam chain
`DOCKER-USER`/`FORWARD` yang **pintas ufw** untuk port yang di-`-p`/`ports:`
publish (disahkan `iptables -L DOCKER-USER` semasa Langkah 10 — chain kosong,
tiada mitigation `ufw-docker` dipasang). `docker-compose.yml` repo ni dah
disunting supaya TIADA `ports:` — app capai Caddy semata-mata melalui nama
container atas `gerakops_net`.

Checklist:

1. **`.env` setiap environment** (`/opt/xblpp/clients/{prod,staging}/.env`, root-only,
   TIDAK masuk git — ikut `.env.example` di repo):
   - `DATABASE_URL` — guna nilai `DATABASE_URL_PROD` / `DATABASE_URL_STAGING` dari
     `/opt/xblpp/secrets/pg_app.env` (dah wujud).
   - `AUTH_SECRET` — jana baharu per environment: `openssl rand -base64 32`
     (JANGAN kongsi antara prod/staging).
   - `NEXT_PUBLIC_BASE_URL` — `https://blpp.gerakops.com` (prod) /
     `https://staging-blpp.gerakops.com` (staging).
   - `CONTAINER_NAME` — `nextjs_xblpp_prod` / `nextjs_xblpp_staging` — WAJIB
     TEPAT sama macam yang fail `.caddy` rujuk (lihat atas).
   - `SMTP_*` / `TELEGRAM_BOT_TOKEN` — kosongkan dulu (stub aktif, ikut
     `src/lib/notify.ts`), isi bila SMTP/Telegram sedia.
2. **Git clone pertama** — workflow auto-clone (`git clone` kalau `.git` tiada)
   guna HTTPS awam sebab repo masih **public**. Selepas repo jadi **private**
   (rujuk nota "Tukar repo private" dalam checkpoint Fasa 0), tukar clone URL
   dalam workflow kepada SSH + tambah GitHub deploy key yang VPS boleh baca,
   sebab clone HTTPS awam akan gagal.

## Rollback

```bash
ssh <SSH_USER>@<SSH_HOST>
cd /opt/xblpp/clients/prod   # atau staging
git checkout -f <tag-sebelumnya>
docker compose build app
docker compose up -d --force-recreate app
```

Migration yang merosakkan data → JANGAN cuba "un-migrate" — restore dari backup
malam (RPO 24 jam, rujuk `docs/runbook/backup-restore.md`). Sebab itu migration
destruktif (DROP/ALTER kolum berisi data) WAJIB backup manual dulu sebelum deploy
yang bawa migration jenis tu.

## Ujian pipeline (Langkah 10, tempatan)

Docker/compose tak boleh diuji betul-betul tanpa build sebenar — dua bug ditemui
dan dibetulkan semasa uji end-to-end (`docker build` + `docker compose run migrate`
+ `docker compose up` + curl `/api/health`, lawan Postgres 16 throwaway):

1. **argon2 gagal `npm ci`** dalam `node:20-alpine` — `node-gyp-build` tak detect
   prebuild musl sedia ada, jatuh balik ke build-from-source, tiada Python/gcc
   dalam image asal. Fix: tambah `apk add python3 make g++` pada stage `deps`.
2. **`/api/health` redirect 307 ke `/login`** — matcher middleware
   (`src/middleware.ts`) kecualikan `api/auth` tapi bukan `api/health`, jadi
   healthcheck (unauthenticated by design) kena tangkap sekali oleh auth guard.
   Fix: tambah `api/health` ke negative-lookahead matcher.
3. **Container "unhealthy" walaupun app jalan** — Docker auto-set `HOSTNAME=<container id>`
   dan Next.js standalone `server.js` guna `process.env.HOSTNAME` sebagai bind
   address kalau wujud, jadi app dengar pada IP container sahaja (bukan
   `0.0.0.0`) — akses luar melalui port-mapping nampak jalan (Docker proxy target
   IP container terus), tapi `localhost`/`127.0.0.1` DALAM container sendiri
   (HEALTHCHECK, `docker exec`) dapat `ECONNREFUSED` kekal. Fix: `ENV
   HOSTNAME="0.0.0.0"` eksplisit dalam stage `runner`.

Selepas tiga fix di atas: `docker compose build app` → `docker compose run --rm
--build migrate` → `docker compose up -d --force-recreate app` → `curl
/api/health` → `200 {"status":"ok"}`, dan `docker inspect` health status jadi
`healthy`. Diuji tempatan sahaja (bukan atas VPS sebenar — bootstrap VPS belum
dibuat, rujuk seksyen atas).

## Isu diketahui / tindakan tertunggak

1. SSH key deploy khusus (`SSH_PRIVATE_KEY` secret) belum dijana — jangan guna
   key admin sedia ada untuk CI. Sehingga secret ni ditambah, workflow
   `.github/workflows/deploy.yml` tak boleh jalan automatik (bootstrap manual
   di atas tak bergantung padanya).
2. Selepas repo jadi private: clone HTTPS awam dalam workflow akan gagal, perlu
   tukar ke SSH + deploy key (nota di atas).
