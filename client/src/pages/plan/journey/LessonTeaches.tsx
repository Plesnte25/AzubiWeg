import type { CSSProperties } from "react";
import { BookOpen, Globe, Translate } from "@phosphor-icons/react";
import type { LessonTeaches, TeachesTopic } from "../../../api/types";

/*
 * What a source lesson teaches (server: services/learning/topic-match.ts): the syllabus topics its grammar covers,
 * the grammar points as the source names them, its culture pieces and how many new words. Shared by the Library's
 * lesson list and a lesson's Task modal.
 */

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  border: "2px solid var(--line)",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.3,
};

const passed = (t: TeachesTopic) => t.masteryState === "passed" || t.masteryState === "mastered";

/** "Regular conjugation · A1", mint once you've passed it. */
export function TopicPill({ topic, suffix }: { topic: TeachesTopic; suffix?: string }) {
  return (
    <span
      style={{ ...pill, background: passed(topic) ? "var(--mint)" : "var(--lilac)", color: "var(--onTile)" }}
      title={passed(topic) ? "You've passed this topic" : "A topic on your plan"}
    >
      {topic.title}
      <span style={{ opacity: 0.6 }}>· {topic.level.toUpperCase()}</span>
      {suffix && <span style={{ opacity: 0.6 }}>{suffix}</span>}
    </span>
  );
}

/** Compact: just the matched topics (one line in a lesson row). Full: topics, grammar, culture and words. */
export function TeachesSummary({ teaches, full = false }: { teaches: LessonTeaches; full?: boolean }) {
  const { topics, grammar, culture, vocabCount } = teaches;
  if (!full) {
    if (topics.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1" aria-label="Covers your topics">
        {topics.map((t) => (
          <TopicPill key={t.id} topic={t} />
        ))}
      </div>
    );
  }
  const unmatched = grammar.filter((g) => g.topicIds.length === 0);
  if (topics.length === 0 && grammar.length === 0 && culture.length === 0 && !vocabCount) return null;
  const label: CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--plainMuted)" };
  return (
    <div className="flex flex-col gap-1.5" style={{ fontSize: 13 }}>
      {topics.length > 0 && (
        <div className="flex flex-col gap-1">
          <span style={label}>Covers your topics</span>
          <div className="flex flex-wrap gap-1">
            {topics.map((t) => (
              <TopicPill key={t.id} topic={t} />
            ))}
          </div>
        </div>
      )}
      {grammar.length > 0 && (
        <div className="flex items-start gap-1.5">
          <BookOpen size={14} weight="fill" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            <b>Grammar:</b> {grammar.map((g) => g.point).join(" · ")}
            {unmatched.length > 0 && topics.length > 0 && <span style={{ color: "var(--plainMuted)" }}> (not all are topics on your plan)</span>}
          </span>
        </div>
      )}
      {culture.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Globe size={14} weight="fill" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            <b>Life in Germany:</b> {culture.join(" · ")}
          </span>
        </div>
      )}
      {!!vocabCount && (
        <div className="flex items-start gap-1.5">
          <Translate size={14} weight="bold" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            <b>{vocabCount}</b> new words and phrases
          </span>
        </div>
      )}
    </div>
  );
}
