import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, notifications } from "@/db/schema/core";
import { notificationChannelEnum } from "@/db/schema/enums";

export type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];

export interface NotifyPayload {
  userId: string;
  title: string;
  body: string;
  link?: string;
  channels: NotificationChannel[];
}

// PRD Seksyen 7.1: IC TIDAK BOLEH muncul dalam payload notification/email/
// Telegram dalam apa jua bentuk — guna nama/email sahaja untuk rujuk user.
// Guard ringkas: tolak jika title/body ada corak No. Kad Pengenalan Malaysia
// (6 digit - 2 digit - 4 digit, dengan/tanpa sengkang). Bukan 100% kalis, tapi
// safety-net supaya kesilapan salin-tampel IC ke mesej gagal loud, bukan senyap.
const IC_PATTERN = /\b\d{6}-?\d{2}-?\d{4}\b/;

export function assertNoIcLeak(...texts: string[]): void {
  for (const text of texts) {
    if (IC_PATTERN.test(text)) {
      throw new Error(
        "Payload notifikasi mengandungi corak No. Kad Pengenalan — DILARANG (PRD Seksyen 7.1). " +
          "Guna nama/email sahaja untuk rujuk user dalam mesej.",
      );
    }
  }
}

// ---- Channel senders — interface tetap sama tak kira stub atau live, supaya
// penukaran tak sentuh calling code (notify() / dispatch di bawah). ----

interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface TelegramSender {
  send(chatId: string, text: string): Promise<void>;
}

class StubEmailSender implements EmailSender {
  async send(to: string, subject: string): Promise<void> {
    // Sengaja tak log `body` — tabiat elak log kandungan mesej penuh walaupun
    // stub, sebab mesej production kelak boleh ada maklumat sensitif lain.
    console.log(`[notify:stub:email] to=${to} subject=${JSON.stringify(subject)}`);
  }
}

class NodemailerEmailSender implements EmailSender {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text: body,
    });
  }
}

class StubTelegramSender implements TelegramSender {
  async send(chatId: string): Promise<void> {
    console.log(`[notify:stub:telegram] chatId=${chatId}`);
  }
}

class TelegramBotSender implements TelegramSender {
  async send(chatId: string, text: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      throw new Error(`Telegram sendMessage gagal: ${res.status}`);
    }
  }
}

function getEmailSender(): EmailSender {
  return process.env.SMTP_HOST ? new NodemailerEmailSender() : new StubEmailSender();
}

// Exported (bukan setakat dipakai dalam dispatchTelegram di bawah) — core.users
// tiada telegram_chat_id lagi (linking flow, Fasa 1c), jadi dispatch dalaman
// tak boleh panggil .send() betul-betul sekarang. Factory ni ialah seam siap
// untuk kod Fasa 1c yang akan ada chat ID sebenar — tinggal import & panggil,
// tak perlu tulis semula pemilihan stub/live.
export function getTelegramSender(): TelegramSender {
  return process.env.TELEGRAM_BOT_TOKEN ? new TelegramBotSender() : new StubTelegramSender();
}

// ---- Orkestrasi — satu entry point untuk semua calling code. ----

async function dispatchInApp(payload: NotifyPayload): Promise<void> {
  await db.insert(notifications).values({
    userId: payload.userId,
    title: payload.title,
    body: payload.body,
    link: payload.link,
    channel: "in_app",
    sentAt: new Date(),
  });
}

async function dispatchEmail(payload: NotifyPayload): Promise<void> {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);
  if (!user) return;

  const [row] = await db
    .insert(notifications)
    .values({
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      channel: "email",
    })
    .returning({ id: notifications.id });

  try {
    await getEmailSender().send(user.email, payload.title, payload.body);
    await db.update(notifications).set({ sentAt: new Date() }).where(eq(notifications.id, row.id));
  } catch (err) {
    // Best-effort — kegagalan email tak patut gugurkan seluruh notify() bila
    // channel lain (in-app) dah berjaya. Baris DB kekal tanpa sentAt = belum hantar.
    console.error(`[notify:email] gagal hantar untuk user ${payload.userId}:`, err);
  }
}

async function dispatchTelegram(payload: NotifyPayload): Promise<void> {
  // core.users tiada kolum telegram_chat_id lagi (linking flow — Fasa 1c).
  // Rekod dalam core.notifications supaya kekal dalam inbox in-app/audit,
  // tapi dispatch luaran sentiasa skip sehingga schema ada mapping chat ID.
  await db.insert(notifications).values({
    userId: payload.userId,
    title: payload.title,
    body: payload.body,
    link: payload.link,
    channel: "telegram",
  });
  console.log(
    `[notify:telegram] skip hantar — tiada telegram_chat_id untuk user ${payload.userId} (schema gap, Fasa 1c)`,
  );
}

export async function notify(payload: NotifyPayload): Promise<void> {
  assertNoIcLeak(payload.title, payload.body);

  for (const channel of payload.channels) {
    if (channel === "in_app") await dispatchInApp(payload);
    else if (channel === "email") await dispatchEmail(payload);
    else if (channel === "telegram") await dispatchTelegram(payload);
  }
}
