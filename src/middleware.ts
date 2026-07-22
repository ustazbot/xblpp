import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { getLandingPath, hasAdminLandingRole } from "@/lib/rbac";
import { externalUrlFor, isApexHost, resolveInternalPath } from "@/lib/host";

// Guna authConfig terus (edge-safe, tiada Credentials provider/DB import) —
// JANGAN import "@/lib/auth" di sini, ia bawa driver Postgres (Node-only).
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const host = req.headers.get("host") ?? req.nextUrl.host;
  const { pathname: rawPathname } = req.nextUrl;

  // Apex (blppkemas.com root sahaja) — placeholder awam, tiada auth langsung.
  // Rujuk src/lib/host.ts untuk kenapa ni no-op pada domain lama.
  if (isApexHost(host) && rawPathname === "/") {
    return NextResponse.rewrite(new URL("/apex", req.url));
  }

  // pathname dari sini ialah laluan DALAMAN (lepas prefix ikut subdomain,
  // rujuk src/lib/host.ts). Semua guard di bawah beroperasi atas ni supaya
  // logik sama merentas domain lama & subdomain baharu.
  const pathname = resolveInternalPath(host, rawPathname);
  const session = req.auth;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const redirectTo = (internalPath: string) =>
    NextResponse.redirect(externalUrlFor(req, internalPath));

  if (!session?.user) {
    if (isPublicPath) return rewriteIfNeeded(req, rawPathname, pathname);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", rawPathname);
    return NextResponse.redirect(loginUrl);
  }

  const { roles, forcePasswordChange } = session.user;

  // Force-change belum selesai — sekat semua laluan lain (Langkah 4 hanya
  // tegaskan ini di dalam page reset-password sendiri; middleware kuatkuasa
  // merentas SEMUA route mulai sini).
  if (forcePasswordChange && pathname !== "/reset-password") {
    return redirectTo("/reset-password");
  }

  if (isPublicPath) {
    return redirectTo(getLandingPath(roles));
  }

  // Landing dua pintu ("/") khusus admin/PIC/Pengarah — peserta/penceramah
  // terus ke portal, tak nampak dua-pintu langsung (PRD Seksyen 7). Pada
  // subdomain baharu, "/" dah diselesaikan ke /aset atau /latihan/portal
  // oleh resolveInternalPath (subdomain ITU pilihan sistem) — check ni jadi
  // relevan hanya untuk domain lama (blpp.gerakops.com).
  if (pathname === "/" && !hasAdminLandingRole(roles)) {
    return redirectTo("/latihan/portal");
  }

  if (pathname.startsWith("/admin") && !roles.some((r) => r.code === "hq_admin")) {
    return redirectTo(getLandingPath(roles));
  }

  const isGuardedAsetOrLatihan =
    pathname.startsWith("/aset") ||
    (pathname.startsWith("/latihan") && !pathname.startsWith("/latihan/portal"));
  if (isGuardedAsetOrLatihan && !hasAdminLandingRole(roles)) {
    return redirectTo("/latihan/portal");
  }

  return rewriteIfNeeded(req, rawPathname, pathname);
});

// Laluan dalaman ("/aset/...", "/latihan/...") berbeza drpd laluan luaran
// (URL browser pada subdomain) — rewrite (bukan redirect) supaya address
// bar kekal bersih (aset.blppkemas.com/tempahan, bukan /aset/tempahan).
function rewriteIfNeeded(req: NextRequest, rawPathname: string, internalPathname: string) {
  if (internalPathname === rawPathname) return NextResponse.next();
  return NextResponse.rewrite(new URL(internalPathname + req.nextUrl.search, req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/health|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
