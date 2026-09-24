/** Strips HTML tags for plain-text previews (e.g. a Tiptap-authored
 * Note.body shown truncated in a list row) — not a sanitizer, just for
 * display; never used to render anything back as HTML. */
export function stripHtml(html: string): string {
  // a space after each block so paragraphs don't run together ("Line oneLine two"); DOMParser (not innerHTML on a
  // live element) so nothing in the markup loads or runs
  const spaced = html.replace(/<\/(p|li|h[1-6]|blockquote|div)>|<br\s*\/?>/gi, "$& ");
  const doc = new DOMParser().parseFromString(spaced, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
