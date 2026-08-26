/** Strips HTML tags for plain-text previews (e.g. a Tiptap-authored
 * Note.body shown truncated in a list row) — not a sanitizer, just for
 * display; never used to render anything back as HTML. */
export function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}
