import {
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  text,
  customType,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import {
  core,
  userStatusEnum,
  roleCodeEnum,
  notificationChannelEnum,
} from "./enums";

// pgcrypto pgp_sym_encrypt() output — bytea, tiada type bawaan drizzle-orm/pg-core.
const bytea = customType<{ data: Buffer }>({
  dataType: () => "bytea",
});

export const negeri = core.table("negeri", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  kod: varchar("kod", { length: 10 }).notNull().unique(),
  nama: varchar("nama", { length: 100 }).notNull(),
});

export const daerah = core.table("daerah", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  negeriId: uuid("negeri_id")
    .notNull()
    .references(() => negeri.id),
  nama: varchar("nama", { length: 100 }).notNull(),
});

export const roles = core.table("roles", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  code: roleCodeEnum("code").notNull().unique(),
  nama: varchar("nama", { length: 100 }).notNull(),
});

export const users = core.table("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  // v3.1.1: no_pekerja digugurkan — semua kategori user tiada No. Pekerja rasmi,
  // email jadi satu-satunya login identifier.
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  nama: varchar("nama", { length: 150 }).notNull(),
  telefon: varchar("telefon", { length: 20 }),
  avatarPath: varchar("avatar_path", { length: 255 }),
  negeriId: uuid("negeri_id").references(() => negeri.id),
  daerahId: uuid("daerah_id").references(() => daerah.id),
  bahagian: varchar("bahagian", { length: 100 }),
  jawatan: varchar("jawatan", { length: 100 }),
  isPenceramahLuar: boolean("is_penceramah_luar").notNull().default(false),
  status: userStatusEnum("status").notNull().default("aktif"),
  forcePasswordChange: boolean("force_password_change").notNull().default(true),
  // Lockout 15 min / 5 percubaan (PRD Seksyen 7) — reset ke 0/null bila login berjaya
  // atau bila lockedUntil sudah lepas dan percubaan seterusnya gagal semula.
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
});

// IC disimpan berasingan dari core.users (bukan lapuk — sengaja kurangkan blast
// radius). Kunci pgcrypto disimpan /opt/xblpp/secrets/, BUKAN dalam kod/repo.
// Rujuk PRD v3.1 Seksyen 7.1. Wiring encrypt/decrypt sebenar: Langkah 4/7.
// v3.1.1: gantikan peranan no_pekerja sebagai pengecam rasmi rekod latihan/sijil.
export const userServiceRecords = core.table("user_service_records", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  icEncrypted: bytea("ic_encrypted").notNull(),
  // pgp_sym_encrypt() non-deterministic — tak boleh UNIQUE atas icEncrypted terus.
  // SHA-256 deterministic untuk dedup/lookup tanpa decrypt (guna digest() dari pgcrypto).
  icHash: varchar("ic_hash", { length: 64 }).notNull().unique(),
  icLast4: varchar("ic_last4", { length: 4 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const userRoles = core.table("user_roles", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  negeriId: uuid("negeri_id").references(() => negeri.id),
  daerahId: uuid("daerah_id").references(() => daerah.id),
  // FK ke aset.facilities ditambah semasa Fasa 1a bila schema `aset` wujud
  // (skop PIC Premis) — uuid biasa buat masa ni, tiada constraint rentas schema lagi.
  venueId: uuid("venue_id"),
});

export const notifications = core.table("notifications", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  link: varchar("link", { length: 255 }),
  channel: notificationChannelEnum("channel").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only — tiada updatedAt/deletedAt. Jangan tambah UPDATE/DELETE pada table ni.
export const auditLogs = core.table("audit_logs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importLogs = core.table("import_logs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  totalRows: integer("total_rows").notNull(),
  successRows: integer("success_rows").notNull(),
  failedRows: jsonb("failed_rows"),
  importedBy: uuid("imported_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = core.table("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});
