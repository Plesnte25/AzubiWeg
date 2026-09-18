import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPonsBudget,
  extractPonsCandidates,
  ponsDiagnosticEligible,
  ponsSanitize,
  runPonsDiagnostic,
  type PonsBudget,
} from "../src/services/enrichment/pons.js";

describe("ponsSanitize", () => {
  it("strips HTML tags", () => {
    expect(ponsSanitize("<i>castle</i>")).toBe("castle");
  });

  it("strips control characters", () => {
    expect(ponsSanitize("cas\x00tle\x1f")).toBe("castle");
  });

  it("collapses whitespace and trims", () => {
    expect(ponsSanitize("  castle   or   lock  ")).toBe("castle or lock");
  });

  it("caps length", () => {
    expect(ponsSanitize("a".repeat(100), 10)).toHaveLength(10);
  });

  it("never leaks a raw script-like payload verbatim", () => {
    expect(ponsSanitize("<script>evil()</script>ok")).toBe("evil()ok");
  });
});

describe("extractPonsCandidates", () => {
  it("collects translations from a plain entry", () => {
    const hits = [
      { type: "entry", roms: [{ arabs: [{ translations: [{ target: "castle" }, { target: "lock" }] }] }] },
    ];
    expect(extractPonsCandidates(hits)).toEqual(["castle", "lock"]);
  });

  it("unwraps entry_with_secondary_entries via primary_entry", () => {
    const hits = [
      {
        type: "entry_with_secondary_entries",
        primary_entry: { type: "entry", roms: [{ arabs: [{ translations: [{ target: "bank" }] }] }] },
      },
    ];
    expect(extractPonsCandidates(hits)).toEqual(["bank"]);
  });

  it("skips a hit whose (unwrapped) type isn't a real entry", () => {
    const hits = [{ type: "rom" as const, roms: [{ arabs: [{ translations: [{ target: "nope" }] }] }] }];
    expect(extractPonsCandidates(hits)).toEqual([]);
  });

  it("caps at 3 candidates across multiple hits", () => {
    const hits = [
      { type: "entry", roms: [{ arabs: [{ translations: [{ target: "a" }, { target: "b" }] }] }] },
      { type: "entry", roms: [{ arabs: [{ translations: [{ target: "c" }, { target: "d" }] }] }] },
    ];
    expect(extractPonsCandidates(hits)).toEqual(["a", "b", "c"]);
  });

  it("sanitizes each candidate", () => {
    const hits = [{ type: "entry", roms: [{ arabs: [{ translations: [{ target: "<b>castle</b>" }] }] }] }];
    expect(extractPonsCandidates(hits)).toEqual(["castle"]);
  });

  it("returns [] for empty hits", () => {
    expect(extractPonsCandidates([])).toEqual([]);
  });

  it("handles missing roms/arabs/translations without throwing", () => {
    expect(extractPonsCandidates([{ type: "entry" }])).toEqual([]);
  });
});

describe("ponsDiagnosticEligible", () => {
  it("eligible when review-flagged", () => {
    expect(ponsDiagnosticEligible(true, null)).toBe(true);
  });

  it("eligible when a form note exists, even without review", () => {
    expect(ponsDiagnosticEligible(false, "bist = second-person singular present of sein")).toBe(true);
  });

  it("not eligible when neither signal is present", () => {
    expect(ponsDiagnosticEligible(false, null)).toBe(false);
  });
});

describe("createPonsBudget", () => {
  const ORIGINAL = process.env.PONS_API_KEY;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.PONS_API_KEY;
    else process.env.PONS_API_KEY = ORIGINAL;
  });

  it("disabled by default with no PONS_API_KEY set", () => {
    delete process.env.PONS_API_KEY;
    expect(createPonsBudget().disabled).toBe(true);
  });

  it("enabled with a real remaining count when a key is set", () => {
    process.env.PONS_API_KEY = "test-key";
    const budget = createPonsBudget();
    expect(budget.disabled).toBe(false);
    expect(budget.remaining).toBeGreaterThan(0);
  });
});

describe("runPonsDiagnostic", () => {
  const ORIGINAL = process.env.PONS_API_KEY;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.PONS_API_KEY = "test-key";
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.PONS_API_KEY;
    else process.env.PONS_API_KEY = ORIGINAL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
    return {
      status,
      headers: { get: (k: string) => headers[k] ?? (status === 200 ? (k === "Content-Type" ? "application/json" : null) : null) },
      json: async () => body,
    } as unknown as Response;
  }

  it("never calls fetch when the budget is disabled", async () => {
    const budget: PonsBudget = { remaining: 25, disabled: true };
    await runPonsDiagnostic("Schloss", budget);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never calls fetch when the budget is exhausted", async () => {
    const budget: PonsBudget = { remaining: 0, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs a sanitized single line on a 200 with real translations, decrements the budget by 1", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { hits: [{ type: "entry", roms: [{ arabs: [{ translations: [{ target: "castle" }, { target: "lock" }] }] }] }] }),
    );
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(logSpy).toHaveBeenCalledWith("[PONS diagnostic for Schloss: castle / lock]");
    expect(budget.remaining).toBe(24);
    expect(budget.disabled).toBe(false);
  });

  it("never leaks the API key into a log line", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hits: [] }));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    const allLogged = [...logSpy.mock.calls, ...warnSpy.mock.calls].flat().join(" ");
    expect(allLogged).not.toContain("test-key");
  });

  it("sanitizes the word itself before logging it -- resolveViaKaikki's not-found fallback carries the raw typed string through as headword, so this can't be assumed clean", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hits: [{ type: "entry", roms: [{ arabs: [{ translations: [{ target: "castle" }] }] }] }] }));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss\nFAKE LOG LINE: admin logged in", budget);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = logSpy.mock.calls[0]![0] as string;
    expect(logged).not.toContain("\n");
    expect(logged).toBe("[PONS diagnostic for SchlossFAKE LOG LINE: admin logged in: castle]");
  });

  it("204 -- no log, not disabled, budget still decremented", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204, null));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(logSpy).not.toHaveBeenCalled();
    expect(budget.disabled).toBe(false);
    expect(budget.remaining).toBe(24);
  });

  it("400/401/403 -- disables the budget for the rest of the batch", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, null));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(budget.disabled).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("429 with a short Retry-After retries once and succeeds, costing 2 requests", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, null, { "Retry-After": "1" }))
      .mockResolvedValueOnce(jsonResponse(200, { hits: [{ type: "entry", roms: [{ arabs: [{ translations: [{ target: "castle" }] }] }] }] }));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    const p = runPonsDiagnostic("Schloss", budget);
    await vi.runAllTimersAsync();
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(budget.remaining).toBe(23);
    expect(budget.disabled).toBe(false);
    expect(logSpy).toHaveBeenCalledWith("[PONS diagnostic for Schloss: castle]");
    vi.useRealTimers();
  });

  it("429 with no Retry-After disables the budget without retrying", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, null));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(budget.disabled).toBe(true);
  });

  it("429 with a too-long Retry-After (>10s) disables without retrying, never sleeps past the cap", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, null, { "Retry-After": "3600" }));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(budget.disabled).toBe(true);
  });

  it("5xx retries once (2 requests against the cap), then gives up quietly if still failing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, null)).mockResolvedValueOnce(jsonResponse(503, null));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(budget.remaining).toBe(23);
    expect(budget.disabled).toBe(false); // a 5xx hiccup must never disable the whole batch
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("malformed JSON on a 200 disables the budget", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      headers: { get: (k: string) => (k === "Content-Type" ? "application/json" : null) },
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown as Response);
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(budget.disabled).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("non-JSON Content-Type on a 200 is skipped, not treated as an error", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      headers: { get: (k: string) => (k === "Content-Type" ? "text/html" : null) },
      json: async () => ({ hits: [] }),
    } as unknown as Response);
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(budget.disabled).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("a network throw/timeout is swallowed -- never propagates, never disables the batch", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await expect(runPonsDiagnostic("Schloss", budget)).resolves.toBeUndefined();
    expect(budget.disabled).toBe(false);
    expect(budget.remaining).toBe(24);
  });

  it("a 200 with no real candidates logs nothing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hits: [] }));
    const budget: PonsBudget = { remaining: 25, disabled: false };
    await runPonsDiagnostic("Schloss", budget);
    expect(logSpy).not.toHaveBeenCalled();
    expect(budget.disabled).toBe(false);
  });
});
