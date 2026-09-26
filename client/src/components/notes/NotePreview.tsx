import type { CSSProperties, ReactNode } from "react";

/**
 * A note's TipTap HTML as a compact, formatted preview: paragraphs, bullet and numbered lists, headings, quotes and
 * bold/italic/underline/strike/code survive; everything else is reduced to its text. Built as React elements from a
 * DOMParser tree (nothing is set as innerHTML, so nothing in the markup loads or runs), and only from spans, so it
 * is valid inside the button a sticky note is. Clamped to `lines`.
 */
export function NotePreview({ html, lines, style }: { html: string; lines: number; style?: CSSProperties }) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const content = convertChildren(doc.body, "0");
  if (!doc.body.textContent?.trim()) return null;
  return (
    <span
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
        overflow: "hidden",
        overflowWrap: "anywhere",
        ...style,
      }}
    >
      {content}
    </span>
  );
}

const block: CSSProperties = { display: "block" };
const INLINE: Record<string, CSSProperties> = {
  STRONG: { fontWeight: 800 },
  B: { fontWeight: 800 },
  EM: { fontStyle: "italic" },
  I: { fontStyle: "italic" },
  U: { textDecoration: "underline" },
  S: { textDecoration: "line-through" },
  CODE: { fontFamily: "var(--font-mono)", fontSize: "0.92em" },
  MARK: { background: "var(--hl)" },
};

function convertChildren(parent: Node, key: string): ReactNode[] {
  return [...parent.childNodes].map((node, i) => convert(node, `${key}.${i}`));
}

function convert(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName;
  const children = convertChildren(el, key);

  if (tag === "UL" || tag === "OL") {
    const items = [...el.children].filter((c) => c.tagName === "LI");
    return (
      <span key={key} style={{ ...block, margin: "2px 0" }}>
        {items.map((li, i) => (
          <span key={`${key}.${i}`} style={{ display: "flex", gap: 6 }}>
            <span aria-hidden="true" style={{ flexShrink: 0 }}>
              {tag === "OL" ? `${i + 1}.` : "•"}
            </span>
            <span style={{ minWidth: 0 }}>{convertChildren(li, `${key}.${i}`)}</span>
          </span>
        ))}
      </span>
    );
  }
  if (tag === "P" || tag === "DIV") {
    // a paragraph inside a list item is just the item's text
    const inItem = el.parentElement?.tagName === "LI";
    return (
      <span key={key} style={inItem ? undefined : { ...block, margin: "0 0 3px" }}>
        {children}
      </span>
    );
  }
  if (/^H[1-6]$/.test(tag)) {
    return (
      <span key={key} style={{ ...block, fontWeight: 800 }}>
        {children}
      </span>
    );
  }
  if (tag === "BLOCKQUOTE") {
    return (
      <span key={key} style={{ ...block, paddingLeft: 8, borderLeft: "2.5px solid currentColor" }}>
        {children}
      </span>
    );
  }
  if (tag === "BR") return <br key={key} />;
  if (INLINE[tag]) {
    return (
      <span key={key} style={INLINE[tag]}>
        {children}
      </span>
    );
  }
  return <span key={key}>{children}</span>;
}
