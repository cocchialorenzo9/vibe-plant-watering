import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "./state/store";
import { ToastProvider } from "./components/Toast";
import { TabBar } from "./components/TabBar";
import { Dashboard } from "./screens/Dashboard";
import { AddPlant } from "./screens/AddPlant";
import { History } from "./screens/History";
import { Settings } from "./screens/Settings";
import { PlantDetail } from "./screens/PlantDetail";
import { PlantAbout } from "./screens/PlantAbout";
import { WaterCheck } from "./screens/WaterCheck";
import { WateredConfirmation } from "./screens/WateredConfirmation";

export function App() {
  return (
    <HashRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <StoreProvider>
        <ToastProvider>
          <div className="app-shell">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add" element={<AddPlant />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plant/:id" element={<PlantDetail />} />
              <Route path="/plant/:id/about" element={<PlantAbout />} />
              <Route path="/water-check" element={<WaterCheck />} />
              <Route path="/watered" element={<WateredConfirmation />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <TabBar />
          </div>
        </ToastProvider>
      </StoreProvider>
    </HashRouter>
  );
}
