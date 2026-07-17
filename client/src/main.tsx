import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import "./index.css";
import { getToken } from "./api/client";
import Layout from "./components/Layout";
import Applications from "./pages/Applications";
import Checklist from "./pages/Checklist";
import Dashboard from "./pages/Dashboard";
import Learning from "./pages/Learning";
import Login from "./pages/Login";
import Review from "./pages/Review";
import Settings from "./pages/Settings";
import Vocabulary from "./pages/Vocabulary";

// the CV pages pull in @react-pdf/renderer (~1.5 MB) — load them lazily so
// the rest of the app stays fast
const CvList = lazy(() => import("./pages/CvList"));
const CvEditor = lazy(() => import("./pages/CvEditor"));

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
          { path: "/vocabulary", element: <Vocabulary /> },
          { path: "/review", element: <Review /> },
          { path: "/learning", element: <Learning /> },
          { path: "/applications", element: <Applications /> },
          { path: "/cv", element: <Lazy><CvList /></Lazy> },
          { path: "/cv/:id", element: <Lazy><CvEditor /></Lazy> },
          { path: "/checklist", element: <Checklist /> },
          { path: "/settings", element: <Settings /> },
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
