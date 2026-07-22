import type { NextRequest } from "next/server";

// Pemetaan hostname domain baharu (aset./lms./staging-*) <-> laluan dalaman
// sedia ada (/aset, /latihan). App kekal path-based dalaman — hanya "alias"
// luaran berubah ikut subdomain. Domain LAMA (blpp.gerakops.com) tak
// disentuh langsung: ROOT_DOMAIN tak match host tu, semua fungsi di bawah
// jadi no-op (pathname/URL dikembalikan verbatim, tingkah laku sedia ada).
const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "";

type Subsystem = "aset" | "latihan";

function stripPort(host: string): string {
  return host.split(":")[0];
}

function isNewDomainHost(host: string): boolean {
  return ROOT_DOMAIN !== "" && stripPort(host).endsWith(ROOT_DOMAIN);
}

export function isApexHost(host: string): boolean {
  return ROOT_DOMAIN !== "" && stripPort(host) === ROOT_DOMAIN;
}

function subdomainLabel(host: string): string | null {
  if (!isNewDomainHost(host) || isApexHost(host)) return null;
  const h = stripPort(host);
  return h.slice(0, h.length - ROOT_DOMAIN.length - 1); // buang ".ROOT_DOMAIN"
}

// "/" root pada subdomain terus masuk subsistem (subdomain ITU pilihan
// sistem) — lms. hala ke /latihan/portal (bukan /latihan, tiada page bare
// lagi sehingga Fasa 1b bina dashboard admin sebenar untuk sistem latihan).
const ROOT_PATH_BY_LABEL: Record<string, string> = {
  aset: "/aset",
  "staging-aset": "/aset",
  lms: "/latihan/portal",
  "staging-lms": "/latihan/portal",
};

const PREFIX_BY_LABEL: Record<string, string> = {
  aset: "/aset",
  "staging-aset": "/aset",
  lms: "/latihan",
  "staging-lms": "/latihan",
};

// Laluan "dikongsi" — tak pernah diprefix ikut host (guard/laman sejagat,
// sama pada setiap subdomain dan domain lama).
const SHARED_PATHS = new Set(["/login", "/reset-password"]);
const SHARED_PREFIXES = ["/admin"];

function isSharedPath(pathname: string): boolean {
  if (SHARED_PATHS.has(pathname)) return true;
  return SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Luaran (laluan dalam URL browser) -> dalaman (laluan fail Next.js sebenar).
export function resolveInternalPath(host: string, pathname: string): string {
  const label = subdomainLabel(host);
  if (!label) return pathname;
  if (isSharedPath(pathname)) return pathname;

  const prefix = PREFIX_BY_LABEL[label];
  if (!prefix) return pathname;
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return pathname;
  if (pathname === "/") return ROOT_PATH_BY_LABEL[label];
  return `${prefix}${pathname}`;
}

function subsystemOf(internalPath: string): Subsystem | null {
  if (internalPath === "/aset" || internalPath.startsWith("/aset/")) return "aset";
  if (internalPath === "/latihan" || internalPath.startsWith("/latihan/")) return "latihan";
  return null;
}

function labelFor(subsystem: Subsystem, staging: boolean): string {
  const base = subsystem === "aset" ? "aset" : "lms";
  return staging ? `staging-${base}` : base;
}

function stripPrefix(internalPath: string, subsystem: Subsystem): string {
  const prefix = subsystem === "aset" ? "/aset" : "/latihan";
  if (internalPath === prefix) return "/";
  return internalPath.slice(prefix.length);
}

// Bina URL redirect yang betul untuk sesuatu laluan dalaman. Domain lama:
// path dikembalikan verbatim (tingkah laku sedia ada, tak berubah). Domain
// baharu: prefix dibuang (URL luaran bersih) DAN redirect SILANG HOST
// automatik bila laluan sasaran kepunyaan subsistem lain drpd host semasa
// (cth. role tanpa akses aset ditolak dari aset.blppkemas.com ke
// lms.blppkemas.com/portal, bukan laluan dalaman yang bakal 404).
export function externalUrlFor(req: NextRequest, internalPath: string): URL {
  const host = req.headers.get("host") ?? req.nextUrl.host;
  const search = req.nextUrl.search;

  const subsystem = subsystemOf(internalPath);
  if (!isNewDomainHost(host) || !subsystem) {
    return new URL(internalPath + search, req.url);
  }

  const label = subdomainLabel(host);
  const currentPrefix = label ? PREFIX_BY_LABEL[label] : null;
  const targetPrefix = subsystem === "aset" ? "/aset" : "/latihan";
  const externalPath = stripPrefix(internalPath, subsystem);

  if (currentPrefix === targetPrefix) {
    return new URL(externalPath + search, req.url);
  }

  const staging = (label ?? "").startsWith("staging-");
  const targetHost = `${labelFor(subsystem, staging)}.${ROOT_DOMAIN}`;
  return new URL(externalPath + search, `https://${targetHost}`);
}
