import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { getLandingPath, hasAdminLandingRole } from "@/lib/rbac";

// Guna authConfig terus (edge-safe, tiada Credentials provider/DB import) —
// JANGAN import "@/lib/auth" di sini, ia bawa driver Postgres (Node-only).
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!session?.user) {
    if (isPublicPath) return NextResponse.next();
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { roles, forcePasswordChange } = session.user;

  // Force-change belum selesai — sekat semua laluan lain (Langkah 4 hanya
  // tegaskan ini di dalam page reset-password sendiri; middleware kuatkuasa
  // merentas SEMUA route mulai sini).
  if (forcePasswordChange && pathname !== "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", req.url));
  }

  if (isPublicPath) {
    return NextResponse.redirect(new URL(getLandingPath(roles), req.url));
  }

  // Landing dua pintu ("/") khusus admin/PIC/Pengarah — peserta/penceramah
  // terus ke portal, tak nampak dua-pintu langsung (PRD Seksyen 7).
  if (pathname === "/" && !hasAdminLandingRole(roles)) {
    return NextResponse.redirect(new URL("/latihan/portal", req.url));
  }

  if (pathname.startsWith("/admin") && !roles.some((r) => r.code === "hq_admin")) {
    return NextResponse.redirect(new URL(getLandingPath(roles), req.url));
  }

  const isGuardedAsetOrLatihan =
    pathname.startsWith("/aset") ||
    (pathname.startsWith("/latihan") && !pathname.startsWith("/latihan/portal"));
  if (isGuardedAsetOrLatihan && !hasAdminLandingRole(roles)) {
    return NextResponse.redirect(new URL("/latihan/portal", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
