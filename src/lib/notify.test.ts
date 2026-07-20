// Self-check ringkas — jalankan: npx tsx src/lib/notify.test.ts
// Fokus assertNoIcLeak (PRD Seksyen 7.1) — logik pure, tiada DB diperlukan.
import assert from "node:assert/strict";
import { assertNoIcLeak } from "./notify";

// Mesej normal (nama/email sahaja) — patut lulus
assert.doesNotThrow(() =>
  assertNoIcLeak("Tempahan diluluskan", "Salam Ahmad bin Ali, tempahan anda di Dewan A telah diluluskan."),
);
assert.doesNotThrow(() => assertNoIcLeak("Peringatan kursus", "Hubungi kami di admin@example.com"));

// Corak IC dengan sengkang — patut tersekat
assert.throws(() => assertNoIcLeak("", "No. IC anda: 901231-14-5678"));

// Corak IC tanpa sengkang — patut tersekat juga
assert.throws(() => assertNoIcLeak("Rekod: 901231145678", ""));

// Nombor telefon biasa (bukan format IC 6-2-4) — tak patut kena block palsu
assert.doesNotThrow(() => assertNoIcLeak("Hubungi 012-3456789", ""));

console.log("notify.test.ts: semua assertion lulus");
