import "server-only";
import { connection } from "next/server";

// An uncached, request-time dependency. Rendering consumes an explicit snapshot;
// it never samples the wall clock once per appointment (or during prerendering).
export async function readRequestClock(): Promise<number> {
  await connection();
  return Date.now();
}
