import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import "./index.css";
import { api, getToken, setSession } from "./api/client";
import Layout from "./components/Layout";
import { Toaster } from "./components/ui/Toast";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// only Login (unauthenticated) and Dashboard (the first authenticated view,
// mounted at Today's "/") are needed for first paint — every other route is
// its own chunk, loaded on navigation, so signing in doesn't pull in the CV
// editor/kanban/quiz code up front
const JobSearch = lazy(() => import("./pages/job-search"));
const PlanEntry = lazy(() => import("./pages/PlanEntry"));
const Settings = lazy(() => import("./pages/Settings"));
const Stats = lazy(() => import("./pages/Stats"));
const Vocabulary = lazy(() => import("./pages/Vocabulary"));
const WordDetail = lazy(() => import("./pages/words/WordDetail"));
const ReviewSession = lazy(() => import("./pages/review/ReviewSession"));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-ink-400">Loading…</p>}>{children}</Suspense>;
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

  if (status === "checking") return <p className="text-ink-400">Loading…</p>;
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
          // ── the 5 real tab destinations (Today/Words/Plan/Jobs/Stats) ──
          { path: "/", element: <Dashboard /> },
          { path: "/words", element: <Lazy><Vocabulary /></Lazy> },
          { path: "/words/:id", element: <Lazy><WordDetail /></Lazy> },
          { path: "/review", element: <Lazy><ReviewSession /></Lazy> },
          { path: "/plan", element: <Lazy><PlanEntry /></Lazy> },
          { path: "/jobs", element: <Lazy><JobSearch /></Lazy> },
          { path: "/stats", element: <Lazy><Stats /></Lazy> },
          // ── legacy URL redirects — old bookmarks/links keep working ──
          { path: "/vocabulary", element: <Navigate to="/words" replace /> },
          { path: "/learning", element: <Navigate to="/plan" replace /> },
          { path: "/roadmap", element: <Navigate to="/plan?view=roadmap" replace /> },
          { path: "/job-search", element: <Navigate to="/jobs" replace /> },
          { path: "/applications", element: <Navigate to="/jobs" replace /> },
          { path: "/cv", element: <Navigate to="/jobs" replace /> },
          { path: "/cv/:id", element: <Navigate to="/jobs" replace /> },
          { path: "/checklist", element: <Navigate to="/" replace /> },
          { path: "/settings", element: <Lazy><Settings /></Lazy> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
