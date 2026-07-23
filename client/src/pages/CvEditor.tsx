import { type ReactNode, useEffect, useRef, useState } from "react";
import { pdf, PDFViewer } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import { api, fetchFileBlobUrl, uploadFile } from "../api/client";
import type { CvContent, CvTemplate } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import CvDocument from "../pdf/CvDocument";
import { fullName } from "../pdf/shared";

export default function CvEditor() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["cv", id], queryFn: () => api.cv(id!) });
  const cv = data?.cv;

  const [content, setContent] = useState<CvContent | null>(null);
  // separate, more-debounced copy for the PDF preview — rendering the
  // document on every keystroke would jank the form
  const [previewContent, setPreviewContent] = useState<CvContent | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [exporting, setExporting] = useState(false);

  // load server state into local form state once per CV
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (cv && loadedFor.current !== cv.id) {
      loadedFor.current = cv.id;
      setContent(cv.content);
      setPreviewContent(cv.content);
      setSaveState("saved");
    }
  }, [cv]);

  // the photo goes into react-pdf as a data URL: <Image> can't send the
  // Authorization header, and data URLs also survive the PDF worker
  useEffect(() => {
    let cancelled = false;
    if (!cv?.photoFileId) {
      setPhotoDataUrl(null);
      return;
    }
    (async () => {
      const blobUrl = await fetchFileBlobUrl(cv.photoFileId!);
      const blob = await (await fetch(blobUrl)).blob();
      URL.revokeObjectURL(blobUrl);
      const reader = new FileReader();
      reader.onload = () => {
        if (!cancelled) setPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(blob);
    })();
    return () => {
      cancelled = true;
    };
  }, [cv?.photoFileId]);

  const save = useMutation({
    mutationFn: (c: CvContent) => api.updateCv(id!, { content: c }),
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
    onError: () => setSaveState("error"),
  });

  // debounced autosave (800 ms) + preview refresh (500 ms)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(null);
  function update(next: CvContent) {
    setContent(next);
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate(next), 800);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreviewContent(next), 500);
  }

  const setTemplate = useMutation({
    mutationFn: (template: CvTemplate) => api.updateCv(id!, { template }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv", id] });
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
  });

  async function onPhotoUpload(file: File) {
    const meta = await uploadFile(file, { kind: "cv_photo" });
    await api.updateCv(id!, { photoFileId: meta.id });
    queryClient.invalidateQueries({ queryKey: ["cv", id] });
  }

  async function onPhotoRemove() {
    await api.updateCv(id!, { photoFileId: null });
    queryClient.invalidateQueries({ queryKey: ["cv", id] });
  }

  async function onDownload() {
    if (!content || !cv) return;
    setExporting(true);
    try {
      // same component as the preview → export matches exactly
      const blob = await pdf(
        <CvDocument content={content} template={cv.template} photoDataUrl={photoDataUrl} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = cv.template === "lebenslauf" ? "Lebenslauf" : "CV";
      a.download = `${name}-${(fullName(content) || "export").replace(/\s+/g, "-")}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setExporting(false);
    }
  }

  if (!cv || !content) return <p className="text-ink-400">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/cv" className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-900">
          <ArrowLeft className="size-4" aria-hidden="true" /> CVs
        </Link>
        <h1 className="text-lg font-semibold">{cv.title}</h1>
        <span className="flex items-center gap-1 text-xs text-ink-400">
          {saveState === "saved" && (
            <>
              <Check className="size-3.5 text-ok-600" aria-hidden="true" /> Saved
            </>
          )}
          {saveState === "saving" && "Saving…"}
          {saveState === "dirty" && "Unsaved changes…"}
          {saveState === "error" && <span className="text-danger-600">Save failed — retrying on next edit</span>}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="rounded border border-hairline bg-card px-2 py-1.5 text-sm"
            value={cv.template}
            onChange={(e) => setTemplate.mutate(e.target.value as CvTemplate)}
          >
            <option value="lebenslauf">Lebenslauf (DE)</option>
            <option value="ats">ATS (EN)</option>
          </select>
          <Button loading={exporting} onClick={onDownload}>
            {exporting ? "Exporting…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <PersonalSection
            content={content}
            update={update}
            photoDataUrl={photoDataUrl}
            onPhotoUpload={onPhotoUpload}
            onPhotoRemove={onPhotoRemove}
            isLebenslauf={cv.template === "lebenslauf"}
          />
          <SectionCard title="Profil / Summary">
            <textarea
              rows={3}
              className={inputCls}
              value={content.summary ?? ""}
              onChange={(e) => update({ ...content, summary: e.target.value || undefined })}
            />
          </SectionCard>
          <ExperienceSection content={content} update={update} />
          <EducationSection content={content} update={update} />
          <LanguagesSection content={content} update={update} />
          <SimpleListSection
            title="Kenntnisse / Skills"
            items={content.skills}
            placeholder="e.g. MS Office"
            onChange={(skills) => update({ ...content, skills })}
          />
          <SectionCard title="Interessen / Interests">
            <input
              className={inputCls}
              value={content.interests ?? ""}
              onChange={(e) => update({ ...content, interests: e.target.value || undefined })}
            />
          </SectionCard>
          {cv.template === "lebenslauf" && (
            <SectionCard title="Unterschrift (Ort, Datum)">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputCls}
                  placeholder="Ort"
                  value={content.signature.city ?? ""}
                  onChange={(e) =>
                    update({ ...content, signature: { ...content.signature, city: e.target.value || undefined } })
                  }
                />
                <input
                  type="date"
                  className={inputCls}
                  value={content.signature.date ?? ""}
                  onChange={(e) =>
                    update({ ...content, signature: { ...content.signature, date: e.target.value || undefined } })
                  }
                />
              </div>
            </SectionCard>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {previewContent && (
            <PDFViewer
              key={cv.template}
              width="100%"
              height={760}
              showToolbar={false}
              className="rounded-xl border border-hairline"
            >
              <CvDocument content={previewContent} template={cv.template} photoDataUrl={photoDataUrl} />
            </PDFViewer>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- form sections (local sub-components, per house style) ---------- */

const inputCls =
  "w-full rounded border border-hairline bg-card px-2.5 py-1.5 text-sm placeholder:text-ink-400";

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-ink-600">{label}</span>
      {children}
    </label>
  );
}

function PersonalSection({
  content,
  update,
  photoDataUrl,
  onPhotoUpload,
  onPhotoRemove,
  isLebenslauf,
}: {
  content: CvContent;
  update: (c: CvContent) => void;
  photoDataUrl: string | null;
  onPhotoUpload: (f: File) => Promise<void>;
  onPhotoRemove: () => Promise<void>;
  isLebenslauf: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const p = content.personal;
  const set = (patch: Partial<CvContent["personal"]>) =>
    update({ ...content, personal: { ...p, ...patch } });

  return (
    <SectionCard title="Persönliche Daten">
      <div className="flex gap-4">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <Field label="Vorname">
            <input className={inputCls} value={p.firstName} onChange={(e) => set({ firstName: e.target.value })} />
          </Field>
          <Field label="Nachname">
            <input className={inputCls} value={p.lastName} onChange={(e) => set({ lastName: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Titel / Headline (z. B. Bewerbung um eine Ausbildung als …)">
              <input
                className={inputCls}
                value={p.headline ?? ""}
                onChange={(e) => set({ headline: e.target.value || undefined })}
              />
            </Field>
          </div>
          <Field label="E-Mail">
            <input className={inputCls} value={p.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Telefon">
            <input
              className={inputCls}
              value={p.phone ?? ""}
              onChange={(e) => set({ phone: e.target.value || undefined })}
            />
          </Field>
          <Field label="Straße">
            <input
              className={inputCls}
              value={p.street ?? ""}
              onChange={(e) => set({ street: e.target.value || undefined })}
            />
          </Field>
          <Field label="PLZ, Ort">
            <input
              className={inputCls}
              value={p.postalCodeCity ?? ""}
              onChange={(e) => set({ postalCodeCity: e.target.value || undefined })}
            />
          </Field>
          {isLebenslauf && (
            <>
              <Field label="Geburtsdatum">
                <input
                  type="date"
                  className={inputCls}
                  value={p.birthDate ?? ""}
                  onChange={(e) => set({ birthDate: e.target.value || undefined })}
                />
              </Field>
              <Field label="Geburtsort">
                <input
                  className={inputCls}
                  value={p.birthPlace ?? ""}
                  onChange={(e) => set({ birthPlace: e.target.value || undefined })}
                />
              </Field>
              <Field label="Staatsangehörigkeit">
                <input
                  className={inputCls}
                  value={p.nationality ?? ""}
                  onChange={(e) => set({ nationality: e.target.value || undefined })}
                />
              </Field>
            </>
          )}
          <Field label="LinkedIn / Website">
            <input
              className={inputCls}
              value={p.linkedin ?? ""}
              onChange={(e) => set({ linkedin: e.target.value || undefined })}
            />
          </Field>
        </div>

        {isLebenslauf && (
          <div className="w-28 shrink-0 text-center">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Bewerbungsfoto" className="h-36 w-28 rounded border border-hairline object-cover" />
            ) : (
              <div className="flex h-36 w-28 items-center justify-center rounded border border-dashed border-hairline text-xs text-ink-400">
                Foto
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setBusy(true);
                  try {
                    await onPhotoUpload(f);
                  } finally {
                    setBusy(false);
                  }
                }
                e.target.value = "";
              }}
            />
            <div className="mt-1 flex justify-center gap-1">
              <button
                type="button"
                className="rounded border border-hairline px-2 py-0.5 text-xs hover:bg-paper"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                {busy ? "…" : photoDataUrl ? "Ändern" : "Hochladen"}
              </button>
              {photoDataUrl && (
                <button
                  type="button"
                  className="grid size-6 place-items-center rounded border border-hairline text-ink-400 hover:text-danger-600"
                  title="Remove photo"
                  onClick={onPhotoRemove}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function EntryControls({
  onUp,
  onDown,
  onRemove,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
}) {
  const btn = "grid place-items-center rounded border border-hairline size-6 disabled:opacity-30 hover:bg-paper";
  return (
    <div className="flex gap-1">
      <button type="button" className={btn} disabled={!onUp} onClick={onUp} title="Move up">
        <ChevronUp className="size-3.5" aria-hidden="true" />
      </button>
      <button type="button" className={btn} disabled={!onDown} onClick={onDown} title="Move down">
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>
      <button type="button" className={`${btn} text-ink-400 hover:text-danger-600`} onClick={onRemove} title="Remove">
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function ExperienceSection({ content, update }: { content: CvContent; update: (c: CvContent) => void }) {
  const items = content.experience;
  const setItems = (experience: CvContent["experience"]) => update({ ...content, experience });
  const setAt = (i: number, patch: Partial<CvContent["experience"][number]>) =>
    setItems(items.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <SectionCard title="Berufserfahrung & Praktika">
      <div className="space-y-4">
        {items.map((e, i) => (
          <div key={e.id} className="space-y-2 border-b border-hairline pb-3 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <input
                className={inputCls}
                placeholder="Position / Rolle"
                value={e.role}
                onChange={(ev) => setAt(i, { role: ev.target.value })}
              />
              <EntryControls
                onUp={i > 0 ? () => setItems(moveItem(items, i, i - 1)) : undefined}
                onDown={i < items.length - 1 ? () => setItems(moveItem(items, i, i + 1)) : undefined}
                onRemove={() => setItems(items.filter((_, j) => j !== i))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputCls}
                placeholder="Unternehmen"
                value={e.company}
                onChange={(ev) => setAt(i, { company: ev.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Ort"
                value={e.location ?? ""}
                onChange={(ev) => setAt(i, { location: ev.target.value || undefined })}
              />
              <input
                type="month"
                className={inputCls}
                title="Von"
                value={e.from}
                onChange={(ev) => setAt(i, { from: ev.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  className={inputCls}
                  title="Bis"
                  value={e.to ?? ""}
                  disabled={e.current}
                  onChange={(ev) => setAt(i, { to: ev.target.value || undefined })}
                />
                <label className="flex items-center gap-1 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    checked={e.current}
                    onChange={(ev) => setAt(i, { current: ev.target.checked, to: undefined })}
                  />
                  heute
                </label>
              </div>
            </div>
            <BulletEditor bullets={e.bullets} onChange={(bullets) => setAt(i, { bullets })} />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
        onClick={() =>
          setItems([
            ...items,
            { id: crypto.randomUUID(), role: "", company: "", from: "", current: false, bullets: [] },
          ])
        }
      >
        + Station hinzufügen
      </button>
    </SectionCard>
  );
}

function BulletEditor({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  return (
    <div className="space-y-1">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="text-ink-400">–</span>
          <input
            className={inputCls}
            value={b}
            placeholder="Aufgabe / Erfolg"
            onChange={(e) => onChange(bullets.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            className="p-1 text-ink-400 hover:text-danger-600"
            title="Remove"
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-ink-400 hover:text-ink-900"
        onClick={() => onChange([...bullets, ""])}
      >
        + Stichpunkt
      </button>
    </div>
  );
}

function EducationSection({ content, update }: { content: CvContent; update: (c: CvContent) => void }) {
  const items = content.education;
  const setItems = (education: CvContent["education"]) => update({ ...content, education });
  const setAt = (i: number, patch: Partial<CvContent["education"][number]>) =>
    setItems(items.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <SectionCard title="Schulbildung & Ausbildung">
      <div className="space-y-4">
        {items.map((e, i) => (
          <div key={e.id} className="space-y-2 border-b border-hairline pb-3 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <input
                className={inputCls}
                placeholder="Abschluss / Schulform"
                value={e.degree}
                onChange={(ev) => setAt(i, { degree: ev.target.value })}
              />
              <EntryControls
                onUp={i > 0 ? () => setItems(moveItem(items, i, i - 1)) : undefined}
                onDown={i < items.length - 1 ? () => setItems(moveItem(items, i, i + 1)) : undefined}
                onRemove={() => setItems(items.filter((_, j) => j !== i))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputCls}
                placeholder="Schule / Institution"
                value={e.institution}
                onChange={(ev) => setAt(i, { institution: ev.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Ort"
                value={e.location ?? ""}
                onChange={(ev) => setAt(i, { location: ev.target.value || undefined })}
              />
              <input
                type="month"
                className={inputCls}
                title="Von"
                value={e.from}
                onChange={(ev) => setAt(i, { from: ev.target.value })}
              />
              <input
                type="month"
                className={inputCls}
                title="Bis"
                value={e.to ?? ""}
                onChange={(ev) => setAt(i, { to: ev.target.value || undefined })}
              />
            </div>
            <input
              className={inputCls}
              placeholder="Beschreibung (optional, z. B. Note)"
              value={e.description ?? ""}
              onChange={(ev) => setAt(i, { description: ev.target.value || undefined })}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
        onClick={() =>
          setItems([...items, { id: crypto.randomUUID(), degree: "", institution: "", from: "" }])
        }
      >
        + Eintrag hinzufügen
      </button>
    </SectionCard>
  );
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"];

function LanguagesSection({ content, update }: { content: CvContent; update: (c: CvContent) => void }) {
  const items = content.languages;
  const setItems = (languages: CvContent["languages"]) => update({ ...content, languages });

  return (
    <SectionCard title="Sprachkenntnisse">
      <div className="space-y-2">
        {items.map((l, i) => (
          <div key={l.id} className="flex items-center gap-2">
            <input
              className={inputCls}
              placeholder="Sprache"
              value={l.name}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <select
              className="w-40 rounded border border-hairline bg-card px-2 py-1.5 text-sm"
              value={l.level}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)))}
            >
              <option value="">Niveau…</option>
              {CEFR_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="p-1 text-ink-400 hover:text-danger-600"
              title="Remove"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
        onClick={() => setItems([...items, { id: crypto.randomUUID(), name: "", level: "" }])}
      >
        + Sprache hinzufügen
      </button>
    </SectionCard>
  );
}

function SimpleListSection({
  title,
  items,
  placeholder,
  onChange,
}: {
  title: string;
  items: { id: string; name: string }[];
  placeholder: string;
  onChange: (items: { id: string; name: string }[]) => void;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-2">
        {items.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <input
              className={inputCls}
              placeholder={placeholder}
              value={s.name}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <button
              type="button"
              className="p-1 text-ink-400 hover:text-danger-600"
              title="Remove"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
        onClick={() => onChange([...items, { id: crypto.randomUUID(), name: "" }])}
      >
        + Hinzufügen
      </button>
    </SectionCard>
  );
}
