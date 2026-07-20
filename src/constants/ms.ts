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
    labelId: "E-mel",
    labelKataLaluan: "Kata Laluan",
    labelKataLaluanBaharu: "Kata Laluan Baharu",
    labelSahkanKataLaluan: "Sahkan Kata Laluan Baharu",
    lupaKataLaluan: "Lupa Kata Laluan?",
    resetKataLaluan: "Set Semula Kata Laluan",
    resetKataLaluanKeterangan:
      "Kata laluan anda perlu ditukar sebelum meneruskan.",
    resetKataLaluanButang: "Kemaskini Kata Laluan",
    resetKataLaluanBerjaya: "Kata laluan berjaya dikemaskini.",
    sedangLog: "Sedang log masuk...",
    ralat: {
      invalid_credentials: "E-mel atau kata laluan salah.",
      locked: "Akaun dikunci sementara akibat terlalu banyak percubaan gagal. Sila cuba semula selepas 15 minit.",
      inactive: "Akaun anda tidak aktif. Hubungi admin.",
      kataLaluanSemasaSalah: "Kata laluan semasa salah.",
      kataLaluanTidakSepadan: "Kata laluan baharu tidak sepadan.",
      kataLaluanTerlaluPendek: "Kata laluan mesti sekurang-kurangnya 10 aksara.",
    },
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
