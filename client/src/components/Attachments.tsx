import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, downloadFile, fetchFileBlobUrl, uploadFile } from "../api/client";
import type { UploadedFileMeta } from "../api/types";

function FileChip({ file, onChanged }: { file: UploadedFileMeta; onChanged: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const removeFile = useMutation({ mutationFn: api.deleteFile, onSuccess: onChanged });
  const isImage = file.mimeType.startsWith("image/");
  const isAudio = file.mimeType.startsWith("audio/");

  useEffect(() => {
    if (!isImage && !isAudio) return;
    let url: string | null = null;
    let cancelled = false;
    fetchFileBlobUrl(file.id).then((u) => {
      if (cancelled) URL.revokeObjectURL(u);
      else {
        url = u;
        setPreview(u);
      }
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, isImage, isAudio]);

  if (isAudio) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-2 py-1 text-xs">
        {preview && <audio controls src={preview} className="h-7 max-w-56" />}
        <button className="text-ink-400 hover:text-danger-600" title="Remove recording" onClick={() => removeFile.mutate(file.id)}>
          ×
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-2 py-0.5 text-xs">
      {isImage && preview && <img src={preview} alt="" className="size-8 rounded object-cover" />}
      <button
        className="max-w-48 truncate hover:text-brand-700 hover:underline"
        title={`Download ${file.originalName}`}
        onClick={() => downloadFile(file.id, file.originalName)}
      >
        {file.originalName}
      </button>
      <button className="text-ink-400 hover:text-danger-600" title="Remove file" onClick={() => removeFile.mutate(file.id)}>
        ×
      </button>
    </span>
  );
}

export interface AttachmentParent {
  syllabusItemId?: string;
  studySourceId?: string;
  roadmapTaskId?: string;
}

export function Attachments({
  files,
  parent,
  onChanged,
}: {
  files: UploadedFileMeta[];
  parent: AttachmentParent;
  onChanged: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await uploadFile(file, { kind: "document", ...parent });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {files.map((f) => (
        <FileChip key={f.id} file={f} onChanged={onChanged} />
      ))}
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <button
        className="rounded border border-hairline px-2 py-0.5 text-xs text-ink-600 hover:bg-paper"
        disabled={uploading}
        onClick={() => fileInput.current?.click()}
        title="Attach notes (PDF, photo, or .txt)"
      >
        {uploading ? "Uploading…" : "+ notes"}
      </button>
      {error && <span className="text-xs text-danger-600">{error}</span>}
    </div>
  );
}
