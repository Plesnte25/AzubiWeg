import { describe, expect, it } from "vitest";
import { htmlToMarkdown, noteFileName, renderNote } from "../src/services/vault/notes.js";

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

  it("turns the editor's HTML into markdown", () => {
    expect(htmlToMarkdown("plain\ntext")).toBe("plain\ntext");
    expect(htmlToMarkdown("<p>mit <strong>Dativ</strong> &amp; <em>nach</em></p><p>zweite</p>")).toBe("mit **Dativ** & *nach*\n\nzweite");
    expect(htmlToMarkdown("<ul><li><p>eins</p></li><li><p>zwei</p><ol><li><p>a</p></li></ol></li></ul><p>danach</p>")).toBe(
      "- eins\n- zwei\n  1. a\n\ndanach",
    );
    expect(htmlToMarkdown('<blockquote><p>Zitat</p><p>zwei</p></blockquote><p><a href="https://x.de?a=1&amp;b">Link</a> <code>der</code></p>')).toBe(
      "> Zitat\n>\n> zwei\n\n[Link](https://x.de?a=1&b) `der`",
    );
    expect(htmlToMarkdown("<pre><code>a  b\nc</code></pre>")).toBe("```\na  b\nc\n```");
  });

  it("names untitled HTML notes from their first line of text", () => {
    expect(noteFileName({ id: "x123456", title: null, body: "<p><strong>Perfekt</strong> mit sein</p><p>zwei</p>" })).toBe("Perfekt mit sein (123456).md");
    expect(noteFileName({ id: "x123456", title: null, body: "<ul><li><p>Liste</p></li></ul>" })).toBe("Liste (123456).md");
  });
});
