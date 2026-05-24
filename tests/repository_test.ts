import { assert, assertEquals } from "@std/assert";
import { createApi } from "@/lib/api.ts";
import { SpanishSrsRepository } from "@/lib/repository.ts";

Deno.test("word creation creates two cards due now in both directions", async () => {
  await withRepo(async (repo) => {
    const now = new Date("2026-01-01T09:00:00.000Z");
    const { word, cards } = await repo.createWord({
      spanish: "la casa",
      romanian: "casa",
      tags: ["substantiv"],
    }, now);

    assertEquals(word.spanish, "la casa");
    assertEquals(cards.map((card) => card.direction).sort(), [
      "es_to_ro",
      "ro_to_es",
    ]);
    assertEquals(cards.map((card) => card.dueAt), [
      now.toISOString(),
      now.toISOString(),
    ]);

    const due = await repo.listDueCards(now, 20);
    assertEquals(due.length, 2);
    assertEquals(due.map((card) => card.prompt).sort(), ["casa", "la casa"]);
  });
});

Deno.test("due cards are sorted by due date", async () => {
  await withRepo(async (repo) => {
    await repo.createWord({
      spanish: "tarde",
      romanian: "târziu",
      tags: [],
    }, new Date("2026-01-02T09:00:00.000Z"));
    await repo.createWord({
      spanish: "temprano",
      romanian: "devreme",
      tags: [],
    }, new Date("2026-01-01T09:00:00.000Z"));

    const due = await repo.listDueCards(
      new Date("2026-01-03T09:00:00.000Z"),
      4,
    );
    assertEquals(due.length, 4);
    assertEquals(due[0].spanish, "temprano");
    assertEquals(due[1].spanish, "temprano");
  });
});

Deno.test("archived words are hidden from study queue and default word list", async () => {
  await withRepo(async (repo) => {
    const { word } = await repo.createWord({
      spanish: "perro",
      romanian: "câine",
      tags: [],
    }, new Date("2026-01-01T09:00:00.000Z"));

    await repo.archiveWord(word.id, new Date("2026-01-01T10:00:00.000Z"));

    assertEquals(await repo.listWords(), []);
    assertEquals((await repo.listWords({ includeArchived: true })).length, 1);
    assertEquals(
      await repo.listDueCards(new Date("2026-01-01T11:00:00.000Z")),
      [],
    );
  });
});

Deno.test("review submission updates card and appends log atomically", async () => {
  await withRepo(async (repo) => {
    const now = new Date("2026-01-01T09:00:00.000Z");
    const reviewedAt = new Date("2026-01-01T09:05:00.000Z");
    const { cards } = await repo.createWord({
      spanish: "comer",
      romanian: "a mânca",
      tags: ["verb"],
    }, now);

    const result = await repo.submitReview(cards[0].id, "good", reviewedAt);

    assertEquals(result.log.cardId, cards[0].id);
    assertEquals(result.log.previousDueAt, now.toISOString());
    assertEquals(result.log.reviewedAt, reviewedAt.toISOString());
    assert(result.card.dueAt > reviewedAt.toISOString());

    const backup = await repo.exportBackup();
    assertEquals(backup.reviews.length, 1);
    assertEquals(
      backup.cards.find((card) => card.id === cards[0].id)?.fsrs.reps,
      1,
    );
  });
});

Deno.test("backup export and import round trip", async () => {
  await withRepo(async (sourceRepo) => {
    const now = new Date("2026-01-01T09:00:00.000Z");
    const { cards } = await sourceRepo.createWord({
      spanish: "azul",
      romanian: "albastru",
      tags: ["culoare"],
    }, now);
    await sourceRepo.submitReview(
      cards[0].id,
      "easy",
      new Date("2026-01-01T09:10:00.000Z"),
    );
    const backup = await sourceRepo.exportBackup();

    await withRepo(async (targetRepo) => {
      await targetRepo.replaceWithBackup(backup);
      const restored = await targetRepo.exportBackup();

      assertEquals(restored.words.length, backup.words.length);
      assertEquals(restored.cards.length, backup.cards.length);
      assertEquals(restored.reviews.length, backup.reviews.length);
      assertEquals(restored.words[0].spanish, "azul");
    });
  });
});

Deno.test("API supports word CRUD flow", async () => {
  await withRepo(async (repo) => {
    const api = createApi(() => Promise.resolve(repo));
    const createResponse = await api.createWord(jsonRequest("/api/words", {
      spanish: "gracias",
      romanian: "mulțumesc",
      tags: "expresie",
    }));
    assertEquals(createResponse.status, 201);
    const created = await createResponse.json();

    const wordId = created.word.id as string;
    const updateResponse = await api.updateWord(
      jsonRequest(`/api/words/${wordId}`, {
        note: "folosit foarte des",
      }, "PATCH"),
      wordId,
    );
    assertEquals(updateResponse.status, 200);

    const archiveResponse = await api.archiveWord(wordId);
    assertEquals(archiveResponse.status, 200);

    const listResponse = await api.listWords(
      new Request("http://local.test/api/words"),
    );
    const listed = await listResponse.json();
    assertEquals(listed.words, []);
  });
});

async function withRepo(
  fn: (repo: SpanishSrsRepository) => Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir();
  const kv = await Deno.openKv(`${dir}/test.kv`);
  const repo = new SpanishSrsRepository(kv);
  try {
    await fn(repo);
  } finally {
    kv.close();
    await Deno.remove(dir, { recursive: true }).catch(() => {});
  }
}

function jsonRequest(
  path: string,
  body: unknown,
  method = "POST",
): Request {
  return new Request(`http://local.test${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
