import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as core from "./schema/core";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL tidak ditetapkan");
}

// Pool aplikasi max ~20 (rujuk xBLPP-Struktur-Repo-Schema.md Seksyen 1) —
// baki 87/100 slot Postgres dikongsi disahkan cukup semasa Langkah 1.
const client = postgres(connectionString, { max: 20 });

export const schema = { ...core };
export const db = drizzle(client, { schema });
