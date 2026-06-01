import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { CommandCenter } from "./routes/CommandCenter";
import { Controls } from "./routes/Controls";
import { Demo } from "./routes/Demo";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { IncidentDetailPage } from "./routes/IncidentDetail";
import { Incidents } from "./routes/Incidents";
import { Replay } from "./routes/Replay";
import { Runbooks } from "./routes/Runbooks";
import { SLOs } from "./routes/SLOs";
import { TopologyPage } from "./routes/Topology";
import { ToastProvider } from "./components/shared/Toast";
import "./styles/globals.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/command-center" replace /> },
      { path: "command-center", element: <CommandCenter /> },
      { path: "replay", element: <Replay /> },
      { path: "incidents", element: <Incidents /> },
      { path: "incidents/:id", element: <IncidentDetailPage /> },
      { path: "runbooks", element: <Runbooks /> },
      { path: "slos", element: <SLOs /> },
      { path: "topology", element: <TopologyPage /> },
      { path: "controls", element: <Controls /> },
      { path: "demo", element: <Demo /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
