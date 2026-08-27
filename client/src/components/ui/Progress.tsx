import type { ComponentProps } from "react";
import FillBar from "../FillBar";
import { DonutProgress } from "./DonutProgress";

type ProgressProps = { percent: number; variant?: "bar" } | ({ variant: "donut" } & ComponentProps<typeof DonutProgress>);

/** Thin unifying wrapper over the two existing, already-solid progress
 * primitives — FillBar (linear) and DonutProgress (multi-segment SVG ring) —
 * rather than a rebuild of either. No chart-library involvement either way. */
export function Progress(props: ProgressProps) {
  if (props.variant === "donut") {
    const { variant: _variant, ...rest } = props;
    return <DonutProgress {...rest} />;
  }
  return <FillBar percent={props.percent} />;
}
