# Sistem Pengurusan BLPP KEMAS (xBLPP)

**PRD / AI Development Blueprint — Versi 3.1**

---

## 1. Maklumat dokumen

| Item | Butiran |
|---|---|
| Nama sistem | **Sistem Pengurusan BLPP KEMAS (xBLPP)** — MUKTAMAD |
| Versi dokumen | 3.1 (pivot arkitektur daripada v2.0; v3.1 memuktamadkan nama, VPS, domain, auth, skala) |
| Jenis dokumen | PRD / AI Development Blueprint |
| Tujuan | Rujukan lengkap untuk pembangunan menggunakan Claude Code / Codex |
| Status | Sedia untuk development (Fasa 0) |
| Status sistem | **Pilot / PoC Bahagian Latihan & Pembangunan Profesional (BLPP) KEMAS** — bukan sistem rasmi jabatan |
| Syarat kritikal | Sistem WAJIB beroperasi lancar **5–6 bulan** di infra pilot sebelum kertas kerja migrasi ke server HQ KEMAS |

### Perubahan utama v3.0 (vs v2.0)

| # | Perubahan | Sebab |
|---|---|---|
| 1 | **EliteDesk 800 G4 diberhentikan sepenuhnya.** Semua hosting pindah ke cloud: GitHub (repo) + VPS Contabo (app + DB) | Buang single point of failure hardware pejabat; Contabo sudah terbukti (projek GerakOps) |
| 2 | **Vercel DIGUGURKAN** daripada pertimbangan | ToS Hobby plan melarang penggunaan komersial/berbayar; Pro $20/bulan tidak berbaloi; split Vercel↔VPS mendedahkan Postgres kepada internet (dynamic IP issue) |
| 3 | **Semua dalam satu VPS**: Next.js + Caddy + PostgreSQL pada mesin sama, Postgres connect via localhost sahaja | Paling simple, paling selamat, paling portable ke server HQ |
| 4 | **Struktur dua sistem** dalam satu monorepo: (1) Pengurusan Aset & Premis, (2) Pengurusan Latihan (fizikal + online) | Dua domain operasi berbeza; shared core elak duplikasi |
| 5 | **Satu shared login (SSO)** untuk kedua-dua sistem | Staf sama guna kedua-duanya; elak data drift & adoption headache |
| 6 | **LMS online**: YouTube (async/VOD) + YouTube Live / Zoom / Google Meet (live, ikut keputusan pengurusan program). **TIADA app streaming custom** | Jimat masa & kos; platform battle-tested; align prinsip lean |
| 7 | **Strategi "bina tanpa content"**: schema + admin CMS siap dahulu, staf BLPP isi kandungan. Seed data pilot minimum sebelum demo | Kecepatan; elak first impression "sistem kosong" |
| 8 | Syarat sijil modul online: **kuiz/penilaian sebagai gate**, bukan watch-time video | Watch-time YouTube boleh dibypass (client-side); kuiz lebih jujur & robust |

---

## 2. Executive summary

xBLPP ialah **dua sistem bersepadu** untuk BLPP KEMAS:

1. **Sistem Pengurusan Aset & Premis** — direktori dan tempahan premis latihan (Akademi, ILK, PLK, PKM), fasiliti, kalendar, conflict detection, maintenance.
2. **Sistem Pengurusan Latihan** — kursus/program fizikal dan online (LMS), pendaftaran, kelulusan, kehadiran QR, penceramah, sijil, repository.

Kedua-dua sistem berkongsi **core** yang sama: users, roles/RBAC, auth (satu login), notification centre, audit log — dalam satu monorepo, deploy pada satu VPS Contabo.

**Pengguna & audiens:**
- **Admin/pengurus:** kakitangan BLPP mengikut peringkat (HQ / Negeri / Daerah / PIC premis).
- **Audiens akhir:** kakitangan KEMAS (peserta latihan) + tenaga penceramah.

**Gate migrasi ke server HQ:** sistem mesti membuktikan operasi lancar 5–6 bulan (kriteria terukur di Seksyen 12) sebelum kertas kerja naik taraf ke infrastruktur rasmi disediakan. Seni bina sengaja dipilih supaya migrasi = `pg_dump/restore` + rsync codebase + tukar DNS, **bukan re-architecture**.

**Prinsip reka bentuk (kekal dari v2.0):**
1. Mobile-first untuk pengguna lapangan (peserta, penceramah, PIC, admin daerah).
2. Desktop-optimized untuk admin HQ (data pukal, laporan, konfigurasi).
3. Lean & pragmatik — tiada servis/infra yang tidak perlu.

---

## 3. Vision, objective & success metrics

Vision dan business objectives **kekal seperti v2.0** (rujuk dokumen v2.0 Seksyen 3).

### Success metrics — DIKEKALKAN (M1–M6 v2.0) + gate baharu

Metrik M1–M6 v2.0 kekal. **Tambahan v3.0 — kriteria "smooth 5–6 bulan" (gate migrasi HQ):**

| # | Metrik gate | Sasaran | Cara ukur |
|---|---|---|---|
| G1 | Uptime waktu operasi (8 pagi–10 malam) | ≥ 97% purata bulanan, 5 bulan berturut-turut | Uptime Kuma (monitoring luaran) |
| G2 | Insiden kritikal (data loss / outage > 4 jam) | 0 | Log insiden |
| G3 | Ujian restore backup | Lulus setiap bulan (6/6) | Runbook log |
| G4 | Pengguna aktif bulanan | Trend menaik / stabil selepas rollout | Analytics dalam sistem |
| G5 | Metrik M1–M6 v2.0 | Mencapai sasaran | Sistem sendiri |

> Kelima-lima gate ini menjadi **lampiran bukti** dalam kertas kerja migrasi ke server HQ.

### Anggaran skala (v3.1 — SEBAHAGIAN DISAHKAN)

| Parameter | Angka | Status |
|---|---|---|
| Jumlah warga KEMAS (potensi pengguna) | **± 15,000** | ✅ Disahkan |
| Concurrent waktu puncak | **100–300** | ✅ Disahkan sebagai working number |
| Jumlah premis (Akademi/ILK/PLK/PKM) | ± [XXX] | ⚠ Belum |
| Kursus/program setahun | ± [XXX] | ⚠ Belum |
| Penceramah berdaftar | ± [XXX] | ⚠ Belum |

**Implikasi capacity (8GB RAM / 3 vCPU):** 15,000 pengguna berdaftar bukan isu (saiz DB kecil); cabaran sebenar ialah **300 concurrent semasa pendaftaran kursus popular dibuka**. Mitigasi wajib dalam design: connection pool Postgres terkawal (max ~50), SSR caching untuk senarai kursus, rate limiting Caddy, dan **queue page** ("Anda dalam giliran...") — kekal dari NFR v2.0. Pendaftaran kursus popular disyorkan dibuka berperingkat mengikut negeri.

---

## 4. Struktur dua sistem + shared core (BAHARU — v3.0)

```
┌─────────────────────────────────────────────────────┐
│                    SHARED CORE                       │
│  users · roles · RBAC · auth (SSO) · notification    │
│  centre (in-app/email/Telegram) · audit log ·        │
│  import wizard · settings                            │
└──────────────────┬──────────────────┬───────────────┘
                   │                  │
     ┌─────────────▼─────┐  ┌─────────▼──────────────┐
     │  SISTEM 1:        │  │  SISTEM 2:             │
     │  ASET & PREMIS    │  │  LATIHAN               │
     │                   │  │                        │
     │  Venue            │  │  Course / Program      │
     │  Facility         │  │  Registration          │
     │  VenueBooking     │  │  WaitingList           │
     │  Calendar         │  │  Attendance (QR)       │
     │  Conflict detect  │  │  Trainer + Assignment  │
     │  Maintenance      │  │  Certificate (Fasa 2)  │
     │                   │  │  LMS online (YouTube/  │
     │                   │  │  Live) — Fasa 1c/2     │
     │                   │  │  Repository (Fasa 2)   │
     └───────────────────┘  └────────────────────────┘
```

### Keputusan teknikal struktur

| Item | Keputusan | Sebab |
|---|---|---|
| Repo | **Satu monorepo GitHub** | Solo dev; shared packages senang sync |
| App | **Satu Next.js app** dengan route group: `/aset/*` dan `/latihan/*` (bukan dua app berasingan) | Satu proses Node = jimat RAM VPS; satu deploy; SSO automatik sebab session sama. *Nota: v3.0 memuktamadkan ini — dua Vercel project yang dibincangkan sebelum ini terbatal bersama Vercel* |
| DB | **Satu PostgreSQL**, schema `core`, `aset`, `latihan` (Postgres schema namespace) | Pemisahan logik tanpa overhead dua DB; FK antara schema dibenarkan (cth. booking → course) |
| Navigasi | Landing selepas login papar dua pintu: "Aset & Premis" / "Latihan"; role menentukan akses | UX jelas dua sistem, backend satu |

---

## 5. Infrastruktur & deployment (v3.0)

### 5.1 Hosting

| Komponen | Pilihan | Nota |
|---|---|---|
| Repo + CI | GitHub (private) + GitHub Actions | Deploy: SSH → `git pull` → build → restart (atau Coolify, optional) |
| Server | **Contabo Cloud VPS 10 SSD** — 3 vCPU AMD EPYC, **8GB RAM**, 150GB SSD | ✅ Disahkan. ⚠ Tinggal sahkan **lokasi DC**: pilih **Singapore** jika boleh (latency MY ±10–30ms); jika Eropah, +170–250ms RTT — masih dalam NFR <2s tetapi kurang ideal |
| Reverse proxy | **Caddy** (bukan Nginx — VPS sedia ada guna Caddy untuk 5 client site, auto-TLS) | 🔄 v3.1 — ganti Nginx, ikut pattern infra sedia ada, elak clash port 80/443 |
| DNS + CDN + WAF | Cloudflare | Kekal dari v2.0; proxy orange-cloud, WAF rules, rate limiting tambahan |
| Media besar | Cloudflare R2 | Kekal — gambar premis resolusi penuh, dokumen besar. Video → YouTube (bukan R2 lagi) |
| Email | Nodemailer + SMTP (Brevo free tier) | Kekal |
| Notifikasi segera | Telegram Bot API | Kekal |
| Monitoring | Uptime Kuma pada **VPS/lokasi berasingan** (jangan monitor diri sendiri) + alert Telegram | Kekal prinsip v2.0 |

### 5.2 Seni bina deployment

```
[Pengguna: telefon/PC]
        │ HTTPS
        ▼
[Cloudflare (DNS + CDN + WAF)]
        │
        ▼
[VPS Contabo — Ubuntu 24.04, DIKONGSI dengan 5 client site sedia ada]
   ├── Caddy (reverse proxy semua site, auto-TLS) — vhost blpp.gerakops.com + staging-blpp.gerakops.com
   ├── xBLPP app (Next.js 14 standalone build, dalam Docker container — isolation, ikut pattern 5 client lain)
   ├── PostgreSQL 16 dalam Docker (`gerakops_pg`, DIKONGSI 5 client + xBLPP) — DB `xblpp_prod` + `xblpp_staging`, role `xblpp_app` akses terhad 2 DB sahaja
   └── /var/xblpp/files — dokumen < 10MB

[Cloudflare R2] ← gambar/dokumen besar (presigned URL)
[YouTube] ← semua video latihan (unlisted) + YouTube Live
[Zoom / Google Meet] ← sesi live interaktif (ikut pengurusan program)
```

**Prinsip keselamatan utama:** PostgreSQL TIDAK didedahkan kepada internet — connection dalam Docker network sahaja, tiada port 5432 dibuka pada firewall awam. Credential DB disimpan `/opt/xblpp/secrets/pg_app.env` (root-only, 600).

**🔄 v3.1 — dua penyesuaian dari rancangan asal, disahkan selamat selepas semakan kapasiti (Julai 2026):**
- **Caddy** gantikan Nginx (ikut infra sedia ada, elak clash port).
- **Docker** gantikan PM2/systemd standalone (isolation antara xBLPP dan 5 client lain pada VPS dikongsi). Overhead per container rendah (rujuk pattern client sedia ada: Next.js container ± 46-87MB, bukan "Docker berlapis-lapis" yang dilarang Seksyen 5.3).

### 5.3 Bajet RAM VPS (v3.1 — DIKEMAS KINI selepas semakan kapasiti sebenar, Julai 2026)

**Realiti dikoreksi:** VPS Cloud VPS 10 (7.8GB total) **DIKONGSI dengan 5 client site sedia ada** — bukan hampir-dedicated macam andaian draf awal. Semakan langsung (Langkah 1 Fasa 0) beri gambaran sebenar:

| Item | Angka semasa (sebelum xBLPP live) |
|---|---|
| RAM total | 7.8 GB |
| Digunakan (5 client site + `gerakops_pg` Postgres) | ± 1.5 GB (19%) — jauh lebih ringan dari andaian |
| **Available untuk xBLPP** | **± 6.2 GB** |
| Postgres `max_connections` | 100 — 13 digunakan semasa, 87 baki |
| Disk SSD | 145GB total, 8.8GB digunakan, 136GB available |

**Anggaran consumption xBLPP (ikut pattern container client sedia ada — Next.js container ± 46-87MB setiap satu):**

| Proses | Anggaran |
|---|---|
| xBLPP app container (prod) | ± 100-150 MB |
| xBLPP app container (staging) | ± 100-150 MB |
| DB `xblpp_prod` + `xblpp_staging` (dalam `gerakops_pg` sedia ada) | Kongsi shared_buffers Postgres sedia ada — tiada instance baharu |
| Pool aplikasi Drizzle | ~20 connection / environment (jauh bawah baki 87 slot) |

**Kesimpulan:** headroom mencukupi untuk xBLPP + baki pertumbuhan 5 client sedia ada. **Tiada isu kapasiti untuk teruskan Fasa 0.**

Peraturan v2.0 kekal KETAT untuk komponen baharu: **tiada Redis, Elasticsearch, local LLM, Coolify.** Docker DIBENARKAN (bukan "berlapis-lapis" — satu container ringan per environment, ikut pattern 5 client sedia ada, isolation pada VPS dikongsi adalah justifikasi sah). Full-text search = Postgres tsvector. Caching = in-memory Next.js + Postgres.

**⚠ Watch-item (bukan blocker, rekod dalam runbook):** `max_connections` 100 dikongsi SEMUA client + xBLPP. Re-check bilangan connection aktif selepas xBLPP prod jalan dengan traffic sebenar (bukan hanya idle) — terutama semasa waktu puncak pendaftaran kursus (100-300 concurrent).

**Jalan upgrade:** jika headroom terbukti sesak semasa operasi sebenar, upgrade plan Contabo adalah satu klik + reboot.

### 5.4 Environment strategy

| Environment | Lokasi | Nota |
|---|---|---|
| Production | VPS Contabo (port 3000, DB `xblpp_prod`) | Domain production |
| Staging | VPS sama (port 3001, DB `xblpp_staging`) | Subdomain staging + Cloudflare Access; deploy staging DILARANG waktu puncak (8 pagi–6 petang hari bekerja) |
| Development | PC pembangun (Linux Mint, 16GB) | Postgres local/Docker |

### 5.5 Backup & DR (dikemas kini)

| Item | Spesifikasi |
|---|---|
| Backup DB | `pg_dump` nightly (2 pagi) → compress → R2 (rclone) |
| Backup fail | rsync `/var/xblpp/files` → R2 nightly |
| Retention | 30 hari harian + 12 bulan bulanan |
| Ujian restore | **WAJIB bulanan** — direkod dalam runbook (metrik gate G3) |
| RPO | 24 jam |
| RTO | 1 hari bekerja — restore ke VPS baharu (Contabo/lain) |
| UPS | **TIDAK diperlukan lagi** (tiada hardware on-premise) — jimat RM250–400 |
| Snapshot VPS | Guna snapshot Contabo (jika tersedia dalam plan) sebagai lapisan tambahan, BUKAN pengganti pg_dump |
| **Backup encryption (BAHARU — v3.1)** | `pg_dump` output WAJIB di-encrypt (GPG/age) sebelum upload ke R2 — bukan optional lagi memandangkan `core.user_service_records` (IC) kini disimpan dalam DB. Decryption key simpan berasingan dari R2 credential |

### 5.6 Domain (v3.1 — DIPUTUSKAN)

**Keputusan: `blpp.gerakops.com`** untuk fasa pilot.

| URL | Fungsi |
|---|---|
| `blpp.gerakops.com` | Landing + login (satu borang login untuk semua) |
| `blpp.gerakops.com/aset` | Sistem 1: Pengurusan Aset & Premis |
| `blpp.gerakops.com/latihan` | Sistem 2: Pengurusan Latihan |

**Dua kumpulan pengguna, SATU sistem auth:**
- **Kumpulan admin/PIC** (kakitangan BLPP): selepas login → landing dua pintu (Aset / Latihan) mengikut role.
- **Kumpulan audience** (kakitangan KEMAS sebagai peserta + penceramah): selepas login → terus ke portal peserta `/latihan` (view mobile-first).
- Ini **role-based redirect**, bukan dua sistem login berasingan — satu table users, satu session, elak data drift.

**⚠ Nota governance (KEKAL didokumentasi):** domain di bawah entiti peribadi pembangun adalah **sementara untuk pilot sahaja**. Kertas kerja migrasi HQ mesti menyatakan pelan pertukaran ke domain rasmi (*.gov.my atau domain jabatan) — tukar DNS sahaja, tiada perubahan kod (guna environment variable `NEXT_PUBLIC_BASE_URL`, jangan hardcode domain dalam kod/email template).

### 5.7 Migration path ke server HQ (syarat kritikal Bos)

Semua komponen mesti **portable-by-design**:

| Komponen | Kaedah migrasi |
|---|---|
| Codebase | `git clone` ke server HQ; build standalone |
| Database | `pg_dump` → `pg_restore`; versi Postgres sama (16) |
| Fail local | rsync `/var/xblpp/files` |
| R2 | Kekal (atau pindah ke storage HQ jika dimandat — abstraction layer storage dalam kod) |
| DNS | Tukar A/CNAME record; downtime < 1 jam |
| DILARANG | Sebarang feature terikat vendor (Vercel functions, platform-specific API) |

Anggaran downtime migrasi penuh: **< 4 jam** (satu malam hujung minggu).

---

## 6. Stack teknologi (v3.0)

Semua kekal dari v2.0 KECUALI baris bertanda 🔄:

| Lapisan | Pilihan | Status |
|---|---|---|
| Frontend + Backend | Next.js 14 App Router + TypeScript | Kekal |
| UI | Tailwind CSS + shadcn/ui | Kekal |
| Database | PostgreSQL 16 (+ pgvector Fasa 3) | Kekal |
| ORM | Drizzle ORM | Kekal |
| Auth | Auth.js (NextAuth v5), Credentials (email + password), **satu session untuk dua sistem** | 🔄 Diperjelas SSO |
| File storage | Local disk (<10MB) + Cloudflare R2 (besar) | Kekal |
| **Video latihan** | **YouTube (unlisted) — embed IFrame** | 🔄 BAHARU (ganti R2 video) |
| **Live session** | **YouTube Live** (webinar besar) / **Zoom / Google Meet** (bengkel interaktif — ikut keputusan pengurusan program) | 🔄 BAHARU |
| PDF | pdf-lib / @react-pdf/renderer (TIADA Puppeteer) | Kekal |
| QR | qrcode + html5-qrcode | Kekal |
| Email | Nodemailer + SMTP | Kekal |
| Notifikasi | Telegram Bot API | Kekal |
| **Process manager** | **Docker (container per environment)** | 🔄 v3.1 — ganti PM2/systemd, isolation pada VPS dikongsi 5 client |
| **Reverse proxy** | **Caddy** (auto-TLS, ikut infra sedia ada) | 🔄 v3.1 — ganti Nginx |
| **Hosting** | **VPS Contabo sedia ada (DIKONGSI dengan 5 client site — bukan dedicated)** | 🔄 Ganti EliteDesk/Tunnel |
| **CI/CD** | **GitHub Actions → SSH deploy** (docker-compose build/restart, bukan Coolify) | 🔄 BAHARU |

---

## 7. User persona, role & autentikasi (v3.1)

Matrix role 7-role v2.0 **kekal sepenuhnya** (rujuk v2.0 Seksyen 8). Penjelasan v3.1:

- **Admin = kakitangan BLPP mengikut peringkat**: HQ Admin, Admin Negeri, Admin Daerah, PIC Premis — semua dari BLPP/lantikan BLPP.
- **Audiens/pengguna akhir = kakitangan KEMAS** (peserta, ±15,000 potensi) + tenaga penceramah (dalaman & luar, flag `penceramah_luar`).
- Satu akaun = akses kedua-dua sistem mengikut role.

### Autentikasi (v3.1.1 — DIKEMAS KINI: email sahaja)

⚠ **Perubahan dari draf awal:** semua kategori user (admin BLPP + audience) **tiada No. Pekerja rasmi** — dual-identifier login yang dirancang sebelum ini digugurkan.

| Item | Keputusan v3.1.1 |
|---|---|
| ID login | **Email sahaja** — satu field, satu kolum unique. Tiada fallback No. Pekerja |
| Password | argon2id, minimum 10 aksara, lockout 15 min / 5 percubaan, force-change login pertama (kekal) |
| Reset password | Via email berdaftar ATAU oleh admin peringkat atasan (kekal) |
| **Pengecam rasmi rekod latihan & sijil** | **IC** (dari `core.user_service_records`, rujuk Seksyen 7.1) — gantikan peranan No. Pekerja sepenuhnya |
| **Profil pengguna** | nama, gambar (avatar), email, no. telefon, negeri/daerah/bahagian, jawatan. **User edit sendiri**: gambar, email, telefon, password. **HANYA admin edit**: nama, role, negeri/daerah, status akaun. Semua perubahan → audit log |

### 7.1 Pengendalian data sensitif — No. Kad Pengenalan (v3.1.1, OVERRIDE v2.0 Seksyen 6.6)

⚠ **Perubahan governance penting:** PRD v2.0 Seksyen 6.6 arahkan "jangan simpan IC penuh melainkan benar-benar diperlukan." Keperluan rekod perkhidmatan BLPP mengesahkan keperluan tersebut. **Dengan No. Pekerja digugurkan sepenuhnya (semua user tiada No. Pekerja rasmi), IC kini memikul dua peranan:** (1) rekod perkhidmatan rasmi, (2) **pengecam unik rasmi untuk rekod latihan & penjanaan sijil** — menggantikan peranan No. Pekerja dalam PRD v2.0/v3.0 asal.

| Keperluan | Spesifikasi |
|---|---|
| Penyimpanan | **Field-level encryption** (Postgres `pgcrypto`, `pgp_sym_encrypt`) — bukan plaintext |
| Kunci enkripsi | Simpan **luar DB**, `/opt/xblpp/secrets/` (root-only), berasingan dari credential DB & R2 |
| Struktur table | **Berasingan** dari `core.users` — `core.user_service_records` (rujuk skema Seksyen 2.1 dokumen struktur) |
| **Dedup/lookup (BAHARU)** | `pgp_sym_encrypt` bersifat **non-deterministic** (hasil encrypted berbeza setiap kali walaupun IC sama) — TIDAK boleh UNIQUE constraint terus atas `ic_encrypted`. Tambah kolum `ic_hash varchar(64) UNIQUE NOT NULL` (SHA-256 deterministic) khusus untuk semak duplikat/lookup tanpa perlu decrypt |
| Paparan UI | Default **masked** (`******1234`). Papar penuh hanya atas tindakan eksplisit ("Lihat penuh") |
| **Akses lihat IC penuh (interaktif/UI)** | **HQ Admin sahaja.** Semua role lain hanya nampak versi masked |
| **Akses decrypt (proses sistem)** | Fungsi backend penjanaan sijil/dokumen rasmi **DIBENARKAN** decrypt IC secara automatik (bukan tertakluk sekatan role UI di atas — ini proses sistem, bukan tindakan user melihat). Setiap decrypt (interaktif ATAU sistem) tetap **WAJIB audit log** |
| **Prasyarat sijil (BAHARU — business rule)** | Sijil TIDAK BOLEH dijana jika `core.user_service_records` untuk user berkenaan tiada rekod IC. Sistem papar amaran kepada admin: *"Lengkapkan rekod perkhidmatan (IC) sebelum sijil boleh dijana"* — block, bukan skip |
| Audit | Setiap decrypt/lihat penuh IC → `core.audit_logs`, termasuk decrypt oleh proses sistem (cth. "sijil dijana untuk user X, IC digunakan") |
| Larangan | IC TIDAK BOLEH muncul dalam notification, email, Telegram payload, log aplikasi, atau URL/query string |
| Backup | Rujuk Seksyen 5.5 — backup DB wajib encrypted |

---

## 8. Functional requirements (v3.0)

### Sistem 1: Pengurusan Aset & Premis

Kekal seperti v2.0 Modul 2 sepenuhnya — struktur dua peringkat Premis → Fasiliti, tempahan peringkat fasiliti, recurring booking, calendar, conflict detection, maintenance, semua business rules (SLA 3 hari, eskalasi, larangan tempahan lampau, dsb.). **Tiada perubahan logik.**

### Sistem 2: Pengurusan Latihan

Modul 1 (kursus, program, pendaftaran, kelulusan, waiting list + auto-promotion 48 jam, QR attendance token 60s) dan Modul 3 (penceramah, ketersediaan kalendar, penugasan) **kekal seperti v2.0 sepenuhnya**, DITAMBAH keupayaan online berikut:

#### 8.1 Mod penghantaran kursus (BAHARU)

Setiap kursus/sesi mempunyai `delivery_mode`:

| Mod | Penerangan | Kehadiran/Completion |
|---|---|---|
| `fizikal` | Kelas bersemuka | QR per-sesi (v2.0) |
| `online_live` | YouTube Live / Zoom / Meet | Timestamp klik "Join" (weak signal) + kuiz pos-sesi jika sijil diperlukan |
| `online_rakaman` | Modul self-paced, video YouTube unlisted | **Kuiz/penilaian sebagai completion gate — BUKAN watch-time** |
| `hybrid` | Gabungan | Ikut komponen masing-masing |

**Rasional business rule (PENTING):** syarat sijil v2.0 (`kehadiran ≥ 80% DAN penilaian dihantar`) diadaptasi untuk online:
- `online_rakaman`: sijil = **lulus kuiz (markah lulus configurable) DAN penilaian kursus dihantar**. Watch-time YouTube tidak dijadikan syarat kerana IFrame API adalah client-side dan boleh dibypass — menjadikannya syarat palsu.
- `online_live`: sijil = rekod join DAN kuiz pos-sesi (jika ditetapkan) DAN penilaian.
- Kuiz boleh mengandungi soalan checkpoint yang hanya terjawab jika video benar-benar ditonton.

#### 8.2 Pemilihan platform live (keputusan operasi, bukan sistem)

| Jenis sesi | Platform default | Bila guna alternatif |
|---|---|---|
| Webinar/taklimat besar (one-to-many) | **YouTube Live** — percuma, adaptive bitrate (mesra low-bandwidth luar bandar), auto-VOD | — |
| Bengkel interaktif kecil | **Zoom / Google Meet** | Ikut lesen sedia ada & keputusan pengurusan program |

Sistem hanya **menyimpan dan memaparkan** maklumat sesi (platform, URL join, URL rakaman) — TIADA integrasi API streaming pada Fasa 1. Auto-VOD YouTube Live diisi semula sebagai `recording_url` untuk kegunaan async.

⚠ **Action item governance:** sahkan dengan BLPP/IT jabatan sama ada wujud mandat platform (data residency) sebelum commit Zoom/Meet untuk sesi yang merekod data peserta.

#### 8.3 Skema tambahan LMS

```
course_sessions (tambahan kolum):
  delivery_mode   enum('fizikal','online_live','online_rakaman','hybrid')
  live_platform   enum('youtube_live','zoom','google_meet') NULL
  live_url        text NULL
  recording_url   text NULL   -- diisi selepas sesi / auto-VOD

course_modules (BAHARU — untuk online_rakaman):
  id, course_id FK, title, youtube_video_id varchar,
  duration_minutes int, order_index int, status enum

quizzes (BAHARU — boleh guna awal dari Assessment Fasa 2):
  id, course_id FK, passing_score int, questions jsonb,
  attempts_allowed int default 3

quiz_attempts:
  id, quiz_id FK, user_id FK, answers jsonb, score int,
  passed boolean, attempted_at timestamptz
```

### 8.4 Strategi kandungan (v3.1)

1. **Bina schema + borang admin (CMS) lengkap TANPA kandungan sebenar** — keutamaan kelajuan.
2. **Dummy content (seed script) untuk ujian kelancaran sistem** semasa development: pengguna, premis, fasiliti, kursus, tempahan, pendaftaran rekaan — cukup untuk uji business rules (waiting list promotion, conflict detection, kuiz gate). Seed script disimpan dalam repo (`/scripts/seed-dev.ts`) supaya environment baharu boleh dihidupkan dalam minit — juga mitigasi bus-factor.
3. Staf BLPP mengisi kandungan **sebenar** melalui admin panel selepas sistem siap.
4. **Sebelum demo/pilot rasmi:** GANTIKAN dummy dengan **5–10 rekod SEBENAR** untuk 1 negeri pilot — mitigasi risiko "sistem kosong/data rekaan = first impression buruk" (risiko #4, v2.0 Seksyen 18). Dummy data TIDAK boleh wujud dalam DB production semasa demo.
5. Import wizard CSV (v2.0 Seksyen 10) kekal sebagai **alat bantuan staf isi kandungan pukal**, bukan prasyarat go-live.

---

## 9. Database, API & AI coding rules

**Kekal sepenuhnya dari v2.0** (Seksyen 11, 12, 17) dengan tambahan:

- Postgres schema namespace: `core.*`, `aset.*`, `latihan.*`.
- Table baharu: `latihan.course_modules`, `latihan.quizzes`, `latihan.quiz_attempts` (spesifikasi 8.3).
- Endpoint tambahan: `GET/POST /api/courses/{id}/modules`, `POST /api/quizzes/{id}/attempt` (validation zod, RBAC, audit log — rule Seksyen 17 v2.0 terpakai).
- Acceptance criteria tambahan:
  - **Given** kursus `online_rakaman` dengan kuiz passing score 70, **when** peserta skor 65, **then** status kekal `belum_lengkap` dan sijil tidak dijana; peserta boleh cuba semula ikut `attempts_allowed`.
  - **Given** sesi `online_live` dengan `live_url`, **when** peserta klik Join, **then** timestamp direkod dan peserta di-redirect ke platform.

---

## 10. UI/UX

Kekal dari v2.0 Seksyen 14 (mobile-first, PWA, page weight <300KB, Bahasa Melayu penuh, palet navy/merah/putih tanpa hijau) dengan tambahan:

- Landing selepas login: dua pintu sistem (Aset & Premis / Latihan) mengikut role.
- Skrin modul online (peserta): senarai modul → embed YouTube player → butang "Jawab Kuiz" selepas modul terakhir.
- Embed YouTube guna `youtube-nocookie.com` + lazy-load (facade pattern — thumbnail dulu, player load bila klik) untuk jaga page weight budget.

---

## 11. Non-functional requirements (v3.0)

Kekal dari v2.0 Seksyen 15 dengan pindaan:

| Kategori | v3.0 | Nota |
|---|---|---|
| Availability | 97% waktu operasi (8 pagi–10 malam) — kini metrik gate G1 | VPS Contabo umumnya lebih stabil dari on-premise; tetapi kekalkan 97% sebagai janji, over-deliver sebagai bukti |
| Latency tambahan | Jika DC Contabo di Eropah: +170–250ms RTT dari MY. NFR <2s P95 masih boleh capai dengan SSR + caching, tetapi elak query berantai (N+1) | ⚠ Sahkan lokasi DC |
| Concurrent | 200 serentak + queue page | Kekal |
| Security | Kekal v2.0 + **Postgres localhost-only** + SSH key-only (password auth OFF) + fail2ban + ufw (hanya 80/443/SSH) | Diperketat |

### 11.1 Checklist keselamatan application-layer (BAHARU — v3.1)

Infra layer (firewall, TLS, DB access) disahkan selamat Fasa 0 Langkah 1. Checklist ini WAJIB dipatuhi semasa Langkah 4 (auth) dan seterusnya:

| Kawasan | Keperluan |
|---|---|
| Rate limiting login | Caddy-level rate limit TAMBAHAN kepada application-level lockout (5 percubaan/15 min) — elak bypass melalui distributed attempt |
| Session cookie | `httpOnly`, `secure`, `sameSite=strict` — verify eksplisit dalam config Auth.js, jangan andai default mencukupi |
| Validation | Zod pada SETIAP endpoint (rule sedia ada v2.0 S.17) — tiada pengecualian walaupun tergesa-gesa |
| SQL injection | Drizzle ORM parameterized queries sahaja — DILARANG raw string concatenation dalam query |
| File upload | Validate MIME type + size di **server** (bukan client sahaja), simpan luar web-root, larang extension boleh laku (`.php`, `.sh`, dll) |
| Security headers | `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` — konfigurasi di Caddyfile |
| Dependency scanning | GitHub Dependabot aktif pada repo; `npm audit` semasa CI |
| CI/CD secrets | GitHub Actions guna **GitHub Secrets** (encrypted) — SSH deploy key WAJIB **scoped** (deploy key khusus repo, bukan SSH key peribadi Bos) |
| GitHub account | 2FA WAJIB aktif — satu akaun compromised = seluruh codebase + secrets history terdedah |
| Data sensitif (IC) | Rujuk Seksyen 7.1 — field-level encryption, akses HQ Admin sahaja, audit log setiap read |

---

## 12. Kriteria "smooth 5–6 bulan" → gate migrasi HQ

Definisi operasi "lancar" yang boleh diaudit (rujuk metrik G1–G5, Seksyen 3):

1. **Bulan 1–2 (pilot 1 negeri):** baseline exercise + pembetulan bug; insiden dibenarkan tetapi mesti direkod & diselesaikan.
2. **Bulan 3–6 (rollout berperingkat):** G1 uptime ≥97% berturut-turut, G2 sifar insiden kritikal, G3 restore test lulus setiap bulan, G4 penggunaan menaik, G5 metrik M1–M6 tercapai.
3. Setiap bulan: **laporan operasi 1 muka surat** (uptime, pengguna aktif, insiden, backup status) — disimpan sebagai lampiran kertas kerja migrasi.
4. Kertas kerja migrasi HQ disediakan bila 5 bulan berturut memenuhi gate — PRD v3.0 + laporan bulanan menjadi lampiran teknikal.

---

## 13. Roadmap (v3.0)

| Fasa | Skop | Anggaran |
|---|---|---|
| **Fasa 0** | Provision VPS (hardening, Postgres, Caddy, backup ke R2, monitoring), monorepo skeleton, auth SSO, RBAC, layout dua-sistem, seed framework | 2–3 minggu |
| **Fasa 1a** | Sistem 1 penuh: premis, fasiliti, tempahan, calendar, conflict, maintenance | 3–4 minggu |
| **Fasa 1b** | Sistem 2 teras: kursus/program, pendaftaran, kelulusan, waiting list, notification | 4–5 minggu |
| **Fasa 1c** | QR attendance + LMS asas (delivery_mode, modul YouTube, kuiz, sesi live link) + penceramah | 3–4 minggu |
| **Fasa 1d** | Dashboard, laporan + export, import wizard, seed data sebenar 1 negeri, UAT | 3–4 minggu |
| **Go-live pilot** | 1 negeri → feedback 4–6 minggu → rollout berperingkat | Bulan 1–6 operasi (gate Seksyen 12) |
| **Fasa 2** | Sijil digital (QR verify), penilaian penuh, kompetensi, repository | 6–8 minggu |
| **Fasa 3** | AI assistant (API LLM + pgvector), analitik lanjutan | Selepas bajet API |
| **Fasa 4 / Migrasi HQ** | Selepas gate 5–6 bulan dipenuhi + kelulusan | — |

**MVP boleh guna (Fasa 0–1d): ± 4–5 bulan** (solo dev separuh masa + Claude Code).

> **Nota urutan:** Sistem 1 (aset) didahulukan dalam 1a kerana ia lebih kecil, self-contained, dan memberi quick win yang boleh didemo awal kepada BLPP — momentum adoption sebelum sistem latihan yang lebih besar siap.

---

## 14. Risiko & mitigasi (v3.0)

| Risiko | Perubahan vs v2.0 | Mitigasi |
|---|---|---|
| Kegagalan hardware | ⬇ Berkurang (tiada EliteDesk) | Backup nightly R2 + snapshot Contabo + restore test bulanan |
| VPS Contabo down/maintenance | Baharu | Monitoring luaran + RTO 1 hari ke VPS ganti; Contabo track record dari GerakOps |
| Latency DC Eropah | Baharu | Sahkan lokasi DC; caching agresif; elak N+1 query |
| Governance domain peribadi | Baharu | Rujuk 5.6 — domain neutral / dokumentasi "sementara" |
| Governance data di infra bukan rasmi | Kekal | Framing pilot rasmi, IC encrypted+akses terhad (rujuk S.7.1), email sebagai ID, pelan migrasi didokumentasi, laporan bulanan |
| Watch-time video tidak boleh dibuktikan | Baharu | Kuiz sebagai completion gate (8.1) — didokumentasi supaya pengurusan faham limitasi |
| Adoption rendah | Kekal | Seed data sebenar sebelum demo, rollout berperingkat, champion negeri, UI BM penuh |
| Bus factor = 1 | Kekal | Runbook + README per modul + seed data + dokumentasi deploy |
| Kos berulang tidak dibajet | Kekal (kecil) | VPS (sedia ada) + domain (±RM100/thn) + R2 (minimum) — senarai kos dalam kertas kerja |

---

## 15. Tindakan sebelum Fasa 0 bermula (v3.1 — status dikemas kini)

| # | Tindakan | Status |
|---|---|---|
| 1 | Spec VPS: Cloud VPS 10 SSD (3 vCPU / 8GB / 150GB) | ✅ Selesai — tinggal sahkan **lokasi DC (pilih Singapore jika boleh)** |
| 2 | Angka skala: 15,000 warga, 100–300 concurrent | ✅ Selesai (jumlah premis/kursus/penceramah — boleh sahkan semasa Fasa 1) |
| 3 | Domain: `blpp.gerakops.com` + `/aset` + `/latihan` | ✅ Diputuskan (nota sementara, Seksyen 5.6) |
| 4 | Nama sistem: **xBLPP** | ✅ Muktamad |
| 5 | Sahkan lesen Zoom/Google Meet sedia ada + mandat platform (jika ada) | ⚠ Tertunggak |
| 6 | Setup akaun: GitHub repo private, Cloudflare (DNS gerakops + R2), Brevo SMTP, Telegram bot | ⚠ Tertunggak |
| 7 | Persetujui framing "pilot/PoC" + kriteria gate 5–6 bulan (Seksyen 12) dengan pengurusan BLPP | ⚠ Tertunggak — PENTING sebelum go-live, tidak block development |

---

## 16. Penutup

PRD v3.0 memuktamadkan pivot arkitektur: dari on-premise EliteDesk kepada VPS Contabo tunggal (semua-dalam-satu), struktur dua sistem atas satu core, LMS berasaskan YouTube/platform live sedia ada tanpa app custom, dan strategi kandungan diisi staf. Fokus reka bentuk: **portability mutlak** ke server HQ KEMAS selepas gate operasi 5–6 bulan dipenuhi.

Dokumen ini menggantikan v2.0 sebagai baseline; seksyen v2.0 yang tidak dipinda (business rules penuh, matrix role, spesifikasi table, API standard, AI coding rules) kekal berkuat kuasa dan dirujuk silang.
