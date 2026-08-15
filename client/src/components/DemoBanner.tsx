import { isDemoSession } from "../api/client";

export default function DemoBanner() {
  if (!isDemoSession()) return null;
  return (
    <div className="sticky top-0 z-50 bg-amber-700 px-4 py-1.5 text-center text-sm font-medium text-white">
      Demo Mode — you're viewing a sample account, not a real login.
    </div>
  );
}
