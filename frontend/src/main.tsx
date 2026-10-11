import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ResearchProvider } from "./hooks/ResearchContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { DatasetExplorer } from "./pages/DatasetExplorer";
import { TrainingPipeline } from "./pages/TrainingPipeline";
import { ModelComparison } from "./pages/ModelComparison";
import { Analyzer } from "./pages/Analyzer";
import { Ensemble } from "./pages/Ensemble";
import { PythonCode } from "./pages/PythonCode";
import { ResearchInfo } from "./pages/ResearchInfo";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ResearchProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dataset" element={<DatasetExplorer />} />
            <Route path="pipeline" element={<TrainingPipeline />} />
            <Route path="models" element={<ModelComparison />} />
            <Route path="analyzer" element={<Analyzer key="analyzer" />} />
            <Route path="ensemble" element={<Ensemble />} />
            <Route path="code" element={<PythonCode />} />
            <Route path="research" element={<ResearchInfo />} />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <h1>Page not found</h1>
                  <Link to="/">Return to dashboard</Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </ResearchProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
