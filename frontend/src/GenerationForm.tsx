import { useEffect, useRef, useState } from "react";
import { readCatalogGatewayConfig } from "./data/catalogConfig";
import { FetchJsonTransport } from "./data/httpTransport";

interface GeneratedCard {
  generation_id: string;
  card: unknown;
  published: false;
}
export function GenerationForm() {
  const [url, setUrl] = useState("");
  const [boundary, setBoundary] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedCard | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function generate(refresh = false) {
    const current = new AbortController();
    controller.current = current;
    setPending(true);
    setError(null);
    try {
      const transport = new FetchJsonTransport({
        baseUrl: readCatalogGatewayConfig().apiBaseUrl,
        timeoutMs: 20 * 60 * 1000,
      });
      const card = await transport.request<GeneratedCard>(
        refresh && result
          ? `/api/v1/generation/${result.generation_id}/refresh`
          : "/api/v1/generation",
        {
          method: "POST",
          signal: current.signal,
          body: refresh
            ? undefined
            : JSON.stringify({
                repository_url: url,
                project_boundary: boundary,
              }),
        },
      );
      setResult(card);
    } catch (caught) {
      setError(
        current.signal.aborted
          ? "Request cancelled. If analysis completed before cancellation, its stored result is retained."
          : caught instanceof Error
            ? caught.message
            : "Generation failed.",
      );
    } finally {
      setPending(false);
      controller.current = null;
    }
  }
  return (
    <details className="generation-panel">
      <summary>Generate a card from a public GitHub repository</summary>
      <p>
        Static analysis produces a validated draft for review. Generation can
        take several minutes. Drafts are stored separately from the public
        catalog.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
      >
        <label>
          Public GitHub repository URL
          <input
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
          />
        </label>
        <label>
          Project boundary
          <textarea
            required
            maxLength={2000}
            value={boundary}
            onChange={(event) => setBoundary(event.target.value)}
            placeholder="What this card should cover"
          />
        </label>
        <button
          type="submit"
          className="button button--primary"
          disabled={pending || !boundary.trim()}
        >
          {pending ? "Analyzing repository…" : "Generate card"}
        </button>
        {pending && (
          <button
            type="button"
            className="button button--quiet"
            onClick={() => controller.current?.abort()}
          >
            Cancel request
          </button>
        )}
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <section aria-label="Generated draft">
          <p role="status">
            Validated draft saved. It has not been published to the catalog.
          </p>
          <p>
            Retrieval reference: <code>{result.generation_id}</code>
          </p>
          <button
            className="button button--quiet"
            type="button"
            disabled={pending}
            onClick={() => void generate(true)}
          >
            Refresh from latest source
          </button>
          <a
            className="button button--quiet"
            href={`${readCatalogGatewayConfig().apiBaseUrl}/api/v1/generation/${result.generation_id}`}
            target="_blank"
            rel="noreferrer"
          >
            Open stored result
          </a>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(result.card, null, 2)], {
                  type: "application/json",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = "project-card.json";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 0);
            }}
          >
            Download canonical card
          </button>
          <details>
            <summary>View canonical JSON</summary>
            <pre>{JSON.stringify(result.card, null, 2)}</pre>
          </details>
        </section>
      )}
    </details>
  );
}
