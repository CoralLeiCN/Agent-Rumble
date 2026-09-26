import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchJsonTransport } from "./httpTransport";

afterEach(() => vi.useRealTimers());

describe("JSON transport failure handling", () => {
  it("aborts a stalled fetch with a typed timeout and clears its timer", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      (_path: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const transport = new FetchJsonTransport({ fetch, timeoutMs: 100 });
    const pending = expect(
      transport.request("/api/v1/catalog"),
    ).rejects.toMatchObject({
      name: "CatalogApiError",
      code: "request_timeout",
    });
    await vi.advanceTimersByTimeAsync(100);
    await pending;
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the deadline active while reading the response body", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      async (_path: RequestInfo | URL, init?: RequestInit) =>
        ({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () =>
                reject(init.signal?.reason),
              );
            }),
        }) as Response,
    );
    const transport = new FetchJsonTransport({ fetch, timeoutMs: 100 });
    const pending = expect(
      transport.request("/api/v1/catalog"),
    ).rejects.toMatchObject({
      code: "request_timeout",
    });
    await vi.advanceTimersByTimeAsync(100);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves caller cancellation and removes its listener", async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const remove = vi.spyOn(caller.signal, "removeEventListener");
    const reason = new Error("The view was closed.");
    const fetch = vi.fn(
      (_path: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const transport = new FetchJsonTransport({ fetch });
    const pending = expect(
      transport.request("/api/v1/catalog", { signal: caller.signal }),
    ).rejects.toBe(reason);
    caller.abort(reason);
    await pending;
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the deadline after a successful response", async () => {
    vi.useFakeTimers();
    const transport = new FetchJsonTransport({
      fetch: vi.fn(async () => Response.json({ ok: true })),
    });
    await expect(transport.request("/api/v1/catalog")).resolves.toEqual({
      ok: true,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([200, 502])(
    "preserves HTTP %s when JSON is malformed",
    async (status) => {
      const transport = new FetchJsonTransport({
        fetch: vi.fn(
          async () =>
            new Response("{broken", {
              status,
              headers: { "Content-Type": "application/json" },
            }),
        ),
      });
      await expect(transport.request("/api/v1/catalog")).rejects.toMatchObject({
        name: "CatalogApiError",
        status,
        code: status === 200 ? "invalid_response" : null,
      });
    },
  );
});
