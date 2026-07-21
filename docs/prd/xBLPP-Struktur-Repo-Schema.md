# xBLPP — Struktur Repo & Schema Database

**Dokumen teknikal pelengkap PRD v3.1 — input terus untuk Claude Code (Fasa 0)**

---

## 0. Konteks server (VPS dikongsi dengan 5 client site sedia ada — disahkan Julai 2026)

VPS Contabo Cloud VPS 10 SSD (3 vCPU / 7.8GB / 145GB), **dikongsi aktif dengan 5 client site** (bukan idle macam andaian awal). Semakan kapasiti Langkah 1: 6.2GB available, 87/100 slot Postgres connection baki — selamat untuk xBLPP.

| Item | Peruntukan |
|---|---|
| DB | `gerakops_pg` (Postgres 16 dalam Docker) — DB `xblpp_prod` + `xblpp_staging`, role `xblpp_app` akses terhad 2 DB sahaja |
| Credential | `/opt/xblpp/secrets/pg_app.env` (root-only, 600) |
| App | `/opt/xblpp/clients/{prod,staging}` — docker-compose per environment, **isolation dari 5 client lain** |
| Storan fail | `/var/xblpp/files` (dokumen < 10MB, local disk) |
| Reverse proxy | **Caddy** (bukan Nginx — ikut infra sedia ada), vhost `blpp.gerakops.com` (prod) + `staging-blpp.gerakops.com` (staging), TLS auto-provisioned |
| Firewall | ufw (22/80/443 sahaja) + fail2ban — sedia ada, tidak diubah |
| ⚠ Watch-item | `max_connections` Postgres (100) dikongsi SEMUA client + xBLPP. Re-check bilangan connection aktif lepas xBLPP prod jalan dengan traffic sebenar, terutama waktu puncak pendaftaran (100-300 concurrent) |

---

## 1. Struktur repo (satu Next.js app, BUKAN turborepo)

**Keputusan:** walaupun disebut "monorepo", untuk solo dev + satu app Next.js, kita TIDAK guna turborepo/nx/workspaces — overhead tooling tanpa faedah. Satu app Next.js dengan pemisahan folder yang berdisiplin sudah memadai dan lebih mudah di-maintain.

```
xblpp/
├── .github/
│   └── workflows/
│       └── deploy.yml              # SSH deploy: pull → install → build → migrate → restart
├── docs/
│   ├── prd/                        # PRD v2.0 + v3.1 + changelog
│   ├── runbook/                    # SOP server: deploy, backup, restore, troubleshooting
│   └── adr/                        # Architecture Decision Records (1 fail per keputusan besar)
├── drizzle/                        # Output migration Drizzle Kit (SQL) — commit ke repo
├── scripts/
│   ├── seed-dev.ts                 # Dummy content untuk ujian (PRD 8.4)
│   ├── seed-pilot.ts               # Data sebenar 1 negeri sebelum demo
│   └── backup.sh                   # pg_dump + rclone ke R2 (dipasang sebagai cron)
├── public/                         # PWA manifest, icons
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/              # Satu borang login (email sahaja)
│   │   │   └── reset-password/
│   │   ├── (landing)/
│   │   │   └── page.tsx            # Dua pintu: Aset / Latihan (ikut role) — admin/PIC sahaja
│   │   ├── aset/                   # SISTEM 1 — Pengurusan Aset & Premis
│   │   │   ├── premis/             # CRUD venue + facility
│   │   │   ├── tempahan/           # Booking + calendar + conflict
│   │   │   └── penyelenggaraan/
│   │   ├── latihan/                # SISTEM 2 — Pengurusan Latihan
│   │   │   ├── kursus/             # CRUD kursus/program + modul online
│   │   │   ├── pendaftaran/        # Permohonan, kelulusan, waiting list
│   │   │   ├── kehadiran/          # Sesi QR + check-in
│   │   │   ├── penceramah/
│   │   │   ├── kuiz/
│   │   │   └── portal/             # View peserta (mobile-first): kursus saya, QR saya, sijil
│   │   ├── admin/                  # Konfigurasi sistem, import wizard, pengurusan user
│   │   └── api/                    # Route handlers (rujuk PRD v2.0 Seksyen 12)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui
│   │   ├── aset/
│   │   ├── latihan/
│   │   └── shared/                 # Table, form, calendar, QR scanner, dsb.
│   ├── db/
│   │   ├── index.ts                # Drizzle client + pool (max ~20 connection aplikasi)
│   │   └── schema/
│   │       ├── core.ts             # users, roles, notifications, audit_logs, import_logs
│   │       ├── aset.ts             # venues, facilities, venue_bookings
│   │       ├── latihan.ts          # courses, registrations, attendance, trainers, quizzes...
│   │       └── enums.ts            # Semua pgEnum berpusat
│   ├── lib/
│   │   ├── auth.ts                 # Auth.js config (Credentials: email + password)
│   │   ├── rbac.ts                 # Permission matrix + helper `can(user, action, resource)`
│   │   ├── audit.ts                # Helper log mutasi (WAJIB setiap mutation)
│   │   ├── notify.ts               # In-app + email + Telegram (satu interface)
│   │   ├── storage.ts              # Abstraction: local disk / R2 (presigned URL)
│   │   └── validators/             # Zod schemas per modul
│   └── constants/
│       └── ms.ts                   # SEMUA string UI Bahasa Melayu (sedia untuk i18n)
├── drizzle.config.ts
├── ecosystem.config.js             # PM2 (atau unit systemd dalam docs/runbook)
└── .env.example                    # Semua env var didokumentasi, termasuk NEXT_PUBLIC_BASE_URL
```

**Rules penting struktur:**
- Kod Sistem 1 tidak import dari `latihan/`, dan sebaliknya — komunikasi antara sistem hanya melalui `db/schema` (FK) dan `lib/` shared. Elak coupling.
- `constants/ms.ts` — TIADA string UI hardcoded dalam component.
- Server Components default; `"use client"` hanya untuk interaktiviti (borang, QR scanner, calendar).

---

## 2. Schema Postgres — 3 namespace

```sql
CREATE SCHEMA core;     -- shared: identiti, akses, notifikasi, audit
CREATE SCHEMA aset;     -- Sistem 1
CREATE SCHEMA latihan;  -- Sistem 2
```

FK antara schema DIBENARKAN (cth. `latihan.course_sessions.facility_id → aset.facilities.id`).

### 2.1 `core` — jadual shared

| Table | Fungsi | Kolum penting |
|---|---|---|
| `core.users` | Satu table untuk SEMUA (admin BLPP + peserta + penceramah) | `id uuid PK`, `email varchar(255) UNIQUE NOT NULL`, `password_hash`, `nama`, `telefon`, `avatar_path`, `negeri_id`, `daerah_id`, `bahagian`, `jawatan`, `is_penceramah_luar bool default false`, `status enum(aktif/digantung/tidak_aktif)`, `force_password_change bool`, timestamps + soft delete. ⚠ **v3.1.1: `no_pekerja` DIGUGURKAN** — semua kategori user tiada No. Pekerja rasmi, email jadi satu-satunya login identifier |
| `core.roles` | Definisi 7 role (PRD v2.0 S.8) | `id`, `code enum(hq_admin/admin_negeri/admin_daerah/pic_premis/penceramah/peserta/pengarah)`, `nama` |
| `core.user_roles` | Many-to-many + skop | `user_id FK`, `role_id FK`, `negeri_id NULL`, `daerah_id NULL`, `venue_id NULL` (skop PIC) |
| `core.negeri` / `core.daerah` | Lookup lokasi | Seed dari senarai rasmi |
| `core.notifications` | In-app | `user_id`, `title`, `body`, `link`, `channel enum(in_app/email/telegram)`, `read_at`, `sent_at` |
| `core.audit_logs` | SEMUA mutasi | `id`, `user_id`, `action`, `entity_type`, `entity_id`, `before jsonb`, `after jsonb`, `ip`, `created_at`. **Append-only, tiada UPDATE/DELETE** |
| `core.import_logs` | Import wizard | `file_name`, `entity`, `total_rows`, `success_rows`, `failed_rows jsonb`, `imported_by` |
| `core.settings` | Konfigurasi sistem | key-value jsonb, HQ admin sahaja |
| `core.user_service_records` **(v3.1.1)** | Data sensitif rekod perkhidmatan + **pengecam rasmi rekod latihan/sijil** (gantikan No. Pekerja yang digugurkan) | `id`, `user_id FK UNIQUE → core.users`, `ic_encrypted bytea` (pgcrypto `pgp_sym_encrypt`), `ic_hash varchar(64) UNIQUE NOT NULL` (SHA-256 deterministic — untuk dedup/lookup TANPA decrypt, sebab `pgp_sym_encrypt` non-deterministic dan tak boleh UNIQUE terus), `ic_last4 varchar(4)` (paparan masked), `updated_at`, `updated_by`. **RBAC: lihat penuh (interaktif) HANYA HQ Admin; decrypt oleh proses sistem (penjanaan sijil) dibenarkan tapi WAJIB audit log**

**Nota enkripsi IC:** kunci `pgcrypto` disimpan `/opt/xblpp/secrets/pg_app.env` (sama root-only pattern macam credential DB), BUKAN dalam kod atau `.env` repo. Contoh query:

```sql
-- Semak duplikat dulu (SEBELUM insert — guna hash, bukan decrypt)
SELECT id FROM core.user_service_records WHERE ic_hash = encode(digest($2, 'sha256'), 'hex');

-- Simpan (Langkah 4/7, bila borang rekod perkhidmatan dibina)
INSERT INTO core.user_service_records (user_id, ic_encrypted, ic_hash, ic_last4)
VALUES (
  $1,
  pgp_sym_encrypt($2, current_setting('app.ic_encryption_key')),
  encode(digest($2, 'sha256'), 'hex'),
  right($2, 4)
);

-- Baca masked (default, semua role yang dibenarkan lihat rekod)
SELECT ic_last4 FROM core.user_service_records WHERE user_id = $1;

-- Decrypt penuh (HQ Admin interaktif ATAU proses sistem penjanaan sijil — WAJIB audit log selepas)
SELECT pgp_sym_decrypt(ic_encrypted, current_setting('app.ic_encryption_key'))
FROM core.user_service_records WHERE user_id = $1;
```

**Nota `digest()`:** fungsi ni dari extension `pgcrypto` yang sama (`digest(data, 'sha256')`) — tiada extension tambahan diperlukan.

**Nota auth:** login query = `WHERE email = $1 AND deleted_at IS NULL`. `email` UNIQUE NOT NULL.

### 2.2 `aset` — Sistem 1

| Table | Kolum penting |
|---|---|
| `aset.venues` | `id`, `nama`, `jenis enum(akademi/ilk/plk/pkm)`, `alamat`, `negeri_id FK`, `daerah_id FK`, `google_maps_url`, `pic_user_id FK core.users`, `thumbnail_path` (local), `gallery jsonb` (R2 keys), `status enum(aktif/tutup)`, `search_vector tsvector generated` |
| `aset.facilities` | `id`, `venue_id FK`, `nama`, `jenis enum(dewan/bilik_seminar/makmal/asrama/lain)`, `kapasiti int`, `amenities jsonb`, `status enum(aktif/maintenance/tutup)`, `maintenance_until date NULL` |
| `aset.venue_bookings` | `id`, `facility_id FK`, `pemohon_id FK core.users`, `tujuan text NOT NULL`, `anggaran_peserta int NOT NULL`, `mula timestamptz`, `tamat timestamptz`, `recurrence_rule jsonb NULL` (mingguan/bulanan), `parent_booking_id FK NULL` (instance recurring), `course_id FK latihan.courses NULL` (jika tempahan untuk kursus), `status enum(menunggu/diluluskan/ditolak/dibatalkan/perlu_pindah)`, `sebab_tolak text`, `diluluskan_oleh FK`, timestamps |

**Constraint conflict (kritikal — enforce di DB, bukan hanya aplikasi):**

```sql
-- btree_gist extension diperlukan
ALTER TABLE aset.venue_bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    facility_id WITH =,
    tstzrange(mula, tamat) WITH &&
  ) WHERE (status IN ('menunggu','diluluskan'));
```

Aplikasi tetap buat semakan konflik dulu (untuk papar slot alternatif yang mesra pengguna), tetapi constraint DB ialah lapisan terakhir yang menjamin tiada race condition semasa 2 tempahan serentak.

### 2.3 `latihan` — Sistem 2

| Table | Kolum penting |
|---|---|
| `latihan.course_categories` | Taxonomy terkawal (HQ admin) |
| `latihan.courses` | Ikut spesifikasi PRD v2.0 S.11 penuh + `delivery_mode enum(fizikal/online_live/online_rakaman/hybrid)`, `passing_score int NULL` |
| `latihan.course_sessions` | `id`, `course_id FK`, `tarikh`, `masa_mula`, `masa_tamat`, `facility_id FK aset.facilities NULL` (fizikal), `delivery_mode`, `live_platform enum NULL`, `live_url text NULL`, `recording_url text NULL`, `qr_secret varchar` (jana token 60s) |
| `latihan.registrations` | `id`, `course_id FK`, `user_id FK`, `status enum(mohon/disokong/diluluskan/ditolak/tarik_diri/luput/arkib)`, `sebab_tolak`, `sebab_tarik_diri`, `imported_legacy bool default false`, timestamps. UNIQUE(course_id, user_id) |
| `latihan.waiting_list` | `id`, `course_id FK`, `user_id FK`, `position int`, `offered_at timestamptz NULL`, `offer_expires_at timestamptz NULL` (48 jam), `status enum(menunggu/ditawar/disahkan/luput)` |
| `latihan.attendance` | `id`, `session_id FK`, `user_id FK`, `method enum(qr/manual/urus_setia)`, `checked_in_at`, `override_by FK NULL`, `override_sebab text NULL`. UNIQUE(session_id, user_id) |
| `latihan.trainers` | Profil penceramah (extend `core.users` via `user_id FK UNIQUE`), `bidang jsonb`, `resume_path`, `video_intro_url` (YouTube) |
| `latihan.trainer_unavailability` | `trainer_id FK`, `tarikh_mula date`, `tarikh_tamat date`, `sebab` — ketersediaan dikira dari kalendar ini + assignment |
| `latihan.trainer_assignments` | `trainer_id FK`, `course_id FK`, `session_id FK NULL`, `status enum(dijemput/terima/tolak/luput)`, `respond_by date` (3 hari bekerja), timestamps |
| `latihan.course_modules` | `id`, `course_id FK`, `title`, `youtube_video_id varchar(20)`, `duration_minutes`, `order_index`, `status enum(draf/published)` |
| `latihan.quizzes` | `id`, `course_id FK`, `passing_score int`, `questions jsonb`, `attempts_allowed int default 3` |
| `latihan.quiz_attempts` | `id`, `quiz_id FK`, `user_id FK`, `answers jsonb`, `score int`, `passed bool`, `attempted_at` |

Fasa 2 (rangka siap, implement kemudian): `certificates`, `assessments`, `competencies`, `repository_items`.

---

## 3. Konvensyen Drizzle (contoh kod rujukan)

```ts
// src/db/schema/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["aktif", "digantung", "tidak_aktif"]);
export const deliveryModeEnum = pgEnum("delivery_mode", ["fizikal", "online_live", "online_rakaman", "hybrid"]);
export const bookingStatusEnum = pgEnum("booking_status", ["menunggu", "diluluskan", "ditolak", "dibatalkan", "perlu_pindah"]);
// ... semua enum berpusat di sini
```

```ts
// src/db/schema/core.ts (petikan)
import { pgSchema, uuid, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { userStatusEnum } from "./enums";
import { sql } from "drizzle-orm";

export const core = pgSchema("core");

export const users = core.table("users", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),   // PG18 native; jika PG16, guna extension pg_uuidv7 atau jana di aplikasi
  email: varchar("email", { length: 255 }).notNull().unique(),  // v3.1.1: satu-satunya login identifier
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  nama: varchar("nama", { length: 150 }).notNull(),
  telefon: varchar("telefon", { length: 20 }),
  avatarPath: varchar("avatar_path", { length: 255 }),
  negeriId: uuid("negeri_id"),
  daerahId: uuid("daerah_id"),
  bahagian: varchar("bahagian", { length: 100 }),
  jawatan: varchar("jawatan", { length: 100 }),
  isPenceramahLuar: boolean("is_penceramah_luar").notNull().default(false),
  status: userStatusEnum("status").notNull().default("aktif"),
  forcePasswordChange: boolean("force_password_change").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
});
```

**Nota uuid v7:** PG16 tiada `uuidv7()` native. Pilihan: (a) jana di aplikasi dengan pakej `uuidv7` (paling simple, portable), atau (b) extension. **Keputusan: jana di aplikasi** — elak dependency extension tambahan, lebih portable ke server HQ.

**Rules migration:**
- Semua perubahan schema melalui `drizzle-kit generate` → SQL file di `/drizzle` → commit → `drizzle-kit migrate` semasa deploy.
- TIADA `ALTER TABLE` manual di production.
- Constraint EXCLUDE (conflict booking) ditulis sebagai custom SQL dalam migration file (Drizzle belum support EXCLUDE secara native — ini pengecualian yang didokumentasi).
- **`pgcrypto` extension** (untuk enkripsi IC, `core.user_service_records`) diaktifkan dalam migration pertama: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

---

## 4. RBAC — pendekatan implement

```ts
// src/lib/rbac.ts — konsep
type Action = "create" | "read" | "update" | "delete" | "approve" | "export";
type Resource = "course" | "registration" | "venue" | "facility" | "booking" | "trainer" | "user" | ...;

// Matrix dari PRD v2.0 S.8 dikodkan sebagai data, bukan if-else bersepah:
const PERMISSIONS: Record<RoleCode, Partial<Record<Resource, Action[]>>> = { ... };

// Skop (negeri/daerah/venue) disemak berasingan:
export async function can(user: SessionUser, action: Action, resource: Resource, target?: { negeriId?: string; daerahId?: string; venueId?: string }): Promise<boolean>
```

- Setiap route handler: `zod parse → can() check → mutasi → audit log` — urutan WAJIB, tiada pengecualian.
- Middleware Next.js untuk guard route group: `/aset/*` dan `/latihan/*` (kecuali `/latihan/portal` untuk peserta), `/admin/*` untuk HQ.
- Role-based redirect selepas login: admin/PIC → landing dua pintu; peserta/penceramah → `/latihan/portal`.

---

## 5. Deploy pipeline (GitHub Actions → SSH → Docker)

```yaml
# .github/workflows/deploy.yml — konsep
# Trigger: push tag v* (production, /opt/xblpp/clients/prod) /
#          push branch staging (staging, /opt/xblpp/clients/staging)
# Steps: SSH ke VPS → git pull di folder client berkaitan →
#        docker compose build → docker compose run --rm app npx drizzle-kit migrate →
#        docker compose up -d --force-recreate app
# Guard: deploy staging DILARANG 8am–6pm hari bekerja (semak masa dalam script)
```

**Nota isolation:** setiap environment (`prod`/`staging`) container berasingan dalam folder client masing-masing (`/opt/xblpp/clients/{prod,staging}`) — ikut pattern 5 client sedia ada pada VPS ni. DB tetap kongsi instance `gerakops_pg`, hanya schema/DB name berbeza (`xblpp_prod` vs `xblpp_staging`).

Rollback: `git checkout <tag sebelumnya>` + build semula. Migration yang merosakkan data → restore dari backup malam (RPO 24 jam) — sebab itu migration destruktif (DROP/ALTER kolum berisi data) WAJIB ada langkah backup manual sebelum deploy.

---

## 6. Urutan kerja Fasa 0 (checklist untuk Claude Code)

1. Provision atas VPS sedia ada: user sistem `xblpp`, direktori `/var/xblpp`, DB `xblpp_prod` + `xblpp_staging`, Nginx vhost, ufw semak (80/443/SSH sahaja), fail2ban.
2. Skeleton Next.js 14 + TypeScript strict + Tailwind + shadcn/ui + Drizzle mengikut struktur Seksyen 1.
3. Schema `core` penuh + migration pertama + seed `negeri`/`daerah`/`roles`.
4. Auth.js Credentials (email + password) + argon2id + lockout + force-change + session 30 min idle.

**⚠ Migration tambahan WAJIB SEBELUM Langkah 4 (v3.1.1 — schema fix):**

Langkah 3 sudah *applied* ke `xblpp_prod` + `xblpp_staging` dengan `core.users.no_pekerja UNIQUE NOT NULL`. Sebab tiada data user sebenar lagi (baru seed rujukan: 7 roles, 16 negeri, 128 daerah — bukan rekod user), migration pembetulan **selamat** dijalankan sekarang:

```sql
-- Migration 0001_drop_no_pekerja.sql (generate via drizzle-kit selepas kemaskini schema/core.ts)
ALTER TABLE core.users DROP COLUMN no_pekerja;
ALTER TABLE core.users ALTER COLUMN email SET NOT NULL;

-- Tambah ic_hash pada core.user_service_records (jika Langkah 3 belum ada kolum ni)
ALTER TABLE core.user_service_records ADD COLUMN ic_hash varchar(64) UNIQUE NOT NULL;
```

Jalankan `drizzle-kit generate` (bukan tulis SQL manual terus ke prod) supaya migration file tersimpan dalam `/drizzle` dan konsisten dengan rule "tiada ALTER TABLE manual." Apply ke staging dulu, sahkan idempotency re-run macam Langkah 3, baru apply prod.
5. RBAC lib + middleware + landing dua pintu (role-based redirect).
6. Notification lib (in-app + email + Telegram) — interface dulu, channel email/Telegram boleh stub.
7. Audit log helper + integrasi contoh pada 1 mutation.
8. `scripts/seed-dev.ts` — dummy: 20 user pelbagai role, 3 venue + 8 facility, 5 kursus pelbagai delivery_mode.
9. Backup script + cron + ujian restore pertama (rekod dalam runbook).
10. GitHub Actions deploy workflow + smoke test staging.

Siap #1–#10 = Fasa 0 selesai, masuk Fasa 1a (Sistem Aset penuh).

---

## 7. Urutan kerja Fasa 1a — Sistem 1 (Pengurusan Aset & Premis) penuh

Skop: PRD-KEMAS-Training-Platform-v2.md Modul 2 (baris 291-311) +
PRD-xBLPP-v3.1.md baris 454. Asas sedia ada dari Fasa 0 Langkah 8:
`aset.venues`/`aset.facilities` + seed 7 premis sebenar; `rbac.ts` sudah ada
`booking` sebagai Resource + `approve` sebagai Action, `PERMISSIONS` matrix
untuk venue/facility/booking sudah diisi (Fasa 0, belum disemak semula untuk
keputusan skop di bawah).

**Keputusan skop (disahkan 2026-07-21, sebelum Langkah 1 mula):**
- Create/edit UI untuk venue/facility (Langkah 2) dan dashboard admin
  (Langkah 7) **HANYA** untuk `hq_admin` (nasional) dan `pic_premis` (premis
  sendiri) — BUKAN `admin_negeri`/`admin_daerah`, walaupun PRD asal
  (PRD-KEMAS-Training-Platform-v2.md baris 242) sebut `admin_negeri` = "Manage
  negeri" dan `rbac.ts` `PERMISSIONS` sedia ada bagi `admin_negeri` penuh
  `venue: ALL`/`facility: ALL`. Ini keputusan **skop UI untuk fasa ni sahaja**
  (potongan MVP) — `rbac.ts` TIDAK diubah, `admin_negeri`/`admin_daerah`
  masih ada permission asal, cuma UI create/edit/dashboard tak dibina untuk
  mereka buat masa ni. Kalau ini sepatutnya sekatan permission sebenar
  (bukan sekadar UI), perlu kemaskini `rbac.ts` — belum dibuat, flag untuk
  semakan semula.

**Keputusan skop #2 (disahkan 2026-07-21, selepas Langkah 3, sebelum Langkah 4
— maklumat domain baharu daripada user):**
- Dua JENIS tempahan: `dalaman_kemas` (antara Bahagian HQ/KEMAS Negeri/KEMAS
  Daerah — dihantar oleh Pengarah/Penolong Pengarah/Pegawai KEMAS, dipetakan
  ke role SEDIA ADA `hq_admin`/`admin_negeri`/`admin_daerah`/`pengarah`,
  BUKAN role RBAC baharu) dan `umum` (tempahan terbuka pihak luar, kadar
  sewaan BELUM ditetapkan — di luar skop medan `penyewa*` buat masa ini).
  `pengarah` diberi `booking: create` (sebelum ni hanya `read`) dalam
  `rbac.ts` untuk sokong tempahan dalaman.
- Tempahan umum: staf KEMAS log masuk hantar BAGI PIHAK penyewa luar (medan
  `penyewa_nama`/`penyewa_organisasi`/`penyewa_telefon`/`penyewa_emel` pada
  `venue_bookings`, wajib nama+telefon bila jenis='umum', disahkan Zod
  `.superRefine`) — BUKAN portal awam self-service (sistem ni tiada
  pendaftaran awam, Auth.js Credentials sahaja).
- Kelulusan **dwi-peringkat berurutan WAJIB untuk SEMUA tempahan** (bukan
  setakat >12 bulan): PIC lulus dulu (`menunggu_kelulusan_pic`) -> HQ lulus
  (`menunggu_kelulusan_hq`) -> `diluluskan`. Tolak pada MANA-MANA peringkat
  terus tamat (tak tunggu peringkat lain). Flag `requiresAdminNegeriApproval`
  (>12 bulan) KEKAL sebagai penanda perhatian tambahan semasa semakan HQ,
  BUKAN lagi penentu laluan kelulusan berasingan (Langkah 5 akan detail
  UI/logik penuh).
- Migration `0005_aset_booking_type_dual_approval.sql`: enum `booking_status`
  DICIPTA SEMULA (CREATE TYPE baharu + USING cast + DROP + RENAME), BUKAN
  `ALTER TYPE ADD VALUE` — Postgres larang guna nilai enum baharu dalam
  TRANSAKSI SAMA ia ditambah, dan `drizzle-kit migrate()` SENTIASA gabung
  SEMUA migration pending dalam SATU transaksi (rujuk
  `node_modules/drizzle-orm/pg-core/dialect.cjs`). Cubaan asal (ADD VALUE +
  fail berasingan) gantung/gagal diam semasa ujian sebenar — details penuh
  dalam komen migration 0005. Rujuk juga ADR 0001 (Fasa 0) untuk kelas isu
  serupa (journal drizzle tak sync realiti).

1. Schema `aset.venue_bookings` + constraint `EXCLUDE` (extension
   `btree_gist`) untuk conflict detection automatik peringkat fasiliti —
   migration, diuji atas throwaway Postgres (tempahan bertindih pada fasiliti
   sama WAJIB ditolak oleh Postgres sendiri, bukan setakat app-layer check).
2. Venue/Facility CRUD UI — create+edit untuk `hq_admin` (nasional) dan
   `pic_premis` (venue sendiri sahaja, ikut skop RBAC); `admin_negeri`/
   `admin_daerah` read-only buat masa ni (rujuk keputusan skop atas).
3. Booking creation flow (server action) — business rules PRD Modul 2:
   jenis tempahan (dalaman_kemas/umum) + tujuan + anggaran peserta wajib;
   tempahan tarikh lampau dilarang; >12 bulan ke hadapan flag perhatian
   tambahan HQ; semakan konflik app-layer (UX awal) + constraint DB
   (backstop). Status awal `menunggu_kelulusan_pic` (kelulusan dwi-peringkat,
   rujuk Keputusan skop #2).
4. Recurring booking (mingguan/bulanan).
5. Approval workflow — kelulusan dwi-peringkat PIC->HQ (rujuk Keputusan skop
   #2), SLA kelulusan 3 hari bekerja per peringkat, eskalasi automatik kalau
   tak bertindak (perlu scheduled check — cron VPS, pattern sama `backup.sh`
   Langkah 9).
6. Maintenance workflow — tanda fasiliti/venue under maintenance, cascade
   notify tempahan sedia ada yang terjejas, status `perlu_pindah`.
7. Dashboard admin (skop `hq_admin` nasional + `pic_premis` premis sendiri
   sahaja, rujuk keputusan skop atas) — statistik (jumlah premis/fasiliti,
   kadar penggunaan), tempahan menunggu kelulusan + countdown SLA, status
   maintenance, aktiviti terkini.
8. Calendar view (harian/mingguan/bulanan, per venue dan per fasiliti) —
   `/api/facilities/{id}/calendar`.
9. Pembatalan tempahan — <3 hari sebelum tarikh guna perlu sebab, direkod
   untuk laporan penggunaan.
10. Wiring notifikasi (`notify.ts`) + audit log (`audit.ts`) merentas semua
    langkah atas — guna helper sedia ada Fasa 0 Langkah 6-7, bukan logik baharu.
11. Ujian end-to-end (seed booking realistik) + deploy staging melalui CI
    pipeline sedia ada (Fasa 0 Langkah 10) + smoke test.

Siap #1–#11 = Fasa 1a selesai.
