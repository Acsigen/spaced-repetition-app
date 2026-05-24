import { badRequest } from "@/lib/errors.ts";
import {
  type BackupData,
  REVIEW_RATINGS,
  type ReviewRating,
  type StudyCard,
  type Word,
  type WordInput,
  type WordUpdate,
} from "@/lib/types.ts";

export function parseCreateWord(input: unknown): WordInput {
  const value = asRecord(input);
  return {
    spanish: requiredText(value.spanish, "Cuvântul spaniol"),
    romanian: requiredText(value.romanian, "Traducerea în română"),
    example: optionalText(value.example, "Exemplul"),
    note: optionalText(value.note, "Nota"),
    tags: parseTags(value.tags),
  };
}

export function parseUpdateWord(input: unknown): WordUpdate {
  const value = asRecord(input);
  const update: WordUpdate = {};

  if ("spanish" in value) {
    update.spanish = requiredText(value.spanish, "Cuvântul spaniol");
  }
  if ("romanian" in value) {
    update.romanian = requiredText(value.romanian, "Traducerea în română");
  }
  if ("example" in value) {
    update.example = optionalText(value.example, "Exemplul");
  }
  if ("note" in value) {
    update.note = optionalText(value.note, "Nota");
  }
  if ("tags" in value) {
    update.tags = parseTags(value.tags);
  }
  if ("archived" in value) {
    if (typeof value.archived !== "boolean") {
      badRequest("Starea de arhivare trebuie să fie booleană.");
    }
    update.archived = value.archived;
  }

  if (Object.keys(update).length === 0) {
    badRequest("Nu există câmpuri de actualizat.");
  }

  return update;
}

export function parseReviewRating(input: unknown): ReviewRating {
  const value = asRecord(input).rating;
  if (
    typeof value !== "string" ||
    !REVIEW_RATINGS.includes(value as ReviewRating)
  ) {
    badRequest("Ratingul trebuie să fie again, hard, good sau easy.");
  }
  return value as ReviewRating;
}

export function parseBackup(input: unknown): BackupData {
  const value = asRecord(input);
  if (value.version !== 1) {
    badRequest("Versiunea backupului nu este suportată.");
  }
  if (!isIsoDate(value.exportedAt)) {
    badRequest("Backupul nu conține o dată de export validă.");
  }
  if (
    !Array.isArray(value.words) ||
    !Array.isArray(value.cards) ||
    !Array.isArray(value.reviews)
  ) {
    badRequest("Backupul trebuie să conțină words, cards și reviews.");
  }

  const words = value.words.map(parseBackupWord);
  const cards = value.cards.map(parseBackupCard);
  const reviews = value.reviews.map((review) => asRecord(review));

  for (const review of reviews) {
    if (
      typeof review.id !== "string" ||
      typeof review.cardId !== "string" ||
      typeof review.wordId !== "string" ||
      typeof review.direction !== "string" ||
      !isReviewRating(review.rating) ||
      !isIsoDate(review.reviewedAt) ||
      !isIsoDate(review.previousDueAt) ||
      !isIsoDate(review.nextDueAt)
    ) {
      badRequest("Backupul conține un review invalid.");
    }
  }

  return {
    version: 1,
    exportedAt: value.exportedAt as string,
    words,
    cards,
    reviews: reviews as unknown as BackupData["reviews"],
  };
}

function parseBackupWord(input: unknown): Word {
  const value = asRecord(input);
  if (
    typeof value.id !== "string" ||
    typeof value.spanish !== "string" ||
    typeof value.romanian !== "string" ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => typeof tag === "string") ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.updatedAt) ||
    typeof value.archived !== "boolean"
  ) {
    badRequest("Backupul conține un cuvânt invalid.");
  }

  return {
    id: value.id,
    spanish: value.spanish,
    romanian: value.romanian,
    example: optionalText(value.example, "Exemplul"),
    note: optionalText(value.note, "Nota"),
    tags: value.tags,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    archived: value.archived,
  };
}

function parseBackupCard(input: unknown): StudyCard {
  const value = asRecord(input);
  if (
    typeof value.id !== "string" ||
    typeof value.wordId !== "string" ||
    (value.direction !== "es_to_ro" && value.direction !== "ro_to_es") ||
    !isIsoDate(value.dueAt) ||
    typeof value.suspended !== "boolean" ||
    typeof value.fsrs !== "object" ||
    value.fsrs === null
  ) {
    badRequest("Backupul conține un card invalid.");
  }

  return value as unknown as StudyCard;
}

function parseTags(input: unknown): string[] {
  if (input == null || input === "") return [];
  if (typeof input === "string") {
    return input.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
  if (Array.isArray(input)) {
    if (!input.every((tag) => typeof tag === "string")) {
      badRequest("Etichetele trebuie să fie text.");
    }
    return input.map((tag) => tag.trim()).filter(Boolean);
  }
  badRequest(
    "Etichetele trebuie să fie o listă sau text separat prin virgulă.",
  );
}

function requiredText(input: unknown, label: string): string {
  const value = optionalText(input, label);
  if (!value) badRequest(`${label} este obligatoriu.`);
  return value;
}

function optionalText(input: unknown, label: string): string | undefined {
  if (input == null) return undefined;
  if (typeof input !== "string") {
    badRequest(`${label} trebuie să fie text.`);
  }
  const value = input.trim();
  if (value.length > 500) {
    badRequest(`${label} este prea lung.`);
  }
  return value || undefined;
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    badRequest("Corpul cererii trebuie să fie un obiect JSON.");
  }
  return input as Record<string, unknown>;
}

function isReviewRating(input: unknown): input is ReviewRating {
  return typeof input === "string" &&
    REVIEW_RATINGS.includes(input as ReviewRating);
}

function isIsoDate(input: unknown): input is string {
  return typeof input === "string" && !Number.isNaN(new Date(input).valueOf());
}
