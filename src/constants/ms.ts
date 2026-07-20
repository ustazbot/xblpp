// Semua string UI Bahasa Melayu — TIADA string hardcoded dalam component.
// Rujuk PRD v2.0 Seksyen 17 (AI coding rules) #7.

export const ms = {
  sistem: {
    nama: "Sistem Pengurusan BLPP KEMAS",
    namaPendek: "xBLPP",
  },
  nav: {
    aset: "Aset & Premis",
    latihan: "Latihan",
    admin: "Pentadbiran",
  },
  auth: {
    login: "Log Masuk",
    labelId: "E-mel atau No. Pekerja",
    labelKataLaluan: "Kata Laluan",
    lupaKataLaluan: "Lupa Kata Laluan?",
    resetKataLaluan: "Set Semula Kata Laluan",
  },
  aset: {
    premis: "Premis",
    tempahan: "Tempahan",
    penyelenggaraan: "Penyelenggaraan",
  },
  latihan: {
    kursus: "Kursus",
    pendaftaran: "Pendaftaran",
    kehadiran: "Kehadiran",
    penceramah: "Penceramah",
    kuiz: "Kuiz",
    portal: "Portal Saya",
  },
  ralat: {
    umum: "Ralat berlaku. Sila cuba semula.",
    tiadaAkses: "Anda tiada akses ke halaman ini.",
  },
} as const;
