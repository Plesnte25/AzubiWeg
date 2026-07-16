import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../api/client";

const tabs = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/vocabulary", label: "Vocabulary" },
  { to: "/review", label: "Review" },
  { to: "/checklist", label: "Checklist" },
  { to: "/settings", label: "Settings" },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4">
          <span className="py-3 text-lg font-semibold tracking-tight">
            <span className="text-brand-500">●</span> Deutschland Companion
          </span>
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-brand-400 text-ink-900"
                      : "border-transparent text-ink-600 hover:text-ink-900"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-600">
            <span className="hidden sm:inline">{user?.name}</span>
            <button
              className="rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
              onClick={() => {
                clearSession();
                navigate("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
