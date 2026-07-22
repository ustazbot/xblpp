# Deploy — xBLPP

Rujuk PRD v3.1 Seksyen 6 (CI/CD) + `docs/prd/xBLPP-Struktur-Repo-Schema.md`
Seksyen 5 (konsep pipeline) + Seksyen 6 langkah 10.

**Status:** Kedua-dua environment LIVE, dan **CI automatik disahkan berfungsi
sebenar** — run manual (`workflow_dispatch`) 2026-07-21 03:04 berjaya penuh
(SSH agent → deploy → smoke test semua ✓, run ID
[29797508282](https://github.com/ustazbot/xblpp/actions/runs/29797508282)),
disahkan semula luar CI (`curl` + `docker inspect` selepas run, container
`nextjs_xblpp_staging` recreate 03:05:54Z, healthy). `https://blpp.gerakops.com`
dan `https://staging-blpp.gerakops.com` berjalan sebenar, `/api/health` 200.
Rujuk seksyen "Bootstrap VPS" bawah untuk apa yang dah dibuat + bug yang
ditemui semasa proses tu.

**Nota ujian pertama:** run push pertama (10:55am Selasa) betul-betul kena
guard 8am-6pm dan gagal awal (tingkah laku BETUL, bukan bug) — laluan
SSH/secrets tak sempat diuji. Run `workflow_dispatch` manual pertama pula
gagal di step "Setup SSH agent" (`error in libcrypto` — `SSH_PRIVATE_KEY`
rosak semasa copy-paste ke GitHub, punca biasa untuk private key
multi-baris). Fix: `ssh ... cat ci_deploy_key | gh secret set SSH_PRIVATE_KEY`
(paip terus dari VPS ke GitHub, elak clipboard) — selepas set semula, run
kedua lulus penuh.

## Ringkasan pipeline

| Item | Spesifikasi |
|---|---|
| Trigger prod | Push tag `v*` (cth. `v0.1.0`), atau manual (`workflow_dispatch`, pilih `prod`) |
| Trigger staging | Push ke branch `staging`, atau manual (`workflow_dispatch`, pilih `staging`) |
| Workflow | `.github/workflows/deploy.yml` |
| Guard | Deploy staging **dilarang 8am–6pm hari bekerja** (Asia/Kuala_Lumpur) — job gagal awal jika langgar. TERPAKAI hanya untuk auto-trigger push; run manual (`workflow_dispatch`, klik "Run workflow" di GitHub) langkau guard ni — kelulusan manusia eksplisit dianggap cukup |
| Langkah | SSH (`command=` forced, `scripts/ci-deploy.sh`) → `git fetch`/`checkout` → `docker compose build app` → `docker compose run --rm migrate` → `docker compose up -d --force-recreate app` |
| Smoke test | `GET /api/health` (`src/app/api/health/route.ts`, cuba `select 1` ke DB) — retry 10x/5s selepas restart, job gagal kalau tak 200 |
| Network Docker | `gerakops_net` (disahkan via `docker network ls` di VPS — **bukan** `gerakops_pg`, itu nama container Postgres sahaja) |

## GitHub Secrets — SIAP, disahkan berfungsi

**Status:** Key CI khusus (`xblpp-ci-deploy`, ed25519, **berasingan** dari
`~/.ssh/gerakops_vps` admin) dah dijana atas VPS
(`/opt/xblpp/secrets/ci_deploy_key{,.pub}`) dan discope dengan `command=`
forced command (`/opt/xblpp/bin/ci-deploy.sh` — rujuk `scripts/ci-deploy.sh`
dalam repo) dalam `authorized_keys` root. **Diuji sebenar (bukan andaian):**
key ni HANYA boleh jalankan deploy staging/prod (`"staging <ref>"` /
`"prod <ref>"`) — cubaan arbitrary command (`whoami`, dll.) ditolak wrapper
dengan "Target tak sah", exit 1. Backup `authorized_keys` asal disimpan
`/root/.ssh/authorized_keys.bak-<timestamp>` sebelum diubah.

⚠ Saya (Claude Code) TIDAK memasukkan private key ke GitHub — itu credential,
saya pun tak pernah print/simpan kandungannya sendiri. Anda kena tarik terus
dari VPS dan tampal ke GitHub sendiri:

```bash
# Jalankan di terminal ANDA (guna key admin sedia ada), bukan minta saya run —
# private key ni tak patut lalui chat/log saya langsung.
ssh -i ~/.ssh/gerakops_vps root@212.47.72.248 cat /opt/xblpp/secrets/ci_deploy_key
```

Salin output PENUH (termasuk baris `-----BEGIN OPENSSH PRIVATE KEY-----` /
`-----END...-----`) terus ke GitHub — Settings → Secrets and variables →
Actions → New repository secret:

| Secret | Nilai |
|---|---|
| `SSH_PRIVATE_KEY` | Output command atas (private key `xblpp-ci-deploy`, BUKAN `gerakops_vps` admin key) |
| `SSH_HOST` | `212.47.72.248` |
| `SSH_USER` | `root` (key discope via forced command, bukan via user separation — rujuk atas) |

Selepas 3 secret ni ditambah, `.github/workflows/deploy.yml` boleh deploy
automatik bila push ke branch `staging` atau tag `v*`. Rotate key: jana
baharu (`ssh-keygen`) di VPS, tukar baris `command=...` dalam
`authorized_keys` ke pubkey baharu, padam pubkey lama, kemaskini
`SSH_PRIVATE_KEY` secret GitHub.

## Bootstrap VPS — rujukan (untuk redeploy dari kosong / VPS baharu)

Status disahkan via SSH semasa Langkah 10 (dah settle, rujuk "status: SIAP"
bawah untuk apa yang sebenarnya jadi):

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
`healthy`.

## Bootstrap VPS — status: SIAP (kedua-dua environment LIVE)

Dijalankan penuh atas VPS sebenar (bukan simulasi) — `.env` x2, git checkout
x2, build+migrate+up x2, disahkan via `curl https://{blpp,staging-blpp}.gerakops.com/api/health`
luar VPS → `200 {"status":"ok"}` sebenar, TLS Caddy auto-provisioned (DNS dah
resolve ke `212.47.72.248` sebelum ni). Container `nextjs_xblpp_prod` /
`nextjs_xblpp_staging` sihat (`docker inspect ... Health.Status` = `healthy`),
~23MB RAM setiap satu (had `mem_limit: 400m`), tiada kesan pada 5 client lain
atau `gerakops_pg` dikongsi.

**⚠ Bug ditemui semasa bootstrap sebenar (BUKAN dalam ujian tempatan) — WAJIB
faham untuk deploy akan datang:**

`xblpp_staging` dan `xblpp_prod` kedua-duanya SUDAH ada schema/data lengkap
(dari Langkah 3–9), tapi jadual bookkeeping `drizzle.__drizzle_migrations`
KOSONG (staging) atau TAK WUJUD LANGSUNG (prod) — bermakna migration Langkah
3–9 tak pernah direkod dijalankan via `drizzle-kit migrate`. Bila
`drizzle-kit migrate` cuba jalan kali pertama, ia cuba REPLAY migration 0000
dari kosong → `CREATE TABLE core.users` gagal sebab jadual dah wujud → exit
code 1 tanpa mesej error jelas (spinner CLI telan output ralat).

**Root cause — siasatan penuh, bukan tekaan:** disahkan `drizzle-kit push`
**tidak pernah** digunakan (sifar padanan merentas seluruh `git log --all -p`
+ `package.json` sejak commit pertama cuma ada `db:generate`/`db:migrate`,
tiada `db:push`). Jadi bukan `push` jadi punca. Tapi arahan shell SEBENAR
yang dijalankan untuk "apply" schema pada staging/prod Langkah 3/4/v3.1.1
tidak direkod di mana-mana (git/checkpoint tak simpan sejarah terminal sesi
lampau) — jadi **root cause pasti tidak dapat disahkan 100%**, cuma hipotesis
paling munasabah (SQL fail yang digenerate betul, tapi bookkeeping tak
diisi — konsisten dengan apply terus/psql, tapi tak dapat dibuktikan). Details
penuh + akibat/garis panduan dalam
[`docs/adr/0001-backfill-drizzle-migration-journal.md`](../adr/0001-backfill-drizzle-migration-journal.md).

**Konsistensi laluan apply — DISAHKAN, bukan andaian:** semua laluan schema
apply dalam pipeline SEKARANG (selepas Langkah 10) guna `drizzle-kit migrate`
sahaja — `.github/workflows/deploy.yml` → `docker compose run --rm migrate` →
Dockerfile stage `migrate` (`npx drizzle-kit migrate`); bootstrap manual VPS
hari ni guna laluan SAMA. `package.json` cuma ada `db:generate` + `db:migrate`
(tiada `db:push`). Tiada laluan lain dalam repo/CI yang boleh apply schema
tanpa lalui `drizzle-kit migrate` — disemak terus kod, bukan tekaan.

**Fix yang dibuat (one-time, dah settle, JANGAN ulang):** jalankan
`docker compose run --rm --build migrate` atas Postgres 16 **kosong/throwaway**
untuk dapatkan hash SHA-256 sebenar 4 migration (`0000`–`0003`) yang
drizzle-kit sendiri jana, sahkan dulu penanda schema sebenar (lajur
`ic_hash`/`failed_login_attempts`, skema `aset`/`latihan`) memang wujud dalam
DB sasaran (bukan andaian), baru `INSERT` 4 baris tu terus ke
`drizzle.__drizzle_migrations` staging & prod (hash sama utk kedua-dua sebab
fail migration sama):

```sql
insert into drizzle.__drizzle_migrations (hash, created_at) values
('5046e57ead53360ac1939de80e93a24558f70667b76a9b0f77b5b374dd5699d5', 1784559815335),
('a2d6172f3a8e310a4c0fe77d83e553140a09054dc830ce3b7fc23676896a0a19', 1784562791899),
('80b694fed23ad10adc7af0d14761bf325efa33255cda677708c1ec5592896e2d', 1784563562316),
('095f7fc4f72182684b224e8cb391711dd0c69bf4ea8ef2486fc3bba88d998f88', 1784567105468)
on conflict do nothing;
```

Selepas backfill ni, `drizzle-kit migrate` idempotent macam biasa — migration
**baharu** (0004 dst., lepas ni) akan apply betul-betul tanpa isu, sebab
journal dah sync dengan realiti DB. Backfill ni cuma perlu SEKALI, dah siap.

⚠ **JANGAN** `DELETE`/`TRUNCATE` 4 baris dalam `drizzle.__drizzle_migrations`
ni untuk "reset bersih" — ia backfill SENGAJA (rujuk ADR di atas), bukan data
rosak. Padam ia akan sebabkan `drizzle-kit migrate` cuba REPLAY migration
lama dan gagal semula macam yang berlaku hari ni. **JANGAN SEKALI-KALI**
`psql -f`/tampal SQL terus atau `drizzle-kit push` terhadap
`xblpp_staging`/`xblpp_prod` untuk schema baharu — SENTIASA `drizzle-kit
generate` → semak SQL → `drizzle-kit migrate` (throwaway → staging → prod),
sama seperti Langkah 3–9. Itu satu-satunya cara journal kekal sync dengan
realiti DB.

## Isu diketahui / tindakan tertunggak

1. SSH key deploy khusus (`SSH_PRIVATE_KEY` secret) belum dijana — jangan guna
   key admin sedia ada untuk CI. Sehingga secret ni ditambah, workflow
   `.github/workflows/deploy.yml` tak boleh jalan automatik (bootstrap manual
   di atas tak bergantung padanya).
2. Selepas repo jadi private: clone HTTPS awam dalam workflow akan gagal, perlu
   tukar ke SSH + deploy key (nota di atas).
3. `blppkemas.com` guna default nameserver `ns1/ns2.hawkdns.net` (BUKAN
   nameserver Shinjiru) — DNS diurus via portal Shinjiru juga tapi tab
   berlainan (`Domains → Manage DNS`, bukan "Nameservers"/"Private
   Nameservers" dalam sidebar domain), guna login sama. Jangan cari "DNS
   Zone Editor" dalam sidebar domain — tiada, ia di top-nav dropdown.

## Domain baharu blppkemas.com — status: SIAP (staging + prod LIVE)

Subdomain routing (`aset.`/`lms.`/apex/`staging-aset.`/`staging-lms.`)
dikendalikan oleh `middleware.ts` + `src/lib/host.ts` — SATU app, SATU
container per environment (`nextjs_xblpp_prod`/`nextjs_xblpp_staging`), network
`gerakops_net` sama. `blpp.gerakops.com` (fail `xblpp-{prod,staging}.caddy`
sedia ada) **TAK disentuh** — masih hidup, belum di-redirect/padam (rujuk
guardrail bawah).

**DNS (HawkDNS, bukan Shinjiru — rujuk nota "Isu diketahui" di bawah untuk
kenapa):**

| Host | Rekod | Nota |
|---|---|---|
| `blppkemas.com` (apex) | A → `212.47.72.248` | Ditukar drpd placeholder `127.0.0.1` (auto-generate semasa create zone) |
| `aset.blppkemas.com` | A → `212.47.72.248` | Baharu |
| `lms.blppkemas.com` | A → `212.47.72.248` | Baharu |
| `staging-aset.blppkemas.com` | A → `212.47.72.248` | Baharu |
| `staging-lms.blppkemas.com` | A → `212.47.72.248` | Baharu |

**Caddy** — fail berasingan `/opt/gerakops/caddy/sites/xblpp-blppkemas.caddy`
(sengaja tak gabung dgn `xblpp-{prod,staging}.caddy` sedia ada, supaya boleh
padam/rollback berasingan tanpa jejas domain lama), LIVE:

```
aset.blppkemas.com, lms.blppkemas.com, blppkemas.com {
    reverse_proxy nextjs_xblpp_prod:3000
}
staging-aset.blppkemas.com, staging-lms.blppkemas.com {
    reverse_proxy nextjs_xblpp_staging:3000
}
```

**`.env`** (`/opt/xblpp/clients/{prod,staging}/.env`) — kedua-dua ada
`ROOT_DOMAIN=blppkemas.com` + `COOKIE_DOMAIN=.blppkemas.com`.

**Deploy:** kod di-deploy via `gh workflow run deploy.yml --ref {main,staging}
-f target={prod,staging}` (`workflow_dispatch` — bypass guard 8am-6pm sebab
run manual disahkan, bukan push tak sengaja). Kedua-dua smoke test lulus.

**Ujian disahkan (staging, akaun seed sedia ada):**
- Cookie session `Domain=.blppkemas.com` betul — SSO merentas `aset.`↔`lms.`
  tanpa login semula (`/api/auth/session` sah kat kedua-dua host guna cookie
  sama).
- Role tanpa akses (`penceramah`) di host salah (`aset.`) → redirect SILANG
  HOST ke `lms.../portal` (bukan laluan dalaman 404).
- Role admin-landing di host betul → terus subsistem, bukan dua-pintu lama.

**Sahkan prod (tanpa ganggu):** baseline 12 site lain (`gerakops.com`, n10-n28,
`demo01`, `status`, `blpp.gerakops.com`, `staging-*`) disemak SEBELUM & SELEPAS
setiap reload Caddy — status sama, tiada regresi. Login-role test **tak**
dijalankan atas prod (elak guna kredential ujian atas DB prod sebenar) —
logik sama persis dgn staging yang dah teruji.

**Baki (guardrail, belum dibuat):**
- `blpp.gerakops.com` **belum** di-redirect/padam — tunggu tempoh pemerhatian
  subdomain baharu stabil dulu.
- Tempoh pemerhatian belum ditetapkan — bincang bila nak proceed.
