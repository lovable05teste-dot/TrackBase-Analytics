import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
type DatabaseBinding=Parameters<typeof drizzle>[0];

export function getDb() {
  const binding=(globalThis as unknown as {DB?:DatabaseBinding}).DB;
  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(binding, { schema });
}

export function getRawDb() {
  const binding=(globalThis as unknown as {DB?:DatabaseBinding}).DB;
  if (!binding) throw new Error("Banco de dados indisponível.");
  return binding;
}
