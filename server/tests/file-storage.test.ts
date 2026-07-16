import { describe, expect, it } from "vitest";
import { contentDispositionFor, storedNameFor, uploadsDir } from "../src/services/files/storage.js";

describe("storedNameFor", () => {
  it("generates a uuid name with the extension of the mime type", () => {
    expect(storedNameFor("application/pdf")).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(storedNameFor("image/jpeg")).toMatch(/\.jpg$/);
    expect(storedNameFor("image/png")).toMatch(/\.png$/);
    expect(storedNameFor("image/webp")).toMatch(/\.webp$/);
  });

  it("rejects disallowed mime types", () => {
    expect(storedNameFor("application/x-sh")).toBeNull();
    expect(storedNameFor("text/html")).toBeNull();
    expect(storedNameFor("image/svg+xml")).toBeNull(); // svg can carry scripts
    expect(storedNameFor("")).toBeNull();
  });

  it("never derives anything from a client name (traversal-proof by construction)", () => {
    // the function does not even accept a name — two calls for the same mime
    // type differ only in the random part
    const a = storedNameFor("application/pdf")!;
    const b = storedNameFor("application/pdf")!;
    expect(a).not.toEqual(b);
    expect(a).not.toContain("/");
    expect(a).not.toContain("..");
  });
});

describe("contentDispositionFor", () => {
  it("keeps plain ascii names in both forms", () => {
    expect(contentDispositionFor("cv.pdf")).toBe(
      `attachment; filename="cv.pdf"; filename*=UTF-8''cv.pdf`,
    );
  });

  it("encodes umlauts per RFC 5987 with an ascii fallback", () => {
    const header = contentDispositionFor("Zeugnis-Übersetzung.pdf");
    expect(header).toContain(`filename="Zeugnis-_bersetzung.pdf"`);
    expect(header).toContain(`filename*=UTF-8''Zeugnis-%C3%9Cbersetzung.pdf`);
  });

  it("neutralizes quotes and backslashes in the fallback", () => {
    const header = contentDispositionFor('a"b\\c.pdf');
    expect(header).toContain(`filename="a_b_c.pdf"`);
  });

  it("uses inline for images when asked", () => {
    expect(contentDispositionFor("photo.jpg", true)).toMatch(/^inline; /);
  });
});

describe("uploadsDir", () => {
  it("scopes uploads per user under server/data/uploads", () => {
    const dir = uploadsDir("user123");
    expect(dir).toMatch(/data[/\\]uploads[/\\]user123$/);
  });
});
