import { useState } from "react";
import { useNavStack } from "../../lib/navStack";
import type { Destination } from "../learning-hub/destinations";
import { SelfTestsPage } from "../learning-hub/SelfTestsPage";

/** Real route (/plan/self-tests) wrapping the still-pre-Nocturne
 * SelfTestsPage as-is — see Notes.tsx's doc comment for why. */
export default function SelfTests() {
  const { push } = useNavStack();
  const [, setRunning] = useState(false);
  const onNavigate = (d: Destination) => push(d === "today" ? "/" : "/plan");
  return <SelfTestsPage onRunningChange={setRunning} onNavigate={onNavigate} />;
}
