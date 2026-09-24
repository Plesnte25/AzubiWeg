import { isDemoSession } from "../api/client";

/** Full-width strip above the Bento shell for demo sessions. Not sticky: the sm top bar owns the sticky top edge. */
export default function DemoBanner() {
  if (!isDemoSession()) return null;
  return (
    <div
      className="px-4 py-1.5 text-center"
      style={{ background: "var(--lemon)", color: "var(--onTile)", borderBottom: "2.5px solid var(--line)", fontSize: 14, fontWeight: 700 }}
    >
      Demo Mode — you're viewing a sample account, not a real login.
    </div>
  );
}
