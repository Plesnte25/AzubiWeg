import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  CaretLeft,
  FlagPennant,
  Keyboard,
  ListChecks,
  LockSimple,
  Question,
  SpeakerHigh,
  Target,
  Timer,
} from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { ExamSection } from "../../api/types";
import { useNavStack } from "../../lib/navStack";

const SECTION_META: Record<ExamSection, { label: string; meta: string; icon: typeof ListChecks }> = {
  vocabulary: { label: "Vocabulary", meta: "meaning & gender", icon: ListChecks },
  grammar: { label: "Grammar", meta: "cases & endings", icon: Keyboard },
  gender_drill: { label: "Gender against the clock", meta: "quickfire nouns", icon: Brain },
  listening: { label: "Listening", meta: "played once", icon: SpeakerHigh },
};
const SECTION_ORDER: ExamSection[] = ["vocabulary", "grammar", "gender_drill", "listening"];

const LEVEL_LABELS: Record<string, string> = { a1: "A1", a2: "A2", b1: "B1" };
const NEXT_LEVEL: Record<string, string> = { a1: "A2", a2: "B1", b1: "B1" };

export default function ExamGate() {
  const { goBack, backLabel, push } = useNavStack();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "exam", "status"], queryFn: api.examStatus });

  if (isLoading || !data) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "#161826" }} />;
  }

  const totalQuestions = Object.values(data.sectionCounts).reduce((a, b) => a + b, 0);
  const alreadyPassed = data.reason === "already_passed";
  const onCooldown = data.reason === "cooldown";

  return (
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+18px)] lg:mx-auto lg:my-8 lg:min-h-0 lg:max-w-[640px] lg:rounded-[20px] lg:border lg:border-white/5 lg:pb-8"
      style={{ background: "radial-gradient(110% 44% at 50% 8%, #262a60 0%, #161826 66%)" }}
    >
      <div className="flex items-center justify-between text-[13px]" style={{ color: "rgba(233,233,237,.6)" }}>
        <button type="button" onClick={goBack} className="flex items-center gap-[3px]" style={{ color: "inherit" }}>
          <CaretLeft size={14} weight="regular" aria-hidden="true" />
          {backLabel}
        </button>
        <span className="flex items-center gap-[5px] text-[11px]">
          <Question size={13} weight="regular" aria-hidden="true" />
          Rules
        </span>
      </div>

      <div className="mt-[26px] grid place-items-center">
        <div className="grid size-[74px] place-items-center rounded-[22px]" style={{ background: "rgba(145,132,217,.14)", boxShadow: "0 0 0 1px rgba(181,171,252,.45)" }}>
          <FlagPennant size={34} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-[18px] text-center">
        <div className="text-[10px] tracking-[.14em] uppercase" style={{ color: "#b5abfc" }}>
          Gate to {NEXT_LEVEL[data.level] ?? "next level"} · {alreadyPassed ? "passed" : onCooldown ? "cooling down" : "open"}
        </div>
        <div className="mt-1.5 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
          {LEVEL_LABELS[data.level]} final exam
        </div>
        <div className="mt-1.5 text-[13px] leading-[1.5]" style={{ color: "rgba(233,233,237,.6)" }}>
          {alreadyPassed
            ? "You've already passed this one."
            : totalQuestions === 0
              ? "No exam content for this level yet."
              : "Your syllabus route unlocked this exam."}
        </div>
      </div>

      <div className="mt-[22px] grid grid-cols-3 gap-2">
        <div className="items-start rounded-xl p-3" style={{ background: "#1c1f2c" }}>
          <ListChecks size={16} weight="regular" style={{ color: "#9184d9" }} aria-hidden="true" />
          <div className="mt-1.5 text-[17px] font-medium">{totalQuestions}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            questions
          </div>
        </div>
        <div className="items-start rounded-xl p-3" style={{ background: "#1c1f2c" }}>
          <Timer size={16} weight="regular" style={{ color: "#9184d9" }} aria-hidden="true" />
          <div className="mt-1.5 text-[17px] font-medium">{data.timeLimitMinutes} min</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            in one sitting
          </div>
        </div>
        <div className="items-start rounded-xl p-3" style={{ background: "#1c1f2c" }}>
          <Target size={16} weight="regular" style={{ color: "#9184d9" }} aria-hidden="true" />
          <div className="mt-1.5 text-[17px] font-medium">{Math.round(data.passThreshold * 100)}%</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            to pass
          </div>
        </div>
      </div>

      <div className="mt-[22px]">
        <div className="mb-2.5 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          Four sections
        </div>
        <div className="flex flex-col gap-2">
          {SECTION_ORDER.map((s) => {
            const Icon = SECTION_META[s].icon;
            const count = data.sectionCounts[s];
            return (
              <div key={s} className="flex items-center gap-3 rounded-[11px] p-3" style={{ background: "#20222f" }}>
                <Icon size={17} weight="regular" style={{ color: "rgba(233,233,237,.6)" }} aria-hidden="true" />
                <div className="flex-1">
                  <div className="text-[14px] font-medium">{SECTION_META[s].label}</div>
                  <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
                    {count} question{count === 1 ? "" : "s"} · {SECTION_META[s].meta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* pb clears the fixed tab bar (Layout.tsx's own 88px+safe-area
          reservation on <main> doesn't help here -- this component's
          min-h/mt-auto math can still land a mt-auto-pinned footer behind
          it; extra bottom padding on the actual last content is the robust
          fix, not a tighter min-h calculation). Caught by Playwright
          reporting a real click-occlusion on "Start exam", not by eyeballing
          a screenshot. */}
      <div className="mt-auto pt-5 pb-[100px]">
        <div className="mb-3 flex items-start gap-2 text-[11.5px] leading-[1.5]" style={{ color: "rgba(233,233,237,.4)" }}>
          <LockSimple size={13} weight="regular" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
          {onCooldown && data.nextAvailableAt
            ? `No pausing, no hints. Next attempt available ${new Date(data.nextAvailableAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`
            : `No pausing, no hints, one attempt every ${data.cooldownDays} days.`}
        </div>
        <div className="flex gap-[9px]">
          <button
            type="button"
            onClick={() => push("/plan/self-tests")}
            className="min-h-[48px] flex-1 rounded-[11px] text-[14px] font-medium"
            style={{ background: "#20222f" }}
          >
            Drill first
          </button>
          <button
            type="button"
            disabled={!data.allowed || totalQuestions === 0}
            onClick={() => push("/exam-take")}
            className="min-h-[48px] flex-[1.4] rounded-[11px] text-[15px] font-medium text-white disabled:opacity-40"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            Start exam
          </button>
        </div>
      </div>
    </div>
  );
}
