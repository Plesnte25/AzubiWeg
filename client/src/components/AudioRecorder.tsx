import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CheckCircle, Microphone, Stop } from "@phosphor-icons/react";
import { uploadFile } from "../api/client";
import { clock } from "../lib/tasks";

/** Long enough for any speaking task; stops a recording that was forgotten. */
const MAX_SECONDS = 5 * 60;

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
 * for the learner to review it before submitting the exercise. Sticker style
 * (KNOWN_ISSUES #11): a round mic button; while recording (lemon — speaking and
 * listening tasks open in pink / sky modals) a pulsing dot, a live
 * clock and Stop (auto-stop at 5 min); afterwards a "Saved · 0:23" sticker, the
 * playback and Record again.
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
  const [seconds, setSeconds] = useState(0);
  const [saved, setSaved] = useState<number | null>(null);
  const startedAt = useRef(0);
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
          setSaved(Math.round((Date.now() - startedAt.current) / 1000));
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
      startedAt.current = Date.now();
      setSeconds(0);
      setSaved(null);
      setRecording(true);
    } catch {
      setError("Microphone access was denied or unavailable.");
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  // live clock while recording, and the auto-stop
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 250);
    return () => clearInterval(id);
  }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // a recording still running when the exercise closes is stopped, and its mic released
  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const round = (bg: string, fg: string) => ({
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "2.5px solid var(--line)",
    background: bg,
    color: fg,
    boxShadow: "3px 3px 0 var(--shadow)",
    padding: 0,
    flexShrink: 0,
  });

  return (
    <div
      className="flex flex-col"
      style={{ gap: 10, padding: 12, border: "2.5px solid var(--line)", borderRadius: 16, background: recording ? "var(--lemon)" : "var(--plain2)", color: recording ? "var(--onTile)" : "var(--plainText)", transition: "background .2s" }}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        {recording ? (
          <button type="button" onClick={stop} aria-label="Stop recording" className="press flex cursor-pointer items-center justify-center" style={round("var(--tomato)", "var(--onTile)")}>
            <Stop size={22} weight="fill" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={uploading}
            aria-label={saved !== null ? "Record again" : "Start recording"}
            className="press flex cursor-pointer items-center justify-center disabled:cursor-default disabled:opacity-60"
            style={round("var(--btn)", "var(--btnText)")}
          >
            {saved !== null ? <ArrowCounterClockwise size={22} weight="bold" aria-hidden="true" /> : <Microphone size={24} weight="fill" aria-hidden="true" />}
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
          {recording ? (
            <span className="flex items-center" style={{ gap: 8, fontSize: 15, fontWeight: 700 }} role="status">
              <span aria-hidden="true" className="skeleton" style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--tomato)", border: "2px solid var(--line)" }} />
              Recording
              <span role="timer" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{clock(seconds)}</span>
            </span>
          ) : uploading ? (
            <span style={{ fontSize: 15, fontWeight: 700 }} role="status">Saving your recording…</span>
          ) : saved !== null ? (
            <span className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 15, fontWeight: 700 }}>
              <span
                className="inline-flex items-center"
                style={{ gap: 5, padding: "3px 10px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--mint)", color: "var(--onTile)", fontSize: 13, transform: "rotate(-2deg)" }}
              >
                <CheckCircle size={14} weight="fill" aria-hidden="true" />
                Saved · {clock(saved)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>Listen back, or record again</span>
            </span>
          ) : (
            <>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Record your answer</span>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>Speak freely — up to {MAX_SECONDS / 60} minutes. You can listen back before you submit.</span>
            </>
          )}
          {recording && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>Tap stop when you're done.</span>}
        </div>
      </div>
      {error && (
        <span role="alert" style={{ fontSize: 13, fontWeight: 700, padding: "6px 10px", border: "2px dashed var(--line)", borderRadius: 10 }}>
          {error}
        </span>
      )}
      {previewUrl && !recording && <audio controls preload="metadata" src={previewUrl} className="w-full" style={{ height: 40 }} aria-label="Review your speaking recording" />}
    </div>
  );
}
