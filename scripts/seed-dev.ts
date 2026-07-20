// Seed dev — Langkah 3: roles + negeri + daerah (rujuk PRD Seksyen 8.4).
// Dummy business data (user/venue/kursus) ditambah Langkah 8, di bawah seedReference().
//
// ⚠ Data daerah Sabah/Sarawak: senarai major district sahaja (bukan senarai
// rasmi bahagian/daerah penuh) — SAHKAN dengan sumber rasmi BLPP/JPM sebelum
// go-live. Negeri Semenanjung + WP disahkan lebih yakin (struktur stabil, biasa).

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { negeri, daerah, roles } from "@/db/schema/core";

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

seedReference()
  .then(() => {
    console.log("Seed reference data (roles/negeri/daerah) selesai.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
