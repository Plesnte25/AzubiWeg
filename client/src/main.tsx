import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import "./index.css";
import { getToken } from "./api/client";
import Layout from "./components/Layout";
import Applications from "./pages/Applications";
import Checklist from "./pages/Checklist";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Review from "./pages/Review";
import Settings from "./pages/Settings";
import Vocabulary from "./pages/Vocabulary";

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
          { path: "/applications", element: <Applications /> },
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
