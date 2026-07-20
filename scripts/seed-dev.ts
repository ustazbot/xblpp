// Seed dev — Langkah 3: roles + negeri + daerah (rujuk PRD Seksyen 8.4).
// Dummy business data (user/venue/kursus) ditambah Langkah 8, di bawah seedReference().
//
// ⚠ Data daerah Sabah/Sarawak: senarai major district sahaja (bukan senarai
// rasmi bahagian/daerah penuh) — SAHKAN dengan sumber rasmi BLPP/JPM sebelum
// go-live. Negeri Semenanjung + WP disahkan lebih yakin (struktur stabil, biasa).

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { negeri, daerah, roles, users, userRoles } from "@/db/schema/core";
import { venues, facilities } from "@/db/schema/aset";
import { courseCategories, courses, courseSessions } from "@/db/schema/latihan";
import { hashPassword } from "@/lib/password";

const ROLES: { code: (typeof roles.$inferInsert)["code"]; nama: string }[] = [
  { code: "hq_admin", nama: "HQ Admin" },
  { code: "admin_negeri", nama: "Admin Negeri" },
  { code: "admin_daerah", nama: "Admin Daerah" },
  { code: "pic_premis", nama: "PIC Premis" },
  { code: "penceramah", nama: "Penceramah" },
  { code: "peserta", nama: "Peserta" },
  { code: "pengarah", nama: "Pengarah" },
];

const NEGERI_DAERAH: { kod: string; nama: string; daerah: string[] }[] = [
  {
    kod: "JHR",
    nama: "Johor",
    daerah: [
      "Johor Bahru", "Kota Tinggi", "Mersing", "Kluang", "Batu Pahat",
      "Muar", "Segamat", "Pontian", "Kulai", "Tangkak",
    ],
  },
  {
    kod: "KDH",
    nama: "Kedah",
    daerah: [
      "Kota Setar", "Kubang Pasu", "Padang Terap", "Langkawi", "Baling",
      "Bandar Baharu", "Kuala Muda", "Kulim", "Pendang", "Sik", "Yan", "Pokok Sena",
    ],
  },
  {
    kod: "KTN",
    nama: "Kelantan",
    daerah: [
      "Kota Bharu", "Pasir Mas", "Tumpat", "Pasir Puteh", "Bachok",
      "Kuala Krai", "Machang", "Tanah Merah", "Jeli", "Gua Musang",
    ],
  },
  { kod: "MLK", nama: "Melaka", daerah: ["Melaka Tengah", "Alor Gajah", "Jasin"] },
  {
    kod: "NSN",
    nama: "Negeri Sembilan",
    daerah: ["Seremban", "Port Dickson", "Rembau", "Kuala Pilah", "Jelebu", "Jempol", "Tampin"],
  },
  {
    kod: "PHG",
    nama: "Pahang",
    daerah: [
      "Kuantan", "Kuala Lipis", "Bentong", "Raub", "Jerantut",
      "Temerloh", "Bera", "Pekan", "Rompin", "Maran", "Cameron Highlands",
    ],
  },
  {
    kod: "PNG",
    nama: "Pulau Pinang",
    daerah: [
      "Timur Laut", "Barat Daya", "Seberang Perai Utara",
      "Seberang Perai Tengah", "Seberang Perai Selatan",
    ],
  },
  {
    kod: "PRK",
    nama: "Perak",
    daerah: [
      "Kinta", "Kuala Kangsar", "Larut Matang dan Selama", "Manjung", "Hilir Perak",
      "Batang Padang", "Kerian", "Perak Tengah", "Muallim", "Hulu Perak", "Kampar", "Bagan Datuk",
    ],
  },
  { kod: "PLS", nama: "Perlis", daerah: ["Perlis"] },
  {
    kod: "SBH",
    nama: "Sabah",
    daerah: [
      "Kota Kinabalu", "Sandakan", "Tawau", "Lahad Datu", "Keningau", "Papar",
      "Penampang", "Kudat", "Beaufort", "Ranau", "Semporna", "Kota Belud",
      "Tuaran", "Kunak", "Kinabatangan", "Beluran", "Tongod", "Pitas",
      "Kota Marudu", "Tenom", "Nabawan", "Sipitang", "Putatan", "Telupid",
      "Tambunan", "Kuala Penyu",
    ],
  },
  {
    kod: "SWK",
    nama: "Sarawak",
    daerah: [
      "Kuching", "Samarahan", "Serian", "Sri Aman", "Betong", "Sarikei",
      "Sibu", "Mukah", "Bintulu", "Kapit", "Miri", "Limbang",
    ],
  },
  {
    kod: "SGR",
    nama: "Selangor",
    daerah: [
      "Petaling", "Klang", "Hulu Langat", "Gombak", "Sepang",
      "Kuala Langat", "Kuala Selangor", "Sabak Bernam", "Hulu Selangor",
    ],
  },
  {
    kod: "TRG",
    nama: "Terengganu",
    daerah: ["Kuala Terengganu", "Kemaman", "Dungun", "Marang", "Hulu Terengganu", "Setiu", "Besut"],
  },
  { kod: "KUL", nama: "WP Kuala Lumpur", daerah: ["Kuala Lumpur"] },
  { kod: "LBN", nama: "WP Labuan", daerah: ["Labuan"] },
  { kod: "PJY", nama: "WP Putrajaya", daerah: ["Putrajaya"] },
];

async function seedReference() {
  await db.insert(roles).values(ROLES).onConflictDoNothing({ target: roles.code });
  console.log(`roles: ${ROLES.length} disemak/seeded`);

  let negeriCount = 0;
  let daerahCount = 0;
  for (const n of NEGERI_DAERAH) {
    const [row] = await db
      .insert(negeri)
      .values({ kod: n.kod, nama: n.nama })
      .onConflictDoUpdate({ target: negeri.kod, set: { nama: n.nama } })
      .returning({ id: negeri.id });
    negeriCount++;

    const existing = await db
      .select({ nama: daerah.nama })
      .from(daerah)
      .where(eq(daerah.negeriId, row.id));
    const existingNama = new Set(existing.map((d) => d.nama));
    const baharu = n.daerah.filter((nama) => !existingNama.has(nama));
    if (baharu.length > 0) {
      await db.insert(daerah).values(baharu.map((nama) => ({ negeriId: row.id, nama })));
    }
    daerahCount += n.daerah.length;
  }
  console.log(`negeri: ${negeriCount} disemak/seeded`);
  console.log(`daerah: ${daerahCount} disemak/seeded`);
}

// ---------------------------------------------------------------------------
// Langkah 8 — dummy business data (venue SEBENAR, staf/kursus/pendaftaran
// KEKAL rekaan). 7 premis KEMAS sebenar (nama/jenis/alamat/negeri/daerah
// disahkan) menggantikan angka "3 venue" asal PRD Seksyen 6 checklist.
//
// ⚠ Pemetaan daerah PLK Terengganu: alamat sebenar (Seberang Takir, Kuala
// Nerus) berada dalam daerah rasmi "Kuala Nerus" — TAPI daerah ini TIADA
// dalam core.daerah yang diseed Langkah 3 (senarai Terengganu ketika itu
// hanya 7 daerah lama, sebelum pemisahan Kuala Nerus daripada Kuala
// Terengganu pada 2014). Ikut arahan eksplisit — JANGAN cipta daerah baharu
// dalam seed script ni — dipetakan ke daerah induk sedia ada "Kuala
// Terengganu". Kemaskini core.daerah (migration berasingan) jika perlu
// ketepatan penuh sebelum go-live.
const VENUES: {
  kod: string;
  nama: string;
  jenis: "akademi" | "ilk" | "plk" | "pkm";
  alamat: string;
  negeriNama: string;
  daerahNama: string | null;
}[] = [
  {
    kod: "AKKSI",
    nama: "Akademi Kemahiran KEMAS Sri Iskandar",
    jenis: "akademi",
    alamat: "Bandar Baru Seri Iskandar, Bota",
    negeriNama: "Perak",
    daerahNama: "Perak Tengah",
  },
  {
    kod: "AKKGO",
    nama: "Akademi Kemahiran KEMAS Gopeng",
    jenis: "akademi",
    alamat: "Lot 133080, Laluan Persekutuan, Gopeng",
    negeriNama: "Perak",
    daerahNama: "Kampar",
  },
  {
    kod: "ILKKL",
    nama: "Institut Latihan KEMAS Kuala Lumpur",
    jenis: "ilk",
    alamat: "Kuala Lumpur",
    negeriNama: "WP Kuala Lumpur",
    daerahNama: null, // WP tiada daerah
  },
  {
    kod: "ILKKTN",
    nama: "Institut Latihan KEMAS Kuantan",
    jenis: "ilk",
    alamat: "Jalan Tok Sira, Alor Akar",
    negeriNama: "Pahang",
    daerahNama: "Kuantan",
  },
  {
    kod: "PLKKB",
    nama: "Pusat Latihan KEMAS Kepala Batas",
    jenis: "plk",
    alamat: "13200 Kepala Batas",
    negeriNama: "Pulau Pinang",
    daerahNama: "Seberang Perai Utara",
  },
  {
    kod: "PLKKT",
    nama: "Pusat Latihan KEMAS Terengganu",
    jenis: "plk",
    alamat: "Seberang Takir, Kuala Nerus",
    negeriNama: "Terengganu",
    daerahNama: "Kuala Terengganu", // rujuk nota pemetaan di atas
  },
  {
    kod: "PLKMLK",
    nama: "Pusat Latihan KEMAS Melaka",
    jenis: "plk",
    alamat: "Jalan Melor, Bukit Baru",
    negeriNama: "Melaka",
    daerahNama: "Melaka Tengah",
  },
];

const FACILITIES_BY_VENUE: Record<
  string,
  { nama: string; jenis: "dewan" | "bilik_seminar" | "makmal" | "asrama" | "lain"; kapasiti: number }[]
> = {
  AKKSI: [{ nama: "Dewan Latihan Utama", jenis: "dewan", kapasiti: 150 }],
  AKKGO: [{ nama: "Makmal Kemahiran", jenis: "makmal", kapasiti: 40 }],
  ILKKL: [{ nama: "Dewan Serbaguna", jenis: "dewan", kapasiti: 200 }],
  ILKKTN: [{ nama: "Bilik Seminar 1", jenis: "bilik_seminar", kapasiti: 60 }],
  PLKKB: [{ nama: "Dewan Latihan", jenis: "dewan", kapasiti: 100 }],
  PLKKT: [
    { nama: "Dewan Latihan SPAK", jenis: "dewan", kapasiti: 80 },
    { nama: "Bilik Kuliah 1", jenis: "bilik_seminar", kapasiti: 40 },
  ],
  PLKMLK: [{ nama: "Makmal Komputer", jenis: "makmal", kapasiti: 30 }],
};

const COURSE_CATEGORIES = [
  "Pendidikan Awal Kanak-Kanak",
  "Keusahawanan",
  "Dasar & Pentadbiran",
  "Kemahiran Vokasional",
];

const COURSES: {
  courseCode: string;
  title: string;
  categoryNama: string;
  deliveryMode: "fizikal" | "online_live" | "online_rakaman" | "hybrid";
  durationHours: number;
  maxParticipants: number;
  negeriNama: string | null;
  session?: { venueKod: string; facilityNama: string };
}[] = [
  {
    // Kursus sebenar KEMAS — dikaitkan dengan PLK Terengganu (padanan sebenar
    // operasi kursus ni), rujuk arahan eksplisit.
    courseCode: "SPAK-2026-01",
    title: "Sijil Pendidikan Awal Kanak-Kanak (SPAK)",
    categoryNama: "Pendidikan Awal Kanak-Kanak",
    deliveryMode: "fizikal",
    durationHours: 120,
    maxParticipants: 30,
    negeriNama: "Terengganu",
    session: { venueKod: "PLKKT", facilityNama: "Dewan Latihan SPAK" },
  },
  {
    courseCode: "KUD-2026-01",
    title: "Kursus Keusahawanan Digital",
    categoryNama: "Keusahawanan",
    deliveryMode: "online_rakaman",
    durationHours: 16,
    maxParticipants: 100,
    negeriNama: null,
  },
  {
    courseCode: "TDB-2026-01",
    title: "Taklimat Dasar Baharu KEMAS",
    categoryNama: "Dasar & Pentadbiran",
    deliveryMode: "online_live",
    durationHours: 3,
    maxParticipants: 300,
    negeriNama: null,
  },
  {
    courseCode: "BKM-2026-01",
    title: "Bengkel Kemahiran Menjahit Asas",
    categoryNama: "Kemahiran Vokasional",
    deliveryMode: "hybrid",
    durationHours: 24,
    maxParticipants: 25,
    negeriNama: "Perak",
  },
  {
    courseCode: "KAM-2026-01",
    title: "Kursus Asas Multimedia",
    categoryNama: "Kemahiran Vokasional",
    deliveryMode: "fizikal",
    durationHours: 40,
    maxParticipants: 30,
    negeriNama: "WP Kuala Lumpur",
  },
];

const DUMMY_PASSWORD = "SeedUser123!";

const USERS: {
  email: string;
  nama: string;
  telefon: string;
  jawatan: string;
  roleCode: (typeof roles.$inferInsert)["code"];
  negeriNama?: string;
  daerahNama?: string;
  venueKod?: string;
}[] = [
  { email: "hq.admin@example.com", nama: "Ahmad bin Ismail", telefon: "0121234501", jawatan: "Pegawai BLPP HQ", roleCode: "hq_admin" },
  { email: "negeri.perak@example.com", nama: "Siti Aminah binti Yusof", telefon: "0121234502", jawatan: "Pegawai Latihan Negeri", roleCode: "admin_negeri", negeriNama: "Perak" },
  { email: "negeri.terengganu@example.com", nama: "Mohd Faizal bin Hassan", telefon: "0121234503", jawatan: "Pegawai Latihan Negeri", roleCode: "admin_negeri", negeriNama: "Terengganu" },
  { email: "daerah.perakTengah@example.com", nama: "Norhayati binti Abdullah", telefon: "0121234504", jawatan: "Penolong Pegawai Daerah", roleCode: "admin_daerah", negeriNama: "Perak", daerahNama: "Perak Tengah" },
  { email: "daerah.kuantan@example.com", nama: "Rahman bin Ali", telefon: "0121234505", jawatan: "Penolong Pegawai Daerah", roleCode: "admin_daerah", negeriNama: "Pahang", daerahNama: "Kuantan" },
  { email: "pic.akksi@example.com", nama: "Zulkifli bin Omar", telefon: "0121234506", jawatan: "PIC Akademi", roleCode: "pic_premis", venueKod: "AKKSI" },
  { email: "pic.ilkkl@example.com", nama: "Fatimah binti Ibrahim", telefon: "0121234507", jawatan: "PIC Institut", roleCode: "pic_premis", venueKod: "ILKKL" },
  { email: "pic.plkkt@example.com", nama: "Azman bin Yaakob", telefon: "0121234508", jawatan: "PIC Pusat Latihan", roleCode: "pic_premis", venueKod: "PLKKT" },
  { email: "penceramah.huda@example.com", nama: "Nurul Huda binti Zainal", telefon: "0121234509", jawatan: "Tenaga Pengajar", roleCode: "penceramah" },
  { email: "penceramah.kamarul@example.com", nama: "Kamarul Bahrin bin Salleh", telefon: "0121234510", jawatan: "Tenaga Pengajar", roleCode: "penceramah" },
  { email: "penceramah.aisyah@example.com", nama: "Wan Aisyah binti Wan Mahmud", telefon: "0121234511", jawatan: "Tenaga Pengajar", roleCode: "penceramah" },
  { email: "pengarah@example.com", nama: "Zainal Abidin bin Hashim", telefon: "0121234512", jawatan: "Pengarah BLPP", roleCode: "pengarah" },
  { email: "peserta1@example.com", nama: "Aina binti Roslan", telefon: "0121234601", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "Perak" },
  { email: "peserta2@example.com", nama: "Farid bin Zulkarnain", telefon: "0121234602", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "Perak" },
  { email: "peserta3@example.com", nama: "Hasnah binti Kassim", telefon: "0121234603", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "Terengganu" },
  { email: "peserta4@example.com", nama: "Idris bin Mahmud", telefon: "0121234604", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "Terengganu" },
  { email: "peserta5@example.com", nama: "Junaidah binti Latif", telefon: "0121234605", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "Pahang" },
  { email: "peserta6@example.com", nama: "Kamal bin Sabri", telefon: "0121234606", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "Pulau Pinang" },
  { email: "peserta7@example.com", nama: "Latifah binti Nordin", telefon: "0121234607", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "Melaka" },
  { email: "peserta8@example.com", nama: "Mahathir bin Rejab", telefon: "0121234608", jawatan: "Kakitangan KEMAS", roleCode: "peserta", negeriNama: "WP Kuala Lumpur" },
];

async function findNegeriId(nama: string): Promise<string> {
  const [row] = await db.select({ id: negeri.id }).from(negeri).where(eq(negeri.nama, nama)).limit(1);
  if (!row) throw new Error(`Negeri tidak dijumpai: ${nama}`);
  return row.id;
}

async function findDaerahId(negeriId: string, nama: string): Promise<string> {
  const [row] = await db
    .select({ id: daerah.id })
    .from(daerah)
    .where(and(eq(daerah.negeriId, negeriId), eq(daerah.nama, nama)))
    .limit(1);
  if (!row) throw new Error(`Daerah tidak dijumpai: ${nama}`);
  return row.id;
}

async function seedDummy() {
  // Venues (premis sebenar)
  const venueIdByKod = new Map<string, string>();
  for (const v of VENUES) {
    const negeriId = await findNegeriId(v.negeriNama);
    const daerahId = v.daerahNama ? await findDaerahId(negeriId, v.daerahNama) : null;

    const [existing] = await db.select({ id: venues.id }).from(venues).where(eq(venues.nama, v.nama)).limit(1);
    if (existing) {
      venueIdByKod.set(v.kod, existing.id);
      continue;
    }
    const [row] = await db
      .insert(venues)
      .values({ nama: v.nama, jenis: v.jenis, alamat: v.alamat, negeriId, daerahId })
      .returning({ id: venues.id });
    venueIdByKod.set(v.kod, row.id);
  }
  console.log(`venues: ${VENUES.length} disemak/seeded`);

  // Facilities
  let facilityCount = 0;
  const facilityIdByVenueAndNama = new Map<string, string>();
  for (const [kod, list] of Object.entries(FACILITIES_BY_VENUE)) {
    const venueId = venueIdByKod.get(kod);
    if (!venueId) throw new Error(`Venue tidak dijumpai untuk kod: ${kod}`);
    for (const f of list) {
      const [existing] = await db
        .select({ id: facilities.id })
        .from(facilities)
        .where(and(eq(facilities.venueId, venueId), eq(facilities.nama, f.nama)))
        .limit(1);
      let facilityId = existing?.id;
      if (!facilityId) {
        const [row] = await db
          .insert(facilities)
          .values({ venueId, nama: f.nama, jenis: f.jenis, kapasiti: f.kapasiti })
          .returning({ id: facilities.id });
        facilityId = row.id;
      }
      facilityIdByVenueAndNama.set(`${kod}:${f.nama}`, facilityId);
      facilityCount++;
    }
  }
  console.log(`facilities: ${facilityCount} disemak/seeded`);

  // Course categories
  const categoryIdByNama = new Map<string, string>();
  for (const nama of COURSE_CATEGORIES) {
    const [existing] = await db
      .select({ id: courseCategories.id })
      .from(courseCategories)
      .where(eq(courseCategories.nama, nama))
      .limit(1);
    let id = existing?.id;
    if (!id) {
      const [row] = await db.insert(courseCategories).values({ nama }).returning({ id: courseCategories.id });
      id = row.id;
    }
    categoryIdByNama.set(nama, id);
  }
  console.log(`course_categories: ${COURSE_CATEGORIES.length} disemak/seeded`);

  // Courses + satu sesi contoh (SPAK)
  let sessionCount = 0;
  for (const c of COURSES) {
    const categoryId = categoryIdByNama.get(c.categoryNama);
    const negeriId = c.negeriNama ? await findNegeriId(c.negeriNama) : null;

    const [existing] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.courseCode, c.courseCode))
      .limit(1);
    let courseId = existing?.id;
    if (!courseId) {
      const [row] = await db
        .insert(courses)
        .values({
          courseCode: c.courseCode,
          title: c.title,
          categoryId,
          durationHours: c.durationHours,
          maxParticipants: c.maxParticipants,
          negeriId,
          deliveryMode: c.deliveryMode,
          status: "published",
        })
        .returning({ id: courses.id });
      courseId = row.id;
    }

    if (c.session) {
      const facilityId = facilityIdByVenueAndNama.get(`${c.session.venueKod}:${c.session.facilityNama}`);
      if (!facilityId) throw new Error(`Facility tidak dijumpai untuk sesi kursus ${c.courseCode}`);
      const [existingSession] = await db
        .select({ id: courseSessions.id })
        .from(courseSessions)
        .where(eq(courseSessions.courseId, courseId))
        .limit(1);
      if (!existingSession) {
        await db.insert(courseSessions).values({
          courseId,
          tarikh: "2026-09-15",
          facilityId,
          deliveryMode: c.deliveryMode,
        });
        sessionCount++;
      }
    }
  }
  console.log(`courses: ${COURSES.length} disemak/seeded (${sessionCount} sesi baharu)`);

  // Users + user_roles (skop ikut role — rujuk lib/rbac.ts)
  const passwordHash = await hashPassword(DUMMY_PASSWORD);
  let userCount = 0;
  for (const u of USERS) {
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1);
    let userId = existingUser?.id;
    if (!userId) {
      const [row] = await db
        .insert(users)
        .values({
          email: u.email,
          passwordHash,
          nama: u.nama,
          telefon: u.telefon,
          jawatan: u.jawatan,
          forcePasswordChange: false,
        })
        .returning({ id: users.id });
      userId = row.id;
    }
    userCount++;

    const roleRow = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, u.roleCode)).limit(1);
    const roleId = roleRow[0]?.id;
    if (!roleId) throw new Error(`Role tidak dijumpai: ${u.roleCode}`);

    const negeriId = u.negeriNama ? await findNegeriId(u.negeriNama) : null;
    const daerahId = u.negeriNama && u.daerahNama ? await findDaerahId(negeriId!, u.daerahNama) : null;
    const venueId = u.venueKod ? (venueIdByKod.get(u.venueKod) ?? null) : null;

    const [existingRole] = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .limit(1);
    if (!existingRole) {
      await db.insert(userRoles).values({ userId, roleId, negeriId, daerahId, venueId });
    }
  }
  console.log(`users: ${userCount} disemak/seeded (kata laluan seragam: ${DUMMY_PASSWORD})`);
}

async function main() {
  await seedReference();
  await seedDummy();
  console.log("Seed dev (reference + dummy) selesai.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
