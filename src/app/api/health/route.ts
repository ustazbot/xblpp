import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (err) {
    return Response.json(
      { status: "error", message: (err as Error).message },
      { status: 503 },
    );
  }
}
