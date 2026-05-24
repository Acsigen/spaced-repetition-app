import { useEffect, useState } from "preact/hooks";
import type { DueReview, ReviewRating } from "@/lib/types.ts";

const ratingButtons: Array<{
  rating: ReviewRating;
  label: string;
  tone: string;
}> = [
  { rating: "again", label: "Iar", tone: "danger" },
  { rating: "hard", label: "Greu", tone: "warning" },
  { rating: "good", label: "Bine", tone: "success" },
  { rating: "easy", label: "Ușor", tone: "calm" },
];

export default function StudyApp() {
  const [due, setDue] = useState<DueReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDue() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ due: DueReview[] }>("/api/reviews/due");
      setDue(data.due);
      setRevealed(false);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDue();
  }, []);

  const current = due[0];

  async function submitRating(rating: ReviewRating) {
    if (!current || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/api/reviews/${current.cardId}`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      setDue((cards) => cards.slice(1));
      setRevealed(false);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <section class="panel study-panel">Se încarcă...</section>;
  }

  if (!current) {
    return (
      <section class="empty-state">
        <strong>Nu ai carduri scadente.</strong>
        <span>Adaugă cuvinte noi sau revino mai târziu.</span>
        <a class="button primary" href="/words">Adaugă un cuvânt</a>
      </section>
    );
  }

  return (
    <section class="study-grid">
      <div class="study-card">
        <div class="study-meta">
          <span>
            {current.direction === "es_to_ro" ? "Spaniolă" : "Română"}
          </span>
          <span>{due.length} în coadă</span>
        </div>
        <div class="prompt">{current.prompt}</div>
        {current.tags.length > 0 && (
          <div class="tag-row">
            {current.tags.map((tag) => (
              <span class="tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
        {!revealed && (
          <button
            class="button primary reveal-button"
            type="button"
            onClick={() => setRevealed(true)}
          >
            Arată răspunsul
          </button>
        )}
        {revealed && (
          <div class="answer-block">
            <span>Răspuns</span>
            <strong>{current.answer}</strong>
            {current.example && <p>{current.example}</p>}
            {current.note && <p class="note">{current.note}</p>}
          </div>
        )}
      </div>

      {revealed && (
        <div class="rating-bar" aria-label="Alege ratingul">
          {ratingButtons.map((button) => (
            <button
              class={`rating ${button.tone}`}
              type="button"
              disabled={submitting}
              onClick={() => submitRating(button.rating)}
            >
              {button.label}
            </button>
          ))}
        </div>
      )}

      {error && <p class="error-text">{error}</p>}
    </section>
  );
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Cererea a eșuat.");
  }
  return data;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "A apărut o eroare.";
}
