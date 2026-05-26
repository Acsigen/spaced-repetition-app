import { useEffect, useMemo, useState } from "preact/hooks";
import type { Word } from "@/lib/types.ts";

interface WordForm {
  spanish: string;
  romanian: string;
  example: string;
  note: string;
  tags: string;
}

const emptyForm: WordForm = {
  spanish: "",
  romanian: "",
  example: "",
  note: "",
  tags: "",
};

export default function WordsApp() {
  const [words, setWords] = useState<Word[]>([]);
  const [form, setForm] = useState<WordForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWords() {
    setError(null);
    try {
      const data = await fetchJson<{ words: Word[] }>(
        "/api/words?includeArchived=1",
      );
      setWords(data.words);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  useEffect(() => {
    loadWords();
  }, []);

  const filteredWords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ro");
    return words.filter((word) => {
      if (!showArchived && word.archived) return false;
      if (!normalizedQuery) return true;
      return [
        word.spanish,
        word.romanian,
        word.example,
        word.note,
        ...word.tags,
      ].some((value) =>
        value?.toLocaleLowerCase("ro").includes(normalizedQuery)
      );
    });
  }, [words, query, showArchived]);

  async function saveWord(event: Event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({
        spanish: form.spanish,
        romanian: form.romanian,
        example: form.example,
        note: form.note,
        tags: form.tags,
      });
      if (editingId) {
        await fetchJson(`/api/words/${editingId}`, {
          method: "PATCH",
          body,
        });
      } else {
        await fetchJson("/api/words", {
          method: "POST",
          body,
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadWords();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function editWord(word: Word) {
    setEditingId(word.id);
    setForm({
      spanish: word.spanish,
      romanian: word.romanian,
      example: word.example ?? "",
      note: word.note ?? "",
      tags: word.tags.join(", "),
    });
  }

  async function archiveWord(word: Word) {
    setError(null);
    try {
      if (word.archived) {
        await fetchJson(`/api/words/${word.id}`, {
          method: "PATCH",
          body: JSON.stringify({ archived: false }),
        });
      } else {
        await fetchJson(`/api/words/${word.id}`, { method: "DELETE" });
      }
      await loadWords();
    } catch (archiveError) {
      setError(errorMessage(archiveError));
    }
  }

  return (
    <div class="words-layout">
      <form class="panel word-form" onSubmit={saveWord}>
        <label>
          <span>Spaniolă</span>
          <input
            value={form.spanish}
            onInput={(event) =>
              setForm({ ...form, spanish: inputValue(event) })}
            autocomplete="off"
            required
          />
        </label>
        <label>
          <span>Română</span>
          <input
            value={form.romanian}
            onInput={(event) =>
              setForm({ ...form, romanian: inputValue(event) })}
            autocomplete="off"
            required
          />
        </label>
        <label>
          <span>Exemplu</span>
          <textarea
            value={form.example}
            onInput={(event) =>
              setForm({ ...form, example: inputValue(event) })}
            rows={3}
          />
        </label>
        <label>
          <span>Notă</span>
          <textarea
            value={form.note}
            onInput={(event) => setForm({ ...form, note: inputValue(event) })}
            rows={2}
          />
        </label>
        <label>
          <span>Etichete</span>
          <input
            value={form.tags}
            onInput={(event) => setForm({ ...form, tags: inputValue(event) })}
            placeholder="gramatică, verb"
          />
        </label>
        <div class="form-actions">
          <button class="button primary" type="submit" disabled={saving}>
            {editingId ? "Salvează" : "Adaugă"}
          </button>
          {editingId && (
            <button
              class="button ghost"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Renunță
            </button>
          )}
        </div>
      </form>

      <section class="word-list-section">
        <div class="list-toolbar">
          <input
            class="search-input"
            value={query}
            onInput={(event) => setQuery(inputValue(event))}
            placeholder="Caută"
          />
          <label class="toggle-row">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(
                (event.currentTarget as HTMLInputElement).checked,
              )}
            />
            <span>Arhivate</span>
          </label>
        </div>
        {error && <p class="error-text">{error}</p>}
        <div class="word-list">
          {filteredWords.map((word) => (
            <article class={word.archived ? "word-card archived" : "word-card"}>
              <div>
                <span class="word-main">{word.spanish}</span>
                <span class="word-translation">{word.romanian}</span>
              </div>
              {word.example && <p>{word.example}</p>}
              {word.note && <p class="note">{word.note}</p>}
              {word.tags.length > 0 && (
                <div class="tag-row">
                  {word.tags.map((tag) => (
                    <span class="tag" key={tag}>{tag}</span>
                  ))}
                </div>
              )}
              <div class="word-actions">
                <button
                  class="button ghost"
                  type="button"
                  onClick={() =>
                    editWord(word)}
                >
                  Editează
                </button>
                <button
                  class="button ghost"
                  type="button"
                  onClick={() => archiveWord(word)}
                >
                  {word.archived ? "Restaurează" : "Arhivează"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
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
  if (!response.ok) throw new Error(data.error ?? "Cererea a eșuat.");
  return data;
}

function inputValue(event: Event): string {
  return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "A apărut o eroare.";
}
