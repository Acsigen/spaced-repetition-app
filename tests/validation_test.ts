import { assertEquals, assertThrows } from "@std/assert";
import { Rating } from "ts-fsrs";
import { HttpError } from "@/lib/errors.ts";
import { mapRatingToFsrs } from "@/lib/fsrs.ts";
import { kvKeys } from "@/lib/kv.ts";
import { parseCreateWord, parseReviewRating } from "@/lib/validation.ts";

Deno.test("parseCreateWord trims text and normalizes tags", () => {
  const input = parseCreateWord({
    spanish: "  hablar ",
    romanian: " a vorbi ",
    example: " Yo hablo. ",
    tags: "verb, prezent, ",
  });

  assertEquals(input, {
    spanish: "hablar",
    romanian: "a vorbi",
    example: "Yo hablo.",
    note: undefined,
    tags: ["verb", "prezent"],
  });
});

Deno.test("validation rejects missing required word fields", () => {
  assertThrows(
    () => parseCreateWord({ spanish: "", romanian: "casă" }),
    HttpError,
    "Cuvântul spaniol este obligatoriu.",
  );
});

Deno.test("review ratings map to FSRS grades", () => {
  assertEquals(mapRatingToFsrs("again"), Rating.Again);
  assertEquals(mapRatingToFsrs("hard"), Rating.Hard);
  assertEquals(mapRatingToFsrs("good"), Rating.Good);
  assertEquals(mapRatingToFsrs("easy"), Rating.Easy);
  assertEquals(parseReviewRating({ rating: "good" }), "good");
});

Deno.test("KV key layout is stable", () => {
  assertEquals(kvKeys.word("w1"), ["word", "w1"]);
  assertEquals(kvKeys.card("c1"), ["card", "c1"]);
  assertEquals(kvKeys.cardByWord("w1", "es_to_ro"), [
    "card_by_word",
    "w1",
    "es_to_ro",
  ]);
  assertEquals(kvKeys.review("2026-01-01T00:00:00.000Z", "r1"), [
    "review",
    "2026-01-01T00:00:00.000Z",
    "r1",
  ]);
});
