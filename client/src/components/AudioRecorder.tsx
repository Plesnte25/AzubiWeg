import { useEffect, useRef, useState } from "react";
import { uploadFile } from "../api/client";

/** Picks a mime type MediaRecorder actually supports on this browser. */
function pickMimeType(): string | null {
  const candidates = ["audio/webm", "audio/ogg", "audio/mp4"];
  for (const type of candidates) {
    if (window.MediaRecorder?.isTypeSupported(type)) return type;
  }
  return null;
}

/**
 * Records a short speaking-practice clip via getUserMedia + MediaRecorder,
 * uploads it immediately, and keeps the just-recorded blob around long enough
 * for the learner to review it before submitting the exercise.
 */
export default function AudioRecorder({
  roadmapTaskId,
  syllabusItemId,
  onUploaded,
}: {
  roadmapTaskId?: string;
  syllabusItemId?: string;
  onUploaded: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  async function start() {
    setError(null);
    const mimeType = pickMimeType();
    if (!window.MediaRecorder || !mimeType) {
      setError("Audio recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setUploading(true);
        try {
          const ext = mimeType === "audio/mp4" ? "m4a" : mimeType.split("/")[1];
          const file = new File([blob], `speaking-practice.${ext}`, { type: mimeType });
          const nextPreviewUrl = URL.createObjectURL(blob);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = nextPreviewUrl;
          setPreviewUrl(nextPreviewUrl);

          await uploadFile(file, { kind: "audio_recording", roadmapTaskId, syllabusItemId });
          onUploaded();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
          if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
            setPreviewUrl(null);
          }
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microphone access was denied or unavailable.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {!recording ? (
          <button
            className="rounded border border-line px-2 py-0.5 text-[13px] text-plain-muted hover:bg-plain2 disabled:opacity-60"
            onClick={start}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "🎙 Record speaking practice"}
          </button>
        ) : (
          <button
            className="rounded border border-line bg-tomato px-2 py-0.5 text-[13px] text-on-tile"
            onClick={stop}
          >
            ● Stop recording
          </button>
        )}
        {error && <span className="text-[13px] font-bold text-plain-text">{error}</span>}
      </div>
      {previewUrl && <audio controls preload="metadata" src={previewUrl} className="h-10 w-full max-w-sm" aria-label="Review your speaking recording" />}
    </div>
  );
}
