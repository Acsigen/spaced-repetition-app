import { conflict, notFound } from "@/lib/errors.ts";
import { makeInitialFsrsCard, scheduleFsrsReview } from "@/lib/fsrs.ts";
import { kvKeys } from "@/lib/kv.ts";
import type {
  BackupData,
  Direction,
  DueReview,
  RecentReview,
  ReviewLog,
  ReviewRating,
  ReviewResult,
  Stats,
  StudyCard,
  Word,
  WordInput,
  WordUpdate,
} from "@/lib/types.ts";

const DIRECTIONS: Direction[] = ["es_to_ro", "ro_to_es"];

export class SpanishSrsRepository {
  constructor(private readonly kv: Deno.Kv) {}

  async createWord(input: WordInput, now = new Date()): Promise<{
    word: Word;
    cards: StudyCard[];
  }> {
    const timestamp = now.toISOString();
    const word: Word = {
      id: newId("word"),
      spanish: input.spanish,
      romanian: input.romanian,
      example: input.example,
      note: input.note,
      tags: input.tags,
      createdAt: timestamp,
      updatedAt: timestamp,
      archived: false,
    };

    const cards = DIRECTIONS.map((direction): StudyCard => {
      const fsrs = makeInitialFsrsCard(now);
      return {
        id: newId("card"),
        wordId: word.id,
        direction,
        fsrs,
        dueAt: timestamp,
        suspended: false,
      };
    });

    let atomic = this.kv.atomic().set(kvKeys.word(word.id), word);
    for (const card of cards) {
      atomic = atomic
        .set(kvKeys.card(card.id), card)
        .set(kvKeys.cardByWord(word.id, card.direction), card.id);
    }

    const result = await atomic.commit();
    if (!result.ok) conflict("Cuvântul nu a putut fi creat.");
    return { word, cards };
  }

  async listWords(options: {
    includeArchived?: boolean;
    q?: string;
  } = {}): Promise<Word[]> {
    const query = options.q?.trim().toLocaleLowerCase("ro");
    const words: Word[] = [];
    for await (const entry of this.kv.list<Word>({ prefix: ["word"] })) {
      const word = entry.value;
      if (!options.includeArchived && word.archived) continue;
      if (query && !matchesWordQuery(word, query)) continue;
      words.push(word);
    }
    return words.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateWord(
    id: string,
    update: WordUpdate,
    now = new Date(),
  ): Promise<Word> {
    const entry = await this.kv.get<Word>(kvKeys.word(id));
    if (!entry.value) notFound("Cuvântul nu există.");

    const word: Word = {
      ...entry.value,
      ...update,
      updatedAt: now.toISOString(),
    };

    const result = await this.kv.atomic()
      .check(entry)
      .set(kvKeys.word(id), word)
      .commit();
    if (!result.ok) conflict("Cuvântul a fost modificat între timp.");
    return word;
  }

  async archiveWord(id: string, now = new Date()): Promise<Word> {
    return await this.updateWord(id, { archived: true }, now);
  }

  async listDueCards(now = new Date(), limit = 20): Promise<DueReview[]> {
    const due: Array<{ card: StudyCard; word: Word }> = [];
    for await (const entry of this.kv.list<StudyCard>({ prefix: ["card"] })) {
      const card = entry.value;
      if (card.suspended || new Date(card.dueAt) > now) continue;
      const word = await this.getWordOrNull(card.wordId);
      if (!word || word.archived) continue;
      due.push({ card, word });
    }

    return due
      .toSorted((a, b) => a.card.dueAt.localeCompare(b.card.dueAt))
      .slice(0, limit)
      .map(({ card, word }) => toDueReview(card, word));
  }

  async submitReview(
    cardId: string,
    rating: ReviewRating,
    reviewedAt = new Date(),
  ): Promise<ReviewResult> {
    const cardEntry = await this.kv.get<StudyCard>(kvKeys.card(cardId));
    if (!cardEntry.value) notFound("Cardul nu există.");

    const card = cardEntry.value;
    const word = await this.getWordOrNull(card.wordId);
    if (!word) notFound("Cuvântul cardului nu există.");
    if (word.archived) {
      conflict("Cuvântul este arhivat și nu poate fi repetat.");
    }

    const previousDueAt = card.dueAt;
    const nextFsrs = scheduleFsrsReview(card.fsrs, rating, reviewedAt);
    const nextCard: StudyCard = {
      ...card,
      fsrs: nextFsrs,
      dueAt: nextFsrs.due,
    };
    const log: ReviewLog = {
      id: newId("review"),
      cardId: card.id,
      wordId: word.id,
      direction: card.direction,
      rating,
      reviewedAt: reviewedAt.toISOString(),
      previousDueAt,
      nextDueAt: nextCard.dueAt,
    };

    const result = await this.kv.atomic()
      .check(cardEntry)
      .set(kvKeys.card(card.id), nextCard)
      .set(kvKeys.review(log.reviewedAt, log.id), log)
      .commit();
    if (!result.ok) conflict("Reviewul a fost modificat între timp.");

    return { card: nextCard, log, word };
  }

  async stats(now = new Date()): Promise<Stats> {
    const words = await this.listWords({ includeArchived: true });
    const activeWords = new Map(
      words.filter((word) => !word.archived).map((
        word,
      ) => [word.id, word]),
    );
    const cardsByWord = new Map<string, StudyCard[]>();
    let dueCount = 0;

    for await (const entry of this.kv.list<StudyCard>({ prefix: ["card"] })) {
      const card = entry.value;
      const word = activeWords.get(card.wordId);
      if (!word || card.suspended) continue;
      if (new Date(card.dueAt) <= now) dueCount += 1;
      const cards = cardsByWord.get(card.wordId) ?? [];
      cards.push(card);
      cardsByWord.set(card.wordId, cards);
    }

    let learnedWordCount = 0;
    for (const word of activeWords.values()) {
      const cards = cardsByWord.get(word.id) ?? [];
      if (cards.length > 0 && cards.every((card) => card.fsrs.reps > 0)) {
        learnedWordCount += 1;
      }
    }

    const recentReviews: RecentReview[] = [];
    let reviewCount = 0;
    for await (
      const entry of this.kv.list<ReviewLog>({ prefix: ["review"] }, {
        reverse: true,
      })
    ) {
      reviewCount += 1;
      if (recentReviews.length < 10) {
        const word = await this.getWordOrNull(entry.value.wordId);
        recentReviews.push({ ...entry.value, word: word ?? undefined });
      }
    }

    return {
      dueCount,
      activeWordCount: activeWords.size,
      archivedWordCount: words.length - activeWords.size,
      learnedWordCount,
      reviewCount,
      recentReviews,
    };
  }

  async exportBackup(now = new Date()): Promise<BackupData> {
    const words = await collectValues<Word>(this.kv, ["word"]);
    const cards = await collectValues<StudyCard>(this.kv, ["card"]);
    const reviews = await collectValues<ReviewLog>(this.kv, ["review"]);
    return {
      version: 1,
      exportedAt: now.toISOString(),
      words: words.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt)),
      cards: cards.toSorted((a, b) => a.id.localeCompare(b.id)),
      reviews: reviews.toSorted((a, b) =>
        a.reviewedAt.localeCompare(b.reviewedAt)
      ),
    };
  }

  async replaceWithBackup(backup: BackupData): Promise<Stats> {
    await this.clearPrefix(["word"]);
    await this.clearPrefix(["card"]);
    await this.clearPrefix(["card_by_word"]);
    await this.clearPrefix(["review"]);

    for (const word of backup.words) {
      await this.kv.set(kvKeys.word(word.id), word);
    }
    for (const card of backup.cards) {
      await this.kv.set(kvKeys.card(card.id), card);
      await this.kv.set(
        kvKeys.cardByWord(card.wordId, card.direction),
        card.id,
      );
    }
    for (const review of backup.reviews) {
      await this.kv.set(kvKeys.review(review.reviewedAt, review.id), review);
    }

    return await this.stats();
  }

  close(): void {
    this.kv.close();
  }

  private async getWordOrNull(id: string): Promise<Word | null> {
    const entry = await this.kv.get<Word>(kvKeys.word(id));
    return entry.value;
  }

  private async clearPrefix(prefix: Deno.KvKey): Promise<void> {
    for await (const entry of this.kv.list({ prefix })) {
      await this.kv.delete(entry.key);
    }
  }
}

async function collectValues<T>(kv: Deno.Kv, prefix: Deno.KvKey): Promise<T[]> {
  const values: T[] = [];
  for await (const entry of kv.list<T>({ prefix })) {
    values.push(entry.value);
  }
  return values;
}

function toDueReview(card: StudyCard, word: Word): DueReview {
  return {
    cardId: card.id,
    wordId: word.id,
    direction: card.direction,
    prompt: card.direction === "es_to_ro" ? word.spanish : word.romanian,
    answer: card.direction === "es_to_ro" ? word.romanian : word.spanish,
    spanish: word.spanish,
    romanian: word.romanian,
    example: word.example,
    note: word.note,
    tags: word.tags,
    dueAt: card.dueAt,
  };
}

function matchesWordQuery(word: Word, query: string): boolean {
  return [
    word.spanish,
    word.romanian,
    word.example,
    word.note,
    ...word.tags,
  ].some((value) => value?.toLocaleLowerCase("ro").includes(query));
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
