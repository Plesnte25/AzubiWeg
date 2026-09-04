import { type ReactNode, useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextB, TextItalic, ListBullets, ListNumbers } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      // mousedown (not click) + preventDefault keeps focus in the editor,
      // so toggling a mark doesn't blur-and-save mid-edit
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "grid size-6 place-items-center rounded text-ink-400 hover:bg-card hover:text-ink-900",
        active && "bg-card text-brand-600",
      )}
    >
      {children}
    </button>
  );
}

/**
 * A deliberately small rich-text editor for freeform Notes (Note.body) —
 * bold/italic/bullet/numbered list only, no headings/tables/images (images
 * are handled by the existing Attachments component, not inline here).
 * Renders flush (no card/background/padding of its own — the handoff's Note
 * Editor textarea is fully transparent), matching whatever surface the
 * caller places it on. Doesn't render its own toolbar: the handoff has one
 * bottom toolbar row shared with the word count, not one bolted directly
 * under the body, so callers render `MinimalTiptapToolbar` wherever that
 * row belongs (see NoteEditor.tsx) using the editor instance handed back
 * via `onEditorReady`.
 */
export function MinimalTiptap({
  content,
  onChange,
  onBlur,
  placeholder,
  className,
  autoFocus,
  editable = true,
  onEditorReady,
}: {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Read-only "reading view" when false — larger line-height, no cursor,
   * same content. Toggled by NoteEditor.tsx's Read/Edit switch. */
  editable?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Type a note…" }),
    ],
    content,
    editable,
    autofocus: autoFocus ? "end" : false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: cn(
          "max-w-none text-body outline-none",
          "[&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-hairline [&_blockquote]:pl-2 [&_blockquote]:text-ink-600",
          "[&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-ink-400 [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          !editable && "[&_p]:my-2.5 text-[15px] leading-[1.75]",
        ),
      },
    },
  });

  // keep the editor synced if `content` changes from outside (e.g. switching
  // which note is being edited) without fighting the user's own typing.
  // isDestroyed guard: this effect can still fire with a stale `editor`
  // reference after the editor itself has torn down (e.g. a route change
  // that unmounts this component in the same commit as an unrelated state
  // update elsewhere) — calling .getHTML() on a destroyed editor throws
  // inside ProseMirror's DOMSerializer, crashing the whole route.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content !== editor.getHTML()) editor.commands.setContent(content, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  // Tiptap's `editable` option isn't reactive — flipping the Read/Edit
  // toggle needs an explicit setEditable call, not just a re-render.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return <EditorContent editor={editor} className={className} />;
}

/** The handoff's single bottom toolbar row — formatting icons plus the
 * note's word count, right-aligned, sitting below the tag row at the very
 * bottom of the screen (not directly under the body). See NoteEditor.tsx. */
export function MinimalTiptapToolbar({ editor, wordCount }: { editor: Editor | null; wordCount: number }) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 border-t border-hairline pt-1.5">
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <TextB size={14} weight="regular" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <TextItalic size={14} weight="regular" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <ListBullets size={14} weight="regular" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListNumbers size={14} weight="regular" aria-hidden="true" />
      </ToolbarButton>
      <span className="ml-auto text-[11px]" style={{ color: "rgba(233,233,237,.35)" }}>
        {wordCount} words
      </span>
    </div>
  );
}
