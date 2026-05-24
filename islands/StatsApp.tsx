import { useEffect, useState } from "preact/hooks";
import type { Stats } from "@/lib/types.ts";

export default function StatsApp() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Cererea a eșuat.");
        setStats(data.stats);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Eroare.")
      );
  }, []);

  if (error) return <p class="error-text">{error}</p>;
  if (!stats) return <section class="panel">Se încarcă...</section>;

  return (
    <div class="stats-layout">
      <section class="metric-grid">
        <Metric label="Scadente" value={stats.dueCount} />
        <Metric label="Active" value={stats.activeWordCount} />
        <Metric label="Învățate" value={stats.learnedWordCount} />
        <Metric label="Reviewuri" value={stats.reviewCount} />
      </section>

      <section class="panel">
        <div class="section-heading">
          <h2>Recente</h2>
          <span>{stats.archivedWordCount} arhivate</span>
        </div>
        {stats.recentReviews.length === 0
          ? <p class="muted">Nu există reviewuri încă.</p>
          : (
            <div class="review-list">
              {stats.recentReviews.map((review) => (
                <article class="review-row">
                  <div>
                    <strong>
                      {review.word
                        ? `${review.word.spanish} / ${review.word.romanian}`
                        : review.wordId}
                    </strong>
                    <span>
                      {review.direction === "es_to_ro"
                        ? "Spaniolă → română"
                        : "Română → spaniolă"}
                    </span>
                  </div>
                  <div>
                    <span class={`rating-pill ${review.rating}`}>
                      {ratingLabel(review.rating)}
                    </span>
                    <time>{formatDate(review.reviewedAt)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article class="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ratingLabel(rating: string): string {
  switch (rating) {
    case "again":
      return "Iar";
    case "hard":
      return "Greu";
    case "good":
      return "Bine";
    case "easy":
      return "Ușor";
    default:
      return rating;
  }
}

function formatDate(input: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}
