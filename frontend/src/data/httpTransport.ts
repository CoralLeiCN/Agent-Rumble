export interface JsonTransport {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface HttpTransportOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export class CatalogApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: unknown;

  constructor(message: string, status: number, code: string | null = null, details?: unknown) {
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
  const envelope = body && typeof body === "object" ? body as ErrorEnvelope : undefined;
  const error = envelope?.error;
  const message = typeof error?.message === "string"
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

  constructor(options: HttpTransportOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await this.fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body: unknown = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw errorFrom(response, body);
    }
    if (!contentType.includes("application/json")) {
      throw new CatalogApiError(
        "Catalog API returned a non-JSON response.",
        response.status,
        "invalid_response",
      );
    }
    return body as T;
  }
}
