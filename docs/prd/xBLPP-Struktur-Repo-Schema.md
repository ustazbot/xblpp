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
│   │   │   ├── login/              # Satu borang login (email ATAU No. Pekerja)
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
│   │   ├── auth.ts                 # Auth.js config (Credentials: email/no_pekerja + password)
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
| `core.users` | Satu table untuk SEMUA (admin BLPP + peserta + penceramah) | `id uuid PK`, `no_pekerja varchar(20) UNIQUE NOT NULL`, `email varchar(255) UNIQUE`, `password_hash`, `nama`, `telefon`, `avatar_path`, `negeri_id`, `daerah_id`, `bahagian`, `jawatan`, `is_penceramah_luar bool default false`, `status enum(aktif/digantung/tidak_aktif)`, `force_password_change bool`, timestamps + soft delete |
| `core.roles` | Definisi 7 role (PRD v2.0 S.8) | `id`, `code enum(hq_admin/admin_negeri/admin_daerah/pic_premis/penceramah/peserta/pengarah)`, `nama` |
| `core.user_roles` | Many-to-many + skop | `user_id FK`, `role_id FK`, `negeri_id NULL`, `daerah_id NULL`, `venue_id NULL` (skop PIC) |
| `core.negeri` / `core.daerah` | Lookup lokasi | Seed dari senarai rasmi |
| `core.notifications` | In-app | `user_id`, `title`, `body`, `link`, `channel enum(in_app/email/telegram)`, `read_at`, `sent_at` |
| `core.audit_logs` | SEMUA mutasi | `id`, `user_id`, `action`, `entity_type`, `entity_id`, `before jsonb`, `after jsonb`, `ip`, `created_at`. **Append-only, tiada UPDATE/DELETE** |
| `core.import_logs` | Import wizard | `file_name`, `entity`, `total_rows`, `success_rows`, `failed_rows jsonb`, `imported_by` |
| `core.settings` | Konfigurasi sistem | key-value jsonb, HQ admin sahaja |
| `core.user_service_records` **(BAHARU — v3.1)** | Data sensitif rekod perkhidmatan, berasingan dari `core.users` sengaja untuk kurangkan blast radius | `id`, `user_id FK UNIQUE → core.users`, `ic_encrypted bytea` (pgcrypto `pgp_sym_encrypt`), `ic_last4 varchar(4)` (untuk paparan masked tanpa decrypt), `updated_at`, `updated_by`. **RBAC: HANYA HQ Admin boleh query/decrypt table ini** — enforce di `lib/rbac.ts`, bukan setakat UI hiding. Setiap decrypt → `core.audit_logs` |

**Nota enkripsi IC:** kunci `pgcrypto` disimpan `/opt/xblpp/secrets/pg_app.env` (sama root-only pattern macam credential DB), BUKAN dalam kod atau `.env` repo. Contoh query:

```sql
-- Simpan (Langkah 4/7, bila borang rekod perkhidmatan dibina)
INSERT INTO core.user_service_records (user_id, ic_encrypted, ic_last4)
VALUES ($1, pgp_sym_encrypt($2, current_setting('app.ic_encryption_key')), right($2, 4));

-- Baca masked (default, semua role yang dibenarkan lihat rekod)
SELECT ic_last4 FROM core.user_service_records WHERE user_id = $1;

-- Decrypt penuh (HQ Admin sahaja, WAJIB audit log selepas query ni)
SELECT pgp_sym_decrypt(ic_encrypted, current_setting('app.ic_encryption_key'))
FROM core.user_service_records WHERE user_id = $1;
```

**Nota auth:** login query = `WHERE (email = $1 OR no_pekerja = $1) AND deleted_at IS NULL`. Kedua-dua kolum ada UNIQUE index — pastikan format `no_pekerja` tidak boleh menyerupai email (validation semasa daftar).

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
  noPekerja: varchar("no_pekerja", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
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
4. Auth.js Credentials (email ATAU no_pekerja) + argon2id + lockout + force-change + session 30 min idle.
5. RBAC lib + middleware + landing dua pintu (role-based redirect).
6. Notification lib (in-app + email + Telegram) — interface dulu, channel email/Telegram boleh stub.
7. Audit log helper + integrasi contoh pada 1 mutation.
8. `scripts/seed-dev.ts` — dummy: 20 user pelbagai role, 3 venue + 8 facility, 5 kursus pelbagai delivery_mode.
9. Backup script + cron + ujian restore pertama (rekod dalam runbook).
10. GitHub Actions deploy workflow + smoke test staging.

Siap #1–#10 = Fasa 0 selesai, masuk Fasa 1a (Sistem Aset penuh).
