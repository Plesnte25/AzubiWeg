import { useRef, useState } from "react";
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
 * then uploads it as a roadmapTaskId-attached UploadedFile. No playback of
 * the in-progress recording here — the uploaded clip shows up as a normal
 * attachment (via Attachments/FileChip) once the upload completes.
 */
export default function AudioRecorder({
  roadmapTaskId,
  onUploaded,
}: {
  roadmapTaskId: string;
  onUploaded: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
          await uploadFile(file, { kind: "audio_recording", roadmapTaskId });
          onUploaded();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
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
    <div className="flex items-center gap-2">
      {!recording ? (
        <button
          className="rounded border border-hairline px-2 py-0.5 text-xs text-ink-600 hover:bg-paper disabled:opacity-60"
          onClick={start}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "🎙 Record speaking practice"}
        </button>
      ) : (
        <button
          className="rounded border border-danger-600 bg-danger-50 px-2 py-0.5 text-xs text-danger-600"
          onClick={stop}
        >
          ● Stop recording
        </button>
      )}
      {error && <span className="text-xs text-danger-600">{error}</span>}
    </div>
  );
}
