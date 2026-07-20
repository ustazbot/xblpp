# KEMAS Training Management Platform (KTMP)

**PRD / AI Development Blueprint — Versi 2.0**

---

## 1. Maklumat dokumen

| Item | Butiran |
|---|---|
| Nama sistem | KEMAS Training Management Platform (KTMP) — *nama akhir belum diputuskan* |
| Versi dokumen | 2.0 (semakan dan penambahbaikan daripada draf 1.0) |
| Jenis dokumen | Product Requirements Document (PRD) / AI Development Blueprint |
| Tujuan | Rujukan lengkap untuk pembangunan sistem menggunakan Claude Code / Codex |
| Status | Sedia untuk development (Fasa 1 MVP) |
| Status sistem | **Pilot / Proof-of-Concept Bahagian Latihan KEMAS** — bukan sistem rasmi jabatan. Migration path ke infrastruktur rasmi disediakan (rujuk Seksyen 15) |
| Perubahan v2.0 | Stack teknologi dilock, spesifikasi server on-premise, PWA & low-bandwidth requirement, pelan migrasi data, NFR realistik, business rules dilengkapkan, matrix role penuh, backup & DR plan |

---

## 2. Executive summary

KTMP ialah platform bersepadu untuk mendigitalkan pengurusan latihan Bahagian Latihan KEMAS: pengurusan kursus dan program, tempahan premis latihan, direktori tenaga penceramah, kompetensi warga KEMAS, knowledge repository, pelaporan dan analitik — dalam satu sistem berpusat.

Fasa awal dijalankan sebagai **pilot on-premise** menggunakan server dedicated (HP EliteDesk 800 G4), dengan seni bina yang direka supaya mudah dipindahkan (migrate) ke infrastruktur cloud atau server rasmi jabatan apabila sistem terbukti dan mendapat kelulusan.

**Prinsip reka bentuk utama:**

1. **Mobile-first untuk pengguna lapangan** — peserta, penceramah, PIC premis dan admin daerah kebanyakannya guna telefon. Antara muka mesti berfungsi lancar pada telefon dengan capaian internet lemah (kawasan luar bandar).
2. **Desktop-optimized untuk admin HQ** — kerja pengurusan data pukal, laporan dan konfigurasi dibuat di ibu pejabat menggunakan PC.
3. **Lean & pragmatik** — setiap ciri MVP mesti boleh berjalan selesa dalam had hardware (8GB RAM, 256GB SSD).

---

## 3. Vision, objective & success metrics

### Vision

Menjadi platform latihan bersepadu yang menyatukan pengurusan latihan, fasiliti, tenaga pengajar, kompetensi dan ilmu pengetahuan KEMAS dalam satu ekosistem digital.

### Business objectives

- Menyatukan semua data latihan dalam satu platform berpusat.
- Mengurangkan kerja manual (Excel, Google Form, WhatsApp, surat, telefon).
- Mempercepat proses pendaftaran, kelulusan, penjadualan dan pelaporan.
- Mengoptimumkan penggunaan premis latihan dan tenaga penceramah.
- Menyediakan dashboard, laporan dan analitik untuk pengurusan KEMAS.
- Mewujudkan repository ilmu dan rekod kompetensi warga KEMAS.

### Success metrics (v2.0 — boleh diukur oleh sistem sendiri)

| # | Metrik | Cara ukur | Sasaran 6 bulan selepas go-live |
|---|---|---|---|
| M1 | % tempahan premis melalui sistem (vs manual) | Kiraan rekod tempahan sistem berbanding log manual PIC | ≥ 70% |
| M2 | % sijil dijana automatik oleh sistem | Kiraan sijil auto vs sijil manual | ≥ 95% |
| M3 | Masa purata permohonan → kelulusan | Timestamp workflow dalam sistem | ≤ 3 hari bekerja |
| M4 | % laporan bulanan dijana dari sistem tanpa Excel manual | Log export laporan | ≥ 80% |
| M5 | Kadar kehadiran direkod digital (QR/manual dalam sistem) | Rekod attendance vs jumlah sesi | ≥ 90% |
| M6 | Kepuasan pengguna (survey dalam sistem, skala 1-5) | Modul penilaian sistem | ≥ 4.0/5.0 |

> **Nota:** Setiap metrik ada baseline exercise pada bulan pertama pilot (rekod cara kerja manual semasa) supaya perbandingan sebelum/selepas sah.

### Anggaran skala (WAJIB disahkan sebelum development — placeholder di bawah)

| Parameter | Anggaran | Status |
|---|---|---|
| Jumlah warga KEMAS (potensi pengguna) | ± [X,XXX] — *sahkan dengan Bahagian Latihan* | ⚠ Perlu data sebenar |
| Pengguna aktif serentak (concurrent) waktu puncak | 100–300 (anggaran pendaftaran kursus popular dibuka) | Anggaran |
| Jumlah premis latihan (IL/AL/PL KEMAS + PKM) | ± [XXX] | ⚠ Perlu data sebenar |
| Kursus/program setahun | ± [XXX] | ⚠ Perlu data sebenar |
| Tenaga penceramah berdaftar | ± [XXX] | ⚠ Perlu data sebenar |

> Angka ini menentukan capacity planning, indexing strategy dan keputusan pagination. **Jangan mula development modul pendaftaran sebelum angka concurrent user disahkan** — ia menentukan sama ada perlu queue mechanism pada waktu pendaftaran puncak.

---

## 4. Scope sistem

### In scope (Fasa 1 — MVP)

- **Pengurusan latihan:** kursus, program, pendaftaran, kelulusan berperingkat, kehadiran (QR + manual), waiting list.
- **Pengurusan premis:** direktori premis, kemudahan, tempahan (termasuk tempahan separa premis), calendar, conflict detection, status maintenance.
- **Pengurusan tenaga penceramah:** profil, kepakaran, ketersediaan, penugasan, rekod prestasi asas.
- **Dashboard asas + laporan asas** dengan export PDF/Excel.
- **Notification:** in-app + email + Telegram bot.
- **RBAC, audit trail, soft delete.**
- **Migrasi data sedia ada** (Excel → sistem) melalui modul import CSV dengan validation.

### Fasa 2

- Penilaian kursus & analisis kepuasan.
- Sijil digital (PDF + QR verification + serial number).
- Competency management & rekod jam latihan.
- Knowledge repository (dokumen; video via Cloudflare R2).

### Fasa 3

- AI assistant (RAG menggunakan pgvector + API LLM — **bukan local LLM**, rujuk Seksyen 13).
- LMS asas (modul online, quiz, progress).
- Analitik lanjutan.

### Fasa 4

- Workflow engine boleh-konfigurasi.
- Resource management, budget & finance, vendor management.
- Integrasi HRMIS / SSO kerajaan / WhatsApp API (tertakluk kelulusan dan migrasi ke infra rasmi).

### Out of scope (kekal)

- Mobile app native (PWA menggantikan keperluan ini).
- Digital signature PKI penuh pada sijil (QR verification memadai; PKI hanya jika sistem dinaiktaraf rasmi).
- SMS gateway (kos berulang; Telegram + email memadai untuk pilot).

---

## 5. Masalah semasa

- Data kursus dan peserta berpecah dalam Excel, Google Form dan fail manual.
- Tempahan premis dibuat manual melalui telefon, email atau WhatsApp.
- Sukar mencari tenaga pengajar mengikut bidang, negeri dan ketersediaan.
- Rekod latihan warga KEMAS tidak berpusat dan sukar dijejak.
- Laporan mengambil masa panjang untuk disediakan.
- Bahan kursus tidak tersimpan dalam repository yang mudah dicari.

---

## 6. Infrastruktur & deployment (BAHARU — v2.0)

### 6.1 Spesifikasi server pilot

| Komponen | Spesifikasi | Implikasi reka bentuk |
|---|---|---|
| Server | HP EliteDesk 800 G4 Micro | Form factor kecil, senyap, sesuai pejabat |
| CPU | Intel Core i5 gen ke-8 (6 core) | Cukup untuk 200-300 concurrent users web app |
| RAM | 8GB | **Bajet RAM ketat** — rujuk 6.2. Tiada local LLM/Ollama |
| Storage | 256GB SSD | **Media besar (video/rakaman) WAJIB ke Cloudflare R2.** Local: OS + DB + dokumen < 10MB |
| OS | Ubuntu Server 24.04 LTS | Headless, minimum footprint |

### 6.2 Bajet RAM (mesti dipatuhi)

| Proses | Peruntukan |
|---|---|
| Ubuntu Server (headless) | ± 0.8 GB |
| PostgreSQL 16 (shared_buffers 1.5GB, tuned) | ± 2.0 GB |
| Next.js (production, standalone) | ± 1.0 GB |
| Nginx + cloudflared | ± 0.3 GB |
| Buffer/cache OS + headroom | ± 3.9 GB |

**Peraturan:** Tiada servis tambahan (Redis, MinIO, Elasticsearch, Docker berlapis-lapis) dibenarkan pada Fasa 1 melainkan bajet RAM disemak semula. Caching guna in-memory Next.js + Postgres. Full-text search guna Postgres `tsvector`, bukan Elasticsearch.

### 6.3 Seni bina deployment

```
[Pengguna: telefon/PC]
        │  HTTPS
        ▼
[Cloudflare (DNS + CDN + WAF + Tunnel)]
        │  cloudflared (outbound tunnel — tiada port forwarding, tiada static IP diperlukan)
        ▼
[HP EliteDesk 800 G4 — Ubuntu Server 24.04]
   ├── Nginx (reverse proxy)
   ├── Next.js 14 (App Router, standalone build, PM2/systemd)
   ├── PostgreSQL 16 + pgvector (Fasa 3)
   └── Local storage: /var/ktmp/files (dokumen < 10MB sahaja)

[Cloudflare R2] ← media besar: video, rakaman, gambar premis resolusi penuh
```

**Sebab pilihan:**
- Cloudflare Tunnel: server dalam pejabat tanpa static IP boleh diakses secara selamat; corak sama yang telah terbukti pada projek 1page.my.
- Tiada self-hosted Supabase: stack Supabase penuh menggunakan 3–4GB RAM sendiri; PostgreSQL vanilla + Drizzle ORM memadai dan lebih ringan.

### 6.4 Environment strategy (satu server)

| Environment | Lokasi | Nota |
|---|---|---|
| Production | EliteDesk (port 3000, DB `ktmp_prod`) | Cloudflare Tunnel → domain production |
| Staging | EliteDesk (port 3001, DB `ktmp_staging`) | Subdomain staging, basic auth Cloudflare Access |
| Development | PC pembangun (Linux Mint) | Postgres local / Docker |

> Staging dan production berkongsi hardware — deploy staging **tidak dibenarkan** pada waktu puncak operasi (8 pagi–6 petang hari bekerja).

### 6.5 Backup & disaster recovery (KRITIKAL — single point of failure)

| Item | Spesifikasi |
|---|---|
| Backup DB | `pg_dump` automatik setiap malam (2 pagi) → compress → upload ke Cloudflare R2 (rclone) |
| Backup fail | rsync `/var/ktmp/files` → R2 setiap malam |
| Retention | 30 hari harian + 12 bulan bulanan |
| Ujian restore | **Wajib setiap bulan** — backup yang tak pernah diuji restore = tiada backup |
| UPS | **Wajib** — mini UPS 600VA-1kVA untuk EliteDesk + modem/router (anggaran RM250–400). Auto-shutdown script bila bateri < 20% |
| RPO (kehilangan data maksimum) | 24 jam |
| RTO (masa pemulihan) | 1 hari bekerja (restore ke hardware ganti / VPS sementara) |
| Monitoring | Uptime Kuma di VPS Contabo (luar) memantau endpoint sistem + alert Telegram |

### 6.6 Nota governance & migration path (PENTING)

- Sistem ini beroperasi sebagai **pilot dalaman Bahagian Latihan**. Data peribadi warga KEMAS (nama, no. pekerja, rekod latihan) tersimpan pada server pilot — akses dihadkan melalui Cloudflare Access/WAF dan RBAC.
- **Jangan simpan no. kad pengenalan penuh** pada Fasa 1 melainkan benar-benar diperlukan; guna No. Pekerja sebagai pengecam utama. Jika IC diperlukan untuk sijil, simpan encrypted-at-rest.
- Seni bina sengaja dipilih supaya **portable**: PostgreSQL + Next.js + object storage boleh dipindahkan ke MyGovCloud, server jabatan atau mana-mana VPS dengan downtime minimum (restore pg_dump + tukar DNS).
- Apabila sistem terbukti (metrik Seksyen 3 tercapai), sediakan kertas kerja untuk naik taraf ke infrastruktur rasmi. PRD ini menjadi lampiran teknikal kertas kerja tersebut.

---

## 7. Stack teknologi (dilock — v2.0)

| Lapisan | Pilihan | Justifikasi |
|---|---|---|
| Frontend + Backend | Next.js 14 (App Router, TypeScript) | Satu codebase, SSR untuk prestasi mobile, API routes untuk backend |
| UI | Tailwind CSS + shadcn/ui | Ringan, accessible, konsisten |
| Database | PostgreSQL 16 | Battle-tested, tsvector untuk search, pgvector untuk AI Fasa 3 |
| ORM | Drizzle ORM | Ringan, type-safe, migration terkawal |
| Auth | Auth.js (NextAuth v5) — Credentials provider | Login No. Pekerja + password; sedia untuk SSO/OIDC masa depan |
| File storage | Local disk (dokumen < 10MB) + Cloudflare R2 (media besar) | Jimat SSD 256GB |
| PDF (sijil/laporan) | `pdf-lib` / `@react-pdf/renderer` | **Elak Puppeteer** — Chrome headless makan 500MB+ RAM |
| QR | `qrcode` (jana) + `html5-qrcode` (imbas melalui browser) | Tiada app native diperlukan |
| Email | Nodemailer + SMTP (contoh: Brevo free tier 300/hari) | Notifikasi kelulusan/tawaran |
| Notifikasi segera | Telegram Bot API | Percuma, corak sedia terbukti dalam projek Y'Herbs/1page |
| Process manager | systemd / PM2 | Auto-restart |
| Reverse proxy | Nginx | Static caching, rate limiting |
| Tunnel | cloudflared | Akses public tanpa static IP |

---

## 8. User persona & role

| Persona | Peranti utama | Peranan utama |
|---|---|---|
| Administrator HQ | **PC/Desktop** | Konfigurasi sistem, pengurusan nasional, laporan nasional, approval akhir |
| Administrator Negeri | PC + Mobile | Latihan, premis, peserta dan laporan peringkat negeri |
| Administrator Daerah | **Mobile-first** | Operasi latihan daerah, kehadiran, pendaftaran walk-in |
| PIC Institut/Premis | **Mobile-first** | Jadual premis, sahkan tempahan, status maintenance |
| Tenaga Pengajar | **Mobile-first** | Profil, ketersediaan, terima/tolak penugasan, bahan pengajaran |
| Peserta | **Mobile-first** | Daftar kursus, status, QR kehadiran, penilaian, sijil |
| Ketua Jabatan/Pengarah | PC + Mobile | Dashboard, KPI, laporan, kelulusan tertentu |

### Role & permission matrix (v2.0 — lengkap 7 role)

| Modul | HQ Admin | Negeri | Daerah | PIC Premis | Trainer | Peserta | Pengarah |
|---|---|---|---|---|---|---|---|
| Pengurusan latihan | Create, approve, report (semua) | Create, approve, report (negeri) | Create, manage (daerah) | View berkaitan premis | View assigned | Register, view own | View + approve tertentu |
| Pengurusan premis | Manage all | Manage negeri | Request | **Manage premis sendiri, approve/reject tempahan, set maintenance** | View assigned | View direktori | View reports |
| Penceramah | Manage all | Manage negeri | View, cadang | View | Update own profile | View direktori awam | View + prestasi |
| Repository | Manage | Manage | Upload/view | Upload/view | Upload/view | View published | View |
| Kompetensi | Manage/report | Manage/report | View/manage | – | View own | View own | **View staf bawahan** |
| Dashboard & laporan | Full nasional | Negeri | Daerah | Premis sendiri | Own | Own | **Nasional (read-only) + jabatan** |
| Konfigurasi sistem | Full | – | – | – | – | – | – |
| Import data (migrasi) | Full | Negeri sahaja | – | – | – | – | – |

### Autentikasi (v2.0 — diputuskan)

- **ID login: No. Pekerja KEMAS** (bukan email — bukan semua staf guna email rasmi secara aktif).
- Email dan no. telefon sebagai maklumat hubungan/notifikasi, bukan pengecam login.
- Password policy: minimum 10 aksara, hashed (argon2id), lockout 15 minit selepas 5 percubaan gagal, force change pada login pertama.
- Peserta luar KEMAS (jika ada program komuniti): pendaftaran self-service dengan no. telefon + email, role `peserta_luar`.
- Reset password: melalui email berdaftar ATAU oleh admin peringkat atasan (untuk staf tanpa akses email).

---

## 9. Functional requirements

### Modul 1: Pengurusan latihan

#### Submodul

- **Kursus:** kod, kategori, tempoh, objektif, silibus, sasaran peserta, kuota, CPD points.
- **Program:** seminar, bengkel, webinar, taklimat, retreat, bootcamp, lawatan.
- **Pendaftaran:** permohonan, status, surat tawaran (PDF auto), jadual, lokasi, waiting list.
- **Kelulusan:** workflow mohon → penyelia → Bahagian Latihan → lulus → notifikasi.
- **Kehadiran:** QR per-sesi + manual override (NFC dan GPS **digugurkan** dari MVP — kompleksiti tinggi, nilai rendah).
- **Laporan:** jumlah latihan, jam, peserta, kos, mengikut negeri/bahagian/tempoh.

#### Spesifikasi QR attendance (BAHARU — v2.0)

1. Urus setia buka sesi → sistem jana QR unik per-sesi dengan token yang **expire setiap 60 saat** (elak screenshot QR dikongsi dalam group WhatsApp).
2. Peserta imbas QR guna telefon sendiri (browser, `html5-qrcode`) semasa login → kehadiran direkod dengan timestamp.
3. **Mod alternatif (peserta tiada telefon/internet):** urus setia imbas atau tanda manual dari senarai peserta pada telefon/tablet urus setia.
4. Manual override oleh admin dengan sebab wajib diisi (audit trail).
5. Kehadiran boleh direkod per-hari atau per-slot (kursus berbilang hari).

#### Business rules (v2.0 — dilengkapkan)

- Kursus yang telah bermula tidak boleh dipadam; hanya boleh dibatalkan dengan audit trail dan notifikasi kepada semua peserta berdaftar.
- Kuota penuh → permohonan masuk waiting list mengikut FIFO.
- **Waiting list auto-promotion (BAHARU):** bila slot kosong (peserta tarik diri/ditolak), peserta pertama dalam waiting list dinaikkan automatik → notifikasi → peserta perlu **sahkan dalam 48 jam** → jika tidak, tawaran berpindah ke peserta seterusnya.
- Peserta hanya boleh mendaftar jika memenuhi syarat sasaran (gred, bahagian, negeri — configurable per kursus).
- Peserta tidak boleh mendaftar dua kursus yang bertindih tarikh (sistem beri amaran, admin boleh override).
- Sijil dijana hanya selepas syarat kursus dipenuhi (contoh: kehadiran ≥ 80% DAN penilaian dihantar — threshold configurable per kursus).
- Penarikan diri selepas surat tawaran dikeluarkan memerlukan sebab, direkod untuk laporan.

### Modul 2: Pengurusan premis latihan

#### Fungsi utama

- Direktori premis: Institut Latihan KEMAS, Akademi Latihan KEMAS, Pusat Latihan KEMAS, Pusat Kegiatan Masyarakat.
- Maklumat premis: gambar (thumbnail local, resolusi penuh R2), lokasi, pautan Google Maps, kapasiti, kemudahan, PIC, status.
- **Struktur dua peringkat (BAHARU):** Premis → Fasiliti (dewan, bilik seminar, makmal, asrama). Tempahan dibuat pada **peringkat fasiliti**, bukan keseluruhan premis — membolehkan dua program berbeza guna dewan dan makmal pada masa sama.
- Tempahan: fasiliti → tarikh/masa → tujuan → semakan konflik → kelulusan PIC → pengesahan.
- **Recurring booking (BAHARU):** tempahan berulang mingguan/bulanan untuk kelas berkala.
- Calendar view: harian, mingguan, bulanan (per premis dan per fasiliti).
- Conflict detection automatik pada peringkat fasiliti.
- Maintenance: fasiliti/premis boleh ditanda under maintenance dengan tempoh; tempahan sedia ada dalam tempoh tersebut dinotifikasi kepada pemohon.

#### Business rules (v2.0)

- Fasiliti dalam maintenance tidak boleh ditempah; tempahan sedia ada yang terjejas → notifikasi automatik + status `perlu_pindah`.
- Tempahan bertindih pada fasiliti sama ditolak automatik.
- Setiap tempahan mesti ada tujuan, anggaran bilangan peserta dan PIC pemohon.
- **SLA kelulusan tempahan: 3 hari bekerja.** Jika PIC tidak bertindak, eskalasi automatik ke Admin Negeri (notifikasi).
- Tempahan tarikh lampau tidak dibenarkan; tempahan > 12 bulan ke hadapan memerlukan kelulusan Admin Negeri.
- Pembatalan tempahan < 3 hari sebelum tarikh guna memerlukan sebab (direkod untuk laporan penggunaan).

### Modul 3: Pengurusan tenaga penceramah

#### Fungsi utama

- Profil: nama, jawatan, negeri, bidang, kepakaran, pengalaman, resume (PDF local), video intro (R2, optional).
- Bidang kepakaran (taxonomy terkawal, admin HQ boleh tambah): ICT, keusahawanan, TVET, pengurusan, kepimpinan, PAKK, komuniti, kewangan, AI, digital marketing.
- **Ketersediaan (v2.0 — berdasarkan kalendar, bukan status statik):** penceramah tandakan tarikh tidak tersedia pada kalendar; sistem kira ketersediaan sebenar daripada kalendar + penugasan sedia ada. (Status statik "busy/leave" mudah lapuk dan tidak tepat.)
- Penugasan: carian bidang → negeri → tarikh → sistem cadang penceramah tersedia → jemputan → accept/reject dengan **tempoh respons 3 hari bekerja** → auto-reminder → escalate jika tiada respons.
- Prestasi: jumlah kursus, jam mengajar, jumlah peserta, rating purata (dari Modul Penilaian Fasa 2).

#### Business rules

- Penceramah tidak boleh ditugaskan pada tarikh yang bertindih dengan penugasan sedia ada atau tarikh tidak tersedia.
- Penugasan direkod bersama kursus, tarikh, lokasi dan status jemputan.
- Prestasi dikemas kini automatik selepas kursus selesai dan penilaian diterima.
- Penceramah luar (bukan warga KEMAS) direkod dengan flag `penceramah_luar` — pengurusan penuh vendor ditangguh ke Fasa 4.

### Modul sokongan (mengikut fasa)

| Modul | Fasa | Nota v2.0 |
|---|---|---|
| Notification Centre | 1 | **In-app + email + Telegram bot sahaja.** SMS/WhatsApp API digugurkan (kos + kelulusan API) |
| Dashboard & Analytics | 1 (asas), 3 (lanjutan) | |
| Document Management (surat tawaran, kelulusan) | 1 (jana PDF asas) | Template PDF dengan letterhead KEMAS |
| Penilaian kursus | 2 | |
| Sijil digital | 2 | QR verification + serial number; **bukan** PKI digital signature |
| Knowledge Repository | 2 | Dokumen local; video/rakaman ke R2 dengan streaming |
| Competency Management | 2 | |
| LMS | 3 | |
| AI Assistant | 3 | Rujuk Seksyen 13 |
| Workflow Engine (configurable) | 4 | Fasa 1 guna workflow tetap (hardcoded, well-tested) |
| Resource, Budget, Vendor Management | 4 | |

---

## 10. Migrasi data (BAHARU — v2.0)

Ini komponen yang sering diambil mudah tetapi menentukan kejayaan adoption.

### Skop migrasi

| Data sedia ada | Sumber | Sasaran |
|---|---|---|
| Senarai staf/pengguna | Excel HR / senarai bahagian | Table `users` |
| Senarai premis + fasiliti | Senarai manual Bahagian Latihan | `venues`, `facilities` |
| Senarai penceramah | Excel / rekod manual | `trainers` |
| Rekod latihan lampau (2–3 tahun) | Excel pelbagai format | `courses`, `registrations` (status: `arkib`) |

### Proses

1. **Template CSV standard** disediakan untuk setiap entiti (kolum tetap, contoh baris, nota validation).
2. Modul **Import Wizard** dalam admin panel: upload CSV → preview → validation report (baris gagal + sebab) → confirm import → log import dalam audit trail.
3. Data gagal validation **tidak** diimport separuh jalan — mod all-or-nothing per fail, dengan senarai baris bermasalah untuk dibaiki.
4. Rekod lampau diimport dengan flag `imported_legacy` supaya laporan boleh bezakan data sistem vs data arkib.
5. **Pemilik data:** setiap negeri bertanggungjawab cleanse data masing-masing menggunakan template; HQ import berperingkat (satu negeri dahulu sebagai pilot import).

### Anggaran effort

Migrasi + cleansing biasanya mengambil **20–30% masa projek keseluruhan**. Peruntukkan dalam timeline (Seksyen 16).

---

## 11. Database concept

### Entity utama (v2.0)

`User`, `Role`, `Course`, `Program`, `Registration`, `WaitingList`, `Attendance`, `AttendanceSession`, `Assessment`, `Certificate`, `Venue`, **`Facility`** (baharu — anak kepada Venue), `VenueBooking`, `Trainer`, `TrainerAvailability` (baharu), `TrainerAssignment`, `Competency`, `RepositoryItem`, `Notification`, `AuditLog`, `ImportLog` (baharu)

### Konvensyen skema

- Semua PK: `uuid` (v7 — sortable).
- Semua table utama: `created_at`, `updated_at`, `deleted_at` (soft delete), `created_by`.
- Status field guna Postgres `enum` atau check constraint — bukan varchar bebas.
- Index wajib pada semua FK dan kolum yang selalu difilter (`status`, `negeri_id`, tarikh).
- Full-text search: kolum `search_vector tsvector` (generated) pada `courses`, `trainers`, `repository_items` — GIN index. **Tiada Elasticsearch.**

### Contoh spesifikasi table: Course (v2.0)

| Column | Datatype | Constraint |
|---|---|---|
| id | uuid | PK |
| course_code | varchar(30) | unique, not null |
| title | varchar(255) | not null |
| category_id | uuid | FK → course_categories |
| description | text | |
| duration_hours | integer | not null, > 0 |
| max_participants | integer | not null, > 0 |
| min_attendance_pct | integer | default 80 (syarat sijil) |
| target_criteria | jsonb | syarat sasaran (gred, bahagian, negeri) |
| cpd_points | integer | default 0 |
| status | enum | draft / published / ongoing / completed / cancelled |
| negeri_id | uuid | FK, nullable (null = nasional) |
| created_by | uuid | FK → users |
| created_at / updated_at / deleted_at | timestamptz | |
| search_vector | tsvector | generated, GIN index |

### Contoh: Facility (baharu)

| Column | Datatype | Constraint |
|---|---|---|
| id | uuid | PK |
| venue_id | uuid | FK → venues, not null |
| name | varchar(150) | contoh: "Dewan Utama", "Makmal Komputer 1" |
| type | enum | dewan / bilik_seminar / makmal / asrama / lain |
| capacity | integer | not null |
| amenities | jsonb | projektor, wifi, PA system dsb. |
| status | enum | active / maintenance / closed |
| maintenance_until | date | nullable |

---

## 12. API requirement

RESTful melalui Next.js Route Handlers. Semua endpoint (kecuali auth & QR check-in awam) dilindungi session + RBAC middleware.

### Authentication

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/auth/login | Login (No. Pekerja + password) |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Profil semasa |
| POST | /api/auth/reset-request | Mohon reset password |

### Training management

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/courses | Senarai (pagination wajib, default 20, max 100) |
| POST | /api/courses | Cipta |
| GET | /api/courses/{id} | Detail |
| PATCH | /api/courses/{id} | Kemaskini |
| DELETE | /api/courses/{id} | Soft delete (ditolak jika status ongoing/completed) |
| POST | /api/courses/{id}/register | Daftar peserta |
| POST | /api/registrations/{id}/approve | Lulus permohonan |
| POST | /api/registrations/{id}/reject | Tolak (sebab wajib) |
| POST | /api/courses/{id}/sessions | Buka sesi kehadiran (jana QR token) |
| POST | /api/attendance/check-in | Check-in QR (token + user session) |

### Venue & facility

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/venues | Senarai premis |
| GET | /api/venues/{id}/facilities | Fasiliti dalam premis |
| POST | /api/facilities/{id}/book | Tempah fasiliti (support recurring) |
| GET | /api/facilities/{id}/calendar?from=&to= | Jadual penggunaan |
| POST | /api/bookings/{id}/approve | PIC lulus tempahan |
| POST | /api/bookings/{id}/reject | PIC tolak (sebab wajib) |

### Standard API

- Response envelope konsisten: `{ data, error, meta }`.
- Rate limiting (Nginx): 60 req/min per IP untuk API awam; 10 req/min untuk login.
- Upload limit: 10MB per fail (local); > 10MB → presigned URL R2.
- Semua tarikh: ISO 8601, timezone `Asia/Kuala_Lumpur` untuk paparan.

---

## 13. AI assistant specification (Fasa 3)

### Constraint hardware (WAJIB faham)

Server 8GB RAM **tidak mampu** menjalankan LLM atau embedding model secara local. Seni bina AI:

- **LLM:** API luaran — DeepSeek (kos rendah, jawapan umum) + Claude API (tugasan kritikal seperti rumusan dokumen rasmi).
- **Embeddings:** API embedding (kos sangat rendah) → simpan dalam **pgvector** dalam PostgreSQL sedia ada. Tiada vector DB berasingan.
- **Implikasi:** AI assistant memerlukan internet + kos API berulang (anggaran, tertakluk penggunaan: RM50–200/bulan). Bajet ini mesti dipersetujui sebelum Fasa 3 bermula.
- **Privasi:** data yang dihantar ke API luaran mesti dihadkan kepada kandungan repository/SOP yang bukan sensitif. **Data peribadi peserta tidak dihantar ke LLM API.**

### Knowledge source

Knowledge Repository, data kursus, data trainer, data premis, SOP/manual, FAQ sistem.

### Fungsi

- Jawab soalan berkaitan kursus, trainer, premis dan SOP (RAG + citation).
- Cadang kursus berdasarkan kompetensi/minat.
- Carian semantik repository.
- Rumus modul, slide, manual dan laporan.
- **Disiplin sumber ketat:** setiap jawapan mesti disertakan rujukan sumber; jika tiada dalam knowledge base, sistem menjawab "maklumat tidak terdapat dalam pangkalan data" — **tidak membuat andaian**.

---

## 14. UI/UX specification

### Prinsip (v2.0)

- **Mobile-first untuk semua skrin operasi lapangan** (pendaftaran, kehadiran QR, tempahan, profil, sijil). Reka untuk skrin 360px dahulu, kembangkan ke desktop.
- **Desktop-optimized untuk skrin pengurusan HQ** (import data, konfigurasi, laporan pukal, table besar) — table penuh dengan bulk action pada desktop; view kad ringkas pada mobile.
- Professional, clean, sesuai identiti kerajaan. Palet: navy `#0D1B3E`, merah `#E8001D`, putih — selaras brand KEMAS. **Tiada hijau.**
- Bahasa antara muka: Bahasa Melayu penuh (label, mesej ralat, notifikasi).

### PWA & low-bandwidth (BAHARU — kritikal untuk konteks KEMAS luar bandar)

- **PWA:** manifest + service worker → boleh "Add to Home Screen", berfungsi seperti app.
- **Offline view (read-only):** jadual kursus didaftar, tiket QR peserta dan sijil di-cache untuk paparan tanpa internet. (Check-in tetap perlu internet — token QR live.)
- **Page weight budget:** < 300KB first load (JS + CSS) untuk skrin peserta; gambar lazy-load, format WebP, thumbnail dijana server.
- Skeleton loading, bukan spinner kosong; mesej ralat rangkaian yang jelas dengan butang cuba semula.
- Elak library carousel/animation berat.

### Komponen standard

- Semua table (desktop): search, sort, filter, export, pagination, bulk action.
- Semua senarai (mobile): infinite scroll / load more, filter melalui bottom sheet.
- Semua form: validation inline, draft save (localStorage untuk form panjang), confirmation modal untuk tindakan destruktif.
- Navigation: sidebar (desktop) / bottom navigation 4-5 item (mobile).

### Layout dashboard HQ (desktop)

Top navbar → Sidebar → Statistics cards → Upcoming Training → Venue Usage → Recent Courses → Trainer Ranking → Notification Centre

### Layout mobile peserta

Bottom nav: Utama · Kursus · QR Saya · Sijil · Profil

---

## 15. Non-functional requirements (v2.0 — realistik untuk on-premise pilot)

| Kategori | Requirement v2.0 | Nota perubahan dari v1.0 |
|---|---|---|
| Performance | Response time < 2s (P95) untuk operasi biasa; < 5s untuk laporan berat | Lebih spesifik (P95) |
| Availability | **97% pada waktu operasi (8 pagi–10 malam)**; maintenance window: Ahad 12 tengah malam–6 pagi | Diturunkan dari 99.5% — jujur dengan realiti satu server tanpa failover. 99.5% memerlukan infra redundant yang tiada pada fasa pilot |
| Concurrent users | 200 serentak tanpa degradasi; **queue page** ("Anda dalam giliran...") jika pendaftaran puncak melebihi kapasiti | Baharu |
| Scalability | Vertical dahulu (upgrade RAM EliteDesk ke 16/32GB — SODIMM murah); seni bina portable untuk migrate keluar | Baharu — jalan upgrade jelas |
| Security | RBAC, argon2id, HTTPS penuh (Cloudflare), session timeout 30 min idle, lockout, audit log, rate limiting | Ditambah spesifik |
| Backup | Nightly ke R2 + ujian restore bulanan + UPS | Rujuk Seksyen 6.5 |
| Accessibility | WCAG AA | Kekal |
| Compatibility | Chrome, Edge, Firefox, Safari + mobile browser (Android WebView untuk telefon bajet) | Ditambah Android WebView |
| Logging | Audit trail semua tindakan penting + application log (rotate 14 hari — jaga SSD) | Ditambah log rotation |
| Data retention | Rekod latihan: kekal (arkib). Notification: 6 bulan. Application log: 14 hari | Baharu |

---

## 16. Roadmap pembangunan (v2.0 — dengan anggaran masa)

Anggaran berdasarkan seorang pembangun menggunakan Claude Code, kerja separuh masa. Laraskan mengikut ketersediaan sebenar.

| Fasa | Skop | Anggaran |
|---|---|---|
| **Fasa 0: Asas** | Setup server (Ubuntu, Postgres, Nginx, Tunnel, backup), skeleton Next.js, auth, RBAC, layout, seed data | 2–3 minggu |
| **Fasa 1a: Latihan teras** | Kursus, program, pendaftaran, kelulusan, waiting list, notification (in-app/email/Telegram) | 4–6 minggu |
| **Fasa 1b: Premis + kehadiran** | Premis/fasiliti, tempahan + calendar + conflict, QR attendance | 3–4 minggu |
| **Fasa 1c: Penceramah + laporan** | Profil, ketersediaan kalendar, penugasan, dashboard asas, laporan asas + export | 3–4 minggu |
| **Fasa 1d: Migrasi + UAT** | Import wizard, migrasi data pilot 1 negeri, UAT dengan pengguna sebenar, pembetulan | 3–4 minggu |
| **Go-live pilot** | 1 negeri dahulu → kumpul feedback 4-6 minggu → rollout nasional berperingkat | – |
| **Fasa 2** | Penilaian, sijil digital, kompetensi, repository | 6–8 minggu |
| **Fasa 3** | AI assistant, LMS asas, analitik lanjutan | Selepas Fasa 2 stabil + bajet API |
| **Fasa 4** | Workflow engine, resource/budget/vendor, integrasi rasmi | Tertakluk migrasi ke infra rasmi |

**Jumlah Fasa 0–1 (MVP boleh guna): ± 4–5 bulan.**

> **Strategi rollout:** jangan launch nasional serentak. Pilot 1 negeri → betulkan → rollout 3-4 negeri → nasional. Adoption gagal biasanya sebab launch terlalu besar terlalu awal, bukan sebab sistem tak siap.

---

## 17. AI coding rules (untuk Claude Code / Codex)

1. Ikut stack Seksyen 7 tanpa penambahan library luar senarai kecuali diluluskan.
2. Semua migration melalui Drizzle Kit — tiada `ALTER TABLE` manual di production.
3. Setiap endpoint mesti ada: validation (zod), RBAC check, audit log untuk mutasi, error handling konsisten.
4. Server Components secara default; Client Components hanya bila perlu interaktiviti.
5. Tiada `any` dalam TypeScript; strict mode.
6. Ujian: minimum unit test untuk business rules kritikal (waiting list promotion, conflict detection, syarat sijil).
7. Semua string UI dalam Bahasa Melayu; simpan dalam fail constants (sedia untuk i18n masa depan).
8. Jangan guna Puppeteer/Playwright untuk jana PDF di server production.
9. Setiap query senarai mesti ada pagination + limit maksimum.
10. Commit mengikut modul; setiap fasa ada tag versi.

### Acceptance criteria (contoh — modul latihan)

- **Given** admin mempunyai akses create course, **when** semua field wajib diisi dan submit, **then** kursus dicipta dengan status `draft` dan direkod dalam audit log.
- **Given** kuota kursus penuh, **when** peserta baharu memohon, **then** peserta dimasukkan ke waiting list FIFO dan menerima notifikasi kedudukan giliran.
- **Given** peserta dalam waiting list kedudukan pertama, **when** satu slot kosong, **then** sistem menghantar tawaran automatik dengan tempoh sah 48 jam.
- **Given** tawaran waiting list tidak disahkan dalam 48 jam, **when** tempoh tamat, **then** tawaran berpindah kepada peserta seterusnya dan rekod peserta asal ditanda `luput`.
- **Given** peserta hadir ≥ min_attendance_pct dan melengkapkan penilaian, **when** kursus ditanda selesai, **then** sijil digital dijana automatik (Fasa 2).
- **Given** kursus telah bermula, **when** admin cuba delete, **then** sistem menolak dan mencadangkan cancel dengan audit trail.
- **Given** dua tempahan pada fasiliti, tarikh dan masa sama, **when** tempahan kedua dihantar, **then** sistem menolak dengan mesej konflik dan memaparkan slot alternatif.
- **Given** QR token sesi telah melebihi 60 saat, **when** peserta cuba check-in dengan token lama, **then** check-in ditolak dan peserta diminta imbas QR semasa.

---

## 18. Risiko & mitigasi (BAHARU — v2.0)

| Risiko | Impak | Mitigasi |
|---|---|---|
| Kegagalan hardware EliteDesk (single point of failure) | Sistem down, potensi hilang data | Backup nightly ke R2 + ujian restore bulanan + RTO 1 hari (restore ke VPS sementara) + UPS |
| Bekalan elektrik / internet pejabat terputus | Downtime | UPS + SLA availability yang jujur (97%) + status page luaran (Uptime Kuma di VPS) |
| Isu governance data pada server tidak rasmi | Audit/teguran | Framing rasmi sebagai pilot, minimakan data sensitif (tiada IC penuh), pelan migrasi ke infra rasmi didokumentasi |
| Adoption rendah (staf selesa cara lama) | Sistem terbiar | Rollout berperingkat, champion setiap negeri, latihan pengguna, WhatsApp/Telegram support group, UI Bahasa Melayu sepenuhnya |
| Data Excel sedia ada kotor/tidak konsisten | Migrasi tergendala | Template CSV + import wizard dengan validation + tanggungjawab cleansing diagihkan ke negeri |
| Spike pendaftaran kursus popular | Server perlahan/timeout | Rate limiting + queue page + pendaftaran dibuka berperingkat mengikut negeri |
| Kos API AI (Fasa 3) tidak dibajetkan | Fasa 3 tergantung | Kelulusan bajet API sebagai pre-requisite Fasa 3 |
| Pergantungan kepada seorang pembangun | Bus factor = 1 | Dokumentasi dalam repo (README per modul), seed data, runbook operasi server |

---

## 19. Repository documentation structure

```
/docs
  /prd            → dokumen ini + changelog
  /architecture   → gambarajah deployment, ERD, keputusan teknikal (ADR)
  /runbook        → SOP server: deploy, backup, restore, troubleshooting
  /migration      → template CSV, panduan import, log migrasi
  /user-guide     → panduan pengguna per role (PDF/video)
/README.md        → quickstart pembangun
```

---

## 20. Penutup

Dokumen v2.0 ini melengkapkan draf asal dengan keputusan teknikal yang telah dimuktamadkan (stack, hosting on-premise pilot, PWA mobile-first), business rules yang lengkap, pelan migrasi data, NFR yang realistik terhadap hardware sebenar, dan pengurusan risiko. Ia sedia dijadikan input terus kepada Claude Code untuk memulakan Fasa 0.

**Tindakan sebelum development bermula:**

1. Sahkan angka skala (Seksyen 3) dengan Bahagian Latihan.
2. Muktamadkan nama sistem dan domain.
3. Perolehi UPS untuk server.
4. Sediakan template CSV dan mulakan cleansing data pilot (boleh selari dengan Fasa 0).
5. Persetujui framing "pilot/PoC" dengan pihak pengurusan Bahagian Latihan.
