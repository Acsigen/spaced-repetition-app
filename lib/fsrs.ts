import {
  type Card as FsrsCard,
  type CardInput as FsrsCardInput,
  createEmptyCard,
  type DateInput,
  fsrs,
  type Grade,
  Rating,
} from "ts-fsrs";
import type { ReviewRating, StoredFsrsCard } from "@/lib/types.ts";
import { badRequest } from "@/lib/errors.ts";

const scheduler = fsrs();

export function makeInitialFsrsCard(
  now: DateInput = new Date(),
): StoredFsrsCard {
  return toStoredFsrsCard(createEmptyCard(now));
}

export function mapRatingToFsrs(rating: ReviewRating): Grade {
  switch (rating) {
    case "again":
      return Rating.Again;
    case "hard":
      return Rating.Hard;
    case "good":
      return Rating.Good;
    case "easy":
      return Rating.Easy;
  }
}

export function scheduleFsrsReview(
  card: StoredFsrsCard,
  rating: ReviewRating,
  reviewedAt: DateInput = new Date(),
): StoredFsrsCard {
  // ts-fsrs recomputes elapsed_days from last_review internally; the input
  // value is ignored, so a placeholder satisfies the (deprecated) field.
  const input: FsrsCardInput = { ...card, elapsed_days: 0 };
  const result = scheduler.next(input, reviewedAt, mapRatingToFsrs(rating));
  return toStoredFsrsCard(result.card);
}

export function toStoredFsrsCard(
  card: FsrsCard | FsrsCardInput,
): StoredFsrsCard {
  return {
    due: toIsoDate(card.due, "due"),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review == null
      ? null
      : toIsoDate(card.last_review, "last_review"),
  };
}

function toIsoDate(input: DateInput, field: string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.valueOf())) {
    badRequest(`Data FSRS pentru ${field} nu este validă.`);
  }
  return date.toISOString();
}
