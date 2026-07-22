import type { NextAuthConfig } from "next-auth";

// Config edge-safe — TIADA import DB/postgres di sini. Digunakan oleh middleware
// (Edge runtime) DAN auth.ts (Node runtime, tambah Credentials provider).
// Rujuk pattern rasmi Auth.js v5 untuk elak bundle driver Postgres (Node-only
// socket API) ke dalam Edge middleware.
export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
    // Idle timeout 30 min (PRD Seksyen 11) — diperbaharui automatik oleh
    // middleware.ts tiap request (auth() touch session pada setiap laluan
    // yang lalui matcher).
    maxAge: 30 * 60,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        // Kosong (host-only) untuk domain lama/dev — TIADA domain di sini
        // sebab browser tolak cookie kalau domain attribute tak match host
        // sebenar. Isi ".blppkemas.com" hanya pada .env domain baharu supaya
        // session dikongsi merentas aset./lms. (rujuk EXECUTION PLAN Task 1).
        ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
      },
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.forcePasswordChange = user.forcePasswordChange;
        token.roles = user.roles;
      }
      // Session JWT tak refresh sendiri bila DB berubah pertengahan sesi
      // (cth. selepas changePassword() clear forcePasswordChange) — mutation
      // yang perlu ubah claim session WAJIB panggil updateSession() (auth.ts)
      // supaya trigger === "update" ni jalan, elak redirect loop force-change.
      if (trigger === "update" && session?.user) {
        if (typeof session.user.forcePasswordChange === "boolean") {
          token.forcePasswordChange = session.user.forcePasswordChange;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.forcePasswordChange = token.forcePasswordChange;
      session.user.roles = token.roles;
      return session;
    },
  },
} satisfies NextAuthConfig;
