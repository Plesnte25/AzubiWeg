import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import "./index.css";
import { getToken } from "./api/client";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// only Login (unauthenticated) and Dashboard (the first authenticated view)
// are needed for first paint — every other route is its own chunk, loaded
// on navigation, so signing in doesn't pull in the CV editor/kanban/quiz
// code up front
const JobSearch = lazy(() => import("./pages/job-search"));
const Checklist = lazy(() => import("./pages/checklist"));
const LearningHub = lazy(() => import("./pages/learning-hub"));
const Settings = lazy(() => import("./pages/Settings"));
const Vocabulary = lazy(() => import("./pages/Vocabulary"));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-ink-400">Loading…</p>}>{children}</Suspense>;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function RequireAuth() {
  return getToken() ? <Outlet /> : <Navigate to="/login" replace />;
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
          { path: "/", element: <Dashboard /> },
          { path: "/vocabulary", element: <Lazy><Vocabulary /></Lazy> },
          { path: "/review", element: <Navigate to="/vocabulary" replace /> },
          { path: "/learning", element: <Lazy><LearningHub /></Lazy> },
          { path: "/roadmap", element: <Navigate to="/learning?view=roadmap" replace /> },
          { path: "/job-search", element: <Lazy><JobSearch /></Lazy> },
          { path: "/applications", element: <Navigate to="/job-search" replace /> },
          { path: "/cv", element: <Navigate to="/job-search" replace /> },
          { path: "/cv/:id", element: <Navigate to="/job-search" replace /> },
          { path: "/checklist", element: <Lazy><Checklist /></Lazy> },
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
    </QueryClientProvider>
  </StrictMode>,
);
