import { type ReactNode, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
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
 * Styled with the same ghost-composer chrome as Textarea's ghost variant
 * (bg-paper box, bg-hairline-soft on focus) so it matches every other
 * note-composer surface in the app.
 */
export function MinimalTiptap({
  content,
  onChange,
  onBlur,
  placeholder,
  className,
  autoFocus,
}: {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Type a note…" }),
    ],
    content,
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
        ),
      },
    },
  });

  // keep the editor synced if `content` changes from outside (e.g. switching
  // which note is being edited) without fighting the user's own typing
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) editor.commands.setContent(content, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md bg-paper p-2.5 transition-colors focus-within:bg-hairline-soft", className)}>
      <EditorContent editor={editor} />
      <div className="mt-1.5 flex items-center gap-0.5 border-t border-hairline pt-1.5">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="size-3.5" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="size-3.5" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="size-3.5" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="size-3.5" aria-hidden="true" />
        </ToolbarButton>
      </div>
    </div>
  );
}
