/**
 * The self-paced daily ticket (plans/self-paced-queue.md). There's no calendar: the syllabus is a queue, and each
 * line (grammar, vocab themes, skills — see prerequisites.ts) has at most one open topic at a time. The ticket takes
 * open topics onto today until the minutes goal is met; past the goal, "Take another" takes the next one on demand.
 * Nothing here is ever overdue — an unfinished taken topic just stays on the ticket.
 */

export type Line = "grammar" | "vocab_theme" | "skill";

/** Lines in ticket order: a day reads grammar → vocab → skills. */
export const LINE_ORDER: Line[] = ["grammar", "vocab_theme", "skill"];

export interface QueueTopic {
  id: string;
  category: Line;
  sortOrder: number;
}

/** Minutes a syllabus topic is budgeted at on the ticket (same flat estimate as pace.ts's MINUTES_PER_ITEM). */
export const TOPIC_MINUTES = 10;

/**
 * Open topics in the order they should be taken: the first open topic of each line (grammar → vocab → skills),
 * then any further open ones (only the gate line can add more, and only once the rest of the level is done).
 * `open` = in the active level, not blocked, not passed/mastered/skipped, and not already taken (an unfinished task
 * exists for it).
 */
export function queueOrder(open: QueueTopic[]): QueueTopic[] {
  const sorted = [...open].sort((a, b) => a.sortOrder - b.sortOrder);
  const firsts: QueueTopic[] = [];
  for (const line of LINE_ORDER) {
    const first = sorted.find((t) => t.category === line);
    if (first) firsts.push(first);
  }
  const firstIds = new Set(firsts.map((t) => t.id));
  return [...firsts, ...sorted.filter((t) => !firstIds.has(t.id))];
}

export interface TicketInput {
  /** Open, untaken topics of the active level (see queueOrder). */
  open: QueueTopic[];
  /** Minutes already on today's ticket: today's tasks (done or not, not dropped) plus due reviews. */
  plannedMinutes: number;
  /** Settings → minutes a day. */
  goalMinutes: number;
  /** Settings → study days: a rest day never auto-takes, but Take another still works. */
  restDay: boolean;
  /** A syllabus topic is already on today (taken today or rolled over, done or not). */
  hasTopicToday: boolean;
}

export interface TicketPlan {
  /** Topics to take onto today now, in order, to fill the goal. */
  autoTake: string[];
  /** The topic "Take another" would take next, if any is open after autoTake. */
  next: string | null;
}

export interface Forecast {
  /** Not-yet-done topic ids per line (gate station excluded), in syllabus order. */
  lines: string[][];
  /** The gate station's remaining topics: they only open once every line is done. */
  gate: string[];
  /** Topics the user passes per week — recent pace across all lines, or the capacity fallback. */
  perWeek: number;
  today: Date;
}

const plusDays = (today: Date, days: number) => {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + Math.ceil(days));
  return date.toISOString().slice(0, 10);
};

/**
 * Projected date (YYYY-MM-DD) for every remaining topic. Simulates the queue: the lines with work left take turns
 * (grammar → vocab → skills, like the ticket), each topic costing 7 / perWeek days, so once a line is finished its share
 * of study time moves to the others. The gate follows once every line is done. Replaces the calendar's fixed day
 * numbers for station, checkpoint and finish dates.
 */
export function projectDates({ lines, gate, perWeek, today }: Forecast): Map<string, string> {
  const out = new Map<string, string>();
  if (perWeek <= 0) return out;
  const step = 7 / perWeek;
  const cursors = lines.map(() => 0);
  let days = 0;
  for (let left = lines.reduce((n, l) => n + l.length, 0); left > 0; ) {
    lines.forEach((line, k) => {
      if (cursors[k]! >= line.length) return;
      days += step;
      out.set(line[cursors[k]!]!, plusDays(today, days));
      cursors[k]!++;
      left--;
    });
  }
  for (const id of gate) {
    days += step;
    out.set(id, plusDays(today, days));
  }
  return out;
}

/** Fills today up to the goal from the queue; the rest waits for Take another. */
export function planTicket(input: TicketInput): TicketPlan {
  const queue = queueOrder(input.open);
  const autoTake: string[] = [];
  let minutes = input.plannedMinutes;
  if (!input.restDay) {
    for (const [i, topic] of queue.entries()) {
      // reviews come first and count toward the goal, but they never crowd out new learning entirely: a study day
      // always gets at least one new topic
      const guaranteed = i === 0 && !input.hasTopicToday;
      if (minutes >= input.goalMinutes && !guaranteed) break;
      autoTake.push(topic.id);
      minutes += TOPIC_MINUTES;
    }
  }
  return { autoTake, next: queue[autoTake.length]?.id ?? null };
}
