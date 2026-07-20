import { pgSchema } from "drizzle-orm/pg-core";

export const core = pgSchema("core");

export const userStatusEnum = core.enum("user_status", [
  "aktif",
  "digantung",
  "tidak_aktif",
]);

export const roleCodeEnum = core.enum("role_code", [
  "hq_admin",
  "admin_negeri",
  "admin_daerah",
  "pic_premis",
  "penceramah",
  "peserta",
  "pengarah",
]);

export const notificationChannelEnum = core.enum("notification_channel", [
  "in_app",
  "email",
  "telegram",
]);
