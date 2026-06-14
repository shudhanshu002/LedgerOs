import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { AppRouter } from "./app/AppRouter";
import { ToastHost } from "./components/ui/ToastHost";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
    <ToastHost />
  </React.StrictMode>,
);