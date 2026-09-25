import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useParams } from "react-router-dom";
import "./index.css";
import { api, getToken, setSession } from "./api/client";
import Layout from "./components/Layout";
import { Toaster } from "./components/ui/Toast";
import { ThemeProvider } from "./lib/theme";
import Today from "./pages/today/Today";
import Login from "./pages/Login";

// only Login (unauthenticated) and Today (the first authenticated view,
// mounted at Today's "/") are needed for first paint — every other route is
// its own chunk, loaded on navigation, so signing in doesn't pull in the CV
// editor/kanban/quiz code up front
const JobSearch = lazy(() => import("./pages/job-search"));
const Notes = lazy(() => import("./pages/notes/Notes"));
const SelfTestRunner = lazy(() => import("./pages/plan/tests/SelfTestRunner"));
const GenderDrillPage = lazy(() => import("./pages/plan/tests/GenderDrill"));
const ListenType = lazy(() => import("./pages/plan/tests/ListenType"));
const ExamRunner = lazy(() => import("./pages/plan/tests/ExamRunner"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Stats = lazy(() => import("./pages/stats/Stats"));
const Words = lazy(() => import("./pages/words/Words"));
const Journey = lazy(() => import("./pages/plan/journey/Journey"));
const ReviewSession = lazy(() => import("./pages/review/ReviewSession"));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-plain-muted">Loading…</p>}>{children}</Suspense>;
}

// Old per-note editor URLs (/notes/edit/:id, /plan/notes/edit/:id) open that note's editor modal on the wall.
function NotesEditRedirect() {
  const { id } = useParams();
  return <Navigate to="/notes" replace state={id && id !== "new" ? { open: id } : undefined} />;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

// Real users with a stored token skip straight to "authed" — no network
// round-trip, no behavior change. A visitor with no token at all (including
// an external crawler like PageSpeed Insights/GTmetrix hitting the site
// fresh) gets one attempt at the temporary public demo-login endpoint before
// falling back to the normal /login redirect; see api.demoLogin and
// DEPLOYMENT.md for how that's toggled server-side.
function RequireAuth() {
  const [status, setStatus] = useState<"checking" | "authed" | "unauthed">(
    getToken() ? "authed" : "checking",
  );

  useEffect(() => {
    if (getToken()) return;
    let cancelled = false;
    api
      .demoLogin()
      .then((res) => {
        if (cancelled) return;
        setSession(res.token, res.user, true);
        setStatus("authed");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") return <p className="text-plain-muted">Loading…</p>;
  return status === "authed" ? <Outlet /> : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login mode="login" /> },
  { path: "/register", element: <Login mode="register" /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          // ── the 6 real tab destinations (Today/Words/Plan/Jobs/Stats/Notes) ──
          { path: "/", element: <Today /> },
          { path: "/words", element: <Lazy><Words /></Lazy> },
          { path: "/words/:id", element: <Lazy><Words /></Lazy> },
          { path: "/review", element: <Lazy><ReviewSession /></Lazy> },
          { path: "/plan", element: <Lazy><Journey /></Lazy> },
          { path: "/plan/syllabus", element: <Navigate to="/plan" replace /> },
          { path: "/plan/sources", element: <Navigate to="/plan" replace /> },
          { path: "/notes", element: <Lazy><Notes /></Lazy> },
          { path: "/notes/edit/:id", element: <NotesEditRedirect /> },
          { path: "/plan/self-tests", element: <Navigate to="/plan" replace /> },
          { path: "/plan/self-tests/run", element: <Lazy><SelfTestRunner /></Lazy> },
          { path: "/plan/self-tests/gender", element: <Lazy><GenderDrillPage /></Lazy> },
          { path: "/plan/self-tests/listen", element: <Lazy><ListenType /></Lazy> },
          { path: "/plan/exam-gate", element: <Navigate to="/plan" replace /> },
          { path: "/exam-take", element: <Lazy><ExamRunner /></Lazy> },
          { path: "/jobs", element: <Lazy><JobSearch /></Lazy> },
          { path: "/stats", element: <Lazy><Stats /></Lazy> },
          // ── legacy URL redirects — old bookmarks/links keep working ──
          { path: "/vocabulary", element: <Navigate to="/words" replace /> },
          { path: "/learning", element: <Navigate to="/plan" replace /> },
          { path: "/roadmap", element: <Navigate to="/plan" replace /> },
          { path: "/job-search", element: <Navigate to="/jobs" replace /> },
          { path: "/applications", element: <Navigate to="/jobs" replace /> },
          { path: "/cv", element: <Navigate to="/jobs" replace /> },
          { path: "/cv/:id", element: <Navigate to="/jobs" replace /> },
          { path: "/checklist", element: <Navigate to="/" replace /> },
          { path: "/plan/notes", element: <Navigate to="/notes" replace /> },
          { path: "/plan/notes/edit/:id", element: <NotesEditRedirect /> },
          { path: "/settings", element: <Lazy><Settings /></Lazy> },
        ],
      },
    ],
  },
]);

const rootElement = document.getElementById("root") as (HTMLElement & { __azubiwegRoot?: Root }) | null;
if (!rootElement) throw new Error("Root element not found");

const root = rootElement.__azubiwegRoot ?? createRoot(rootElement);
rootElement.__azubiwegRoot = root;

root.render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
