import type { Direction } from "@/lib/types.ts";

const DEFAULT_KV_PATH = "./data/spanish-srs.kv";

let kvPromise: Promise<Deno.Kv> | undefined;

export const kvKeys = {
  word: (id: string) => ["word", id] as const,
  card: (id: string) => ["card", id] as const,
  cardByWord: (wordId: string, direction: Direction) =>
    ["card_by_word", wordId, direction] as const,
  review: (reviewedAt: string, id: string) =>
    ["review", reviewedAt, id] as const,
};

export async function openAppKv(): Promise<Deno.Kv> {
  if (!kvPromise) {
    kvPromise = openKvAt(Deno.env.get("KV_PATH") ?? DEFAULT_KV_PATH);
  }
  return await kvPromise;
}

export async function openKvAt(path: string): Promise<Deno.Kv> {
  await ensureParentDirectory(path);
  return await Deno.openKv(path);
}

async function ensureParentDirectory(path: string): Promise<void> {
  const slash = path.lastIndexOf("/");
  if (slash > 0) {
    await Deno.mkdir(path.slice(0, slash), { recursive: true });
  }
}
