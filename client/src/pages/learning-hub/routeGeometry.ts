/**
 * Pure geometry for the winding station-route path — computed entirely from
 * the station count, never measured from the rendered DOM. RoadmapPage's
 * day-list used to have its own connecting line/bead system that broke
 * because it depended on runtime-measured, variable row heights (collapsible
 * cards). Stations here are a small (~15-25), stable-height list — nothing
 * collapses/expands — so an index-driven layout is safe in a way the
 * DOM-measured one wasn't. Don't assume the two pages should share a
 * technique just because they're visually similar in concept.
 */

export interface RouteNode {
  x: number;
  y: number;
}

export interface RouteLayout {
  nodes: RouteNode[];
  /** SVG path `d` strings connecting consecutive nodes, length = nodes.length - 1 */
  segments: string[];
  size: { width: number; height: number };
}

/**
 * Deterministic per-seed wander sequence on the cross-axis (a simple
 * string-hash-seeded LCG, not Math.random — same seed always produces the
 * same shape, so a level's path looks the same across reloads, but each
 * level gets a visually distinct one). Clamped to [0.2, 0.8] to stay clear
 * of the side padding/label-edge reserves computed below. Spacing is
 * strictly increasing on the primary axis and both bezier control points
 * sit at each node's own cross-axis position, so segments are monotonic in
 * the primary axis and can never cross or overlap regardless of what the
 * wander sequence's actual values are.
 */
function seededWander(seed: string, length = 7): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0; // LCG step
    out.push(0.2 + (h / 4294967296) * 0.6);
  }
  return out;
}

function bezierSegment(a: RouteNode, b: RouteNode, axis: "x" | "y"): string {
  if (axis === "y") {
    const my = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y} C ${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
  }
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
}

const V_SPACING = 96;
// reserved inside the coordinate space itself (not CSS margin), so long
// theme labels at the wander extremes don't fight the container edge
const V_SIDE_PAD_FRAC = 0.14;

export function verticalRouteLayout(count: number, seed: string, width = 320): RouteLayout {
  const wander = seededWander(seed);
  const usableWidth = width * (1 - 2 * V_SIDE_PAD_FRAC);
  const left = width * V_SIDE_PAD_FRAC;
  const nodes: RouteNode[] = Array.from({ length: count }, (_, i) => ({
    x: left + usableWidth * wander[i % wander.length]!,
    y: V_SPACING * 0.6 + i * V_SPACING,
  }));
  const height = count === 0 ? V_SPACING : nodes[nodes.length - 1]!.y + V_SPACING * 0.6;
  const segments = nodes.slice(1).map((n, i) => bezierSegment(nodes[i]!, n, "y"));
  return { nodes, segments, size: { width, height } };
}

const H_SPACING = 130;
// fixed budget for a node's 2-line label, on top of wander amplitude — a
// node wandered toward the bottom of its range needs the same label
// clearance as one at the top, not just whatever's left over
const H_LABEL_RESERVE = 46;

export function horizontalRouteLayout(count: number, seed: string, height = 150): RouteLayout {
  const wander = seededWander(seed);
  const wanderTop = 22;
  const wanderHeight = height - H_LABEL_RESERVE - wanderTop;
  const nodes: RouteNode[] = Array.from({ length: count }, (_, i) => ({
    x: H_SPACING * 0.6 + i * H_SPACING,
    y: wanderTop + wanderHeight * wander[i % wander.length]!,
  }));
  const width = count === 0 ? H_SPACING : nodes[nodes.length - 1]!.x + H_SPACING * 0.6;
  const segments = nodes.slice(1).map((n, i) => bezierSegment(nodes[i]!, n, "x"));
  return { nodes, segments, size: { width, height } };
}
