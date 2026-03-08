import { useRef, useState } from "react";
import { dataManagement } from "../api";

export default function DataPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [wipe, setWipe] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleExport = () => {
    window.location.href = dataManagement.exportUrl;
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a YAML file to import.");
      return;
    }

    if (wipe && !window.confirm(
      "WARNING: This will delete all existing data before importing. Are you sure?"
    )) {
      return;
    }

    setError("");
    setImportLog(null);
    setImporting(true);

    try {
      const result = await dataManagement.import(file, wipe);
      setImportLog(result.log || result.detail);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Data Management</h1>
      </div>

      <div className="card detail-section">
        <h2>Export Data</h2>
        <p style={{ color: "var(--color-text-light)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-md)" }}>
          Download all platform data as a YAML file. This includes permissions,
          roles, regions, families, users, people, role assignments, and
          guardianships.
        </p>
        <button className="btn btn--primary" onClick={handleExport}>
          Download Export
        </button>
      </div>

      <div className="card detail-section">
        <h2>Import Data</h2>
        <p style={{ color: "var(--color-text-light)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-md)" }}>
          Upload a YAML file to populate the platform. The file must have been
          created by the Charmr export function or follow the same format.
        </p>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-field">
          <label htmlFor="import-file">YAML file</label>
          <input
            ref={fileRef}
            id="import-file"
            type="file"
            accept=".yaml,.yml"
          />
        </div>

        <div style={{ marginBottom: "var(--space-md)" }}>
          <label className="checkbox-item" style={{ display: "inline-flex" }}>
            <input
              type="checkbox"
              checked={wipe}
              onChange={(e) => setWipe(e.target.checked)}
            />
            <span style={{ fontSize: "var(--font-size-sm)" }}>
              Wipe existing data before import
            </span>
          </label>
          {wipe && (
            <p style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-xs)" }}>
              This will delete all existing data (except superusers) before
              importing.
            </p>
          )}
        </div>

        <button
          className="btn btn--primary"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? "Importing..." : "Import Data"}
        </button>

        {importLog && (
          <pre
            style={{
              marginTop: "var(--space-md)",
              padding: "var(--space-md)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius)",
              fontSize: "var(--font-size-sm)",
              whiteSpace: "pre-wrap",
              border: "1px solid var(--color-border-light)",
            }}
          >
            {importLog}
          </pre>
        )}
      </div>
    </div>
  );
}
