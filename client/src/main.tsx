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
const Plan = lazy(() => import("./pages/plan/Plan"));
const Syllabus = lazy(() => import("./pages/plan/Syllabus"));
const Sources = lazy(() => import("./pages/plan/Sources"));
const Notes = lazy(() => import("./pages/plan/Notes"));
const NoteEditor = lazy(() => import("./pages/plan/NoteEditor"));
const SelfTests = lazy(() => import("./pages/plan/SelfTests"));
const SelfTestRunner = lazy(() => import("./pages/plan/SelfTestRunner"));
const ExamGate = lazy(() => import("./pages/plan/ExamGate"));
const ExamRunner = lazy(() => import("./pages/plan/ExamRunner"));
const Settings = lazy(() => import("./pages/Settings"));
const Stats = lazy(() => import("./pages/stats/Stats"));
const Words = lazy(() => import("./pages/words/Words"));
const ReviewSession = lazy(() => import("./pages/review/ReviewSession"));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-ink-600">Loading…</p>}>{children}</Suspense>;
}

// <Navigate to> doesn't interpolate the CURRENT route's params into its
// target — a plain <Navigate to="/notes/edit/:id" /> would send everyone to
// the literal string "/notes/edit/:id". A bookmarked/shared per-note editor
// link should keep pointing at the same note, not just the notes list.
function NotesEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/notes/edit/${id}`} replace />;
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

  if (status === "checking") return <p className="text-ink-600">Loading…</p>;
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
          { path: "/plan", element: <Lazy><Plan /></Lazy> },
          { path: "/plan/syllabus", element: <Lazy><Syllabus /></Lazy> },
          { path: "/plan/sources", element: <Lazy><Sources /></Lazy> },
          // Notes' page files stay under pages/plan/ until Phase 7 (the
          // Notes reskin) actually moves them to pages/notes/ — only the
          // route path is promoted to top-level here.
          { path: "/notes", element: <Lazy><Notes /></Lazy> },
          { path: "/notes/edit/:id", element: <Lazy><NoteEditor /></Lazy> },
          { path: "/plan/self-tests", element: <Lazy><SelfTests /></Lazy> },
          { path: "/plan/self-tests/run", element: <Lazy><SelfTestRunner /></Lazy> },
          { path: "/plan/exam-gate", element: <Lazy><ExamGate /></Lazy> },
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
