import { useState } from "preact/hooks";

export default function SettingsApp() {
  const [backupText, setBackupText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/backup");
      const text = await response.text();
      if (!response.ok) {
        const data = JSON.parse(text);
        throw new Error(data.error ?? "Exportul a eșuat.");
      }
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "spanish-srs-backup.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Backup exportat.");
    } catch (exportError) {
      setError(errorMessage(exportError));
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(event: Event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(backupText);
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Importul a eșuat.");
      setBackupText("");
      setMessage("Backup importat.");
    } catch (importError) {
      setError(errorMessage(importError));
    } finally {
      setBusy(false);
    }
  }

  async function readFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setBackupText(await file.text());
  }

  return (
    <div class="settings-layout">
      <section class="panel settings-panel">
        <h2>Backup</h2>
        <button
          class="button primary"
          type="button"
          disabled={busy}
          onClick={exportBackup}
        >
          Exportă JSON
        </button>
      </section>

      <form class="panel settings-panel" onSubmit={importBackup}>
        <h2>Import</h2>
        <input type="file" accept="application/json" onChange={readFile} />
        <textarea
          value={backupText}
          onInput={(event) =>
            setBackupText((event.currentTarget as HTMLTextAreaElement).value)}
          rows={10}
          placeholder="Lipește backupul JSON"
        />
        <button
          class="button danger"
          type="submit"
          disabled={busy || !backupText.trim()}
        >
          Înlocuiește datele
        </button>
      </form>

      {message && <p class="success-text">{message}</p>}
      {error && <p class="error-text">{error}</p>}
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "A apărut o eroare.";
}
