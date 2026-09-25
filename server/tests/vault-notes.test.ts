import { describe, expect, it } from "vitest";
import { noteFileName, renderNote } from "../src/services/vault/notes.js";

const note = {
  id: "cmabcdefgh123456",
  title: "Dativ: mit / nach?",
  body: "mit + Dativ\nnach + Dativ",
  category: "grammar" as const,
  skill: null,
  pinned: true,
  createdAt: new Date("2026-09-20T10:00:00Z"),
  updatedAt: new Date("2026-09-25T10:00:00Z"),
};

describe("vault notes", () => {
  it("names the file from the title, safe on every OS, with the id tail", () => {
    expect(noteFileName(note)).toBe("Dativ mit nach (123456).md");
    expect(noteFileName({ ...note, title: null })).toBe("mit + Dativ (123456).md");
    expect(noteFileName({ ...note, title: "  ", body: null })).toBe("Untitled note (123456).md");
  });

  it("renders frontmatter carrying the note id, then the title and body", () => {
    const md = renderNote(note);
    expect(md.startsWith("---\nazubiweg-id: cmabcdefgh123456\ncategory: grammar\npinned: true\n")).toBe(true);
    expect(md).toContain("updated: 2026-09-25\ntags: [azubiweg]\n---\n\n# Dativ: mit / nach?\n\nmit + Dativ\nnach + Dativ\n");
  });
});
