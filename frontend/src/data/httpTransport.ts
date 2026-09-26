export interface JsonTransport {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface HttpTransportOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export class CatalogApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: unknown;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    details?: unknown,
  ) {
    super(message);
    this.name = "CatalogApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  detail?: unknown;
}

function normalizeBaseUrl(baseUrl: string | undefined) {
  return (baseUrl ?? "").trim().replace(/\/+$/, "");
}

function errorFrom(response: Response, body: unknown) {
  const envelope =
    body && typeof body === "object" ? (body as ErrorEnvelope) : undefined;
  const error = envelope?.error;
  const message =
    typeof error?.message === "string"
      ? error.message
      : typeof envelope?.detail === "string"
        ? envelope.detail
        : `Catalog API request failed with HTTP ${response.status}.`;
  return new CatalogApiError(
    message,
    response.status,
    typeof error?.code === "string" ? error.code : null,
    error?.details ?? envelope?.detail,
  );
}

export class FetchJsonTransport implements JsonTransport {
  private readonly baseUrl: string;
  private readonly fetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(options: HttpTransportOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new Error(
        "The API request timeout must be a finite positive number.",
      );
    }
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(init.signal?.reason);
    if (init.signal?.aborted) abortFromCaller();
    else
      init.signal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = globalThis.setTimeout(
      () =>
        controller.abort(
          new CatalogApiError(
            "Catalog API request timed out.",
            0,
            "request_timeout",
          ),
        ),
      this.timeoutMs,
    );
    try {
      controller.signal.throwIfAborted();
      const response = await this.fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.toLowerCase().includes("application/json");
      let body: unknown;
      try {
        body = isJson ? await response.json() : await response.text();
      } catch (caught) {
        // Keep transport failures distinct from a syntactically invalid payload.
        if (controller.signal.aborted || !(caught instanceof SyntaxError))
          throw caught;
        if (!response.ok) throw errorFrom(response, undefined);
        throw new CatalogApiError(
          "Catalog API returned invalid JSON.",
          response.status,
          "invalid_response",
        );
      }

      if (!response.ok) throw errorFrom(response, body);
      if (!isJson) {
        throw new CatalogApiError(
          "Catalog API returned a non-JSON response.",
          response.status,
          "invalid_response",
        );
      }
      return body as T;
    } catch (caught) {
      if (controller.signal.aborted) throw controller.signal.reason;
      throw caught;
    } finally {
      globalThis.clearTimeout(timeout);
      init.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}
