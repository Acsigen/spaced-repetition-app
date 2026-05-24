import type { CardInput as FsrsCardInput } from "ts-fsrs";

export type Direction = "es_to_ro" | "ro_to_es";

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = typeof REVIEW_RATINGS[number];

export interface StoredFsrsCard
  extends Omit<FsrsCardInput, "due" | "last_review"> {
  due: string;
  last_review?: string | null;
}

export interface Word {
  id: string;
  spanish: string;
  romanian: string;
  example?: string;
  note?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface StudyCard {
  id: string;
  wordId: string;
  direction: Direction;
  fsrs: StoredFsrsCard;
  dueAt: string;
  suspended: boolean;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  wordId: string;
  direction: Direction;
  rating: ReviewRating;
  reviewedAt: string;
  previousDueAt: string;
  nextDueAt: string;
}

export interface WordInput {
  spanish: string;
  romanian: string;
  example?: string;
  note?: string;
  tags: string[];
}

export interface WordUpdate {
  spanish?: string;
  romanian?: string;
  example?: string;
  note?: string;
  tags?: string[];
  archived?: boolean;
}

export interface DueReview {
  cardId: string;
  wordId: string;
  direction: Direction;
  prompt: string;
  answer: string;
  spanish: string;
  romanian: string;
  example?: string;
  note?: string;
  tags: string[];
  dueAt: string;
}

export interface RecentReview extends ReviewLog {
  word?: Word;
}

export interface Stats {
  dueCount: number;
  activeWordCount: number;
  archivedWordCount: number;
  learnedWordCount: number;
  reviewCount: number;
  recentReviews: RecentReview[];
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  words: Word[];
  cards: StudyCard[];
  reviews: ReviewLog[];
}

export interface ReviewResult {
  card: StudyCard;
  log: ReviewLog;
  word: Word;
}
