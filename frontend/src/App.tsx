import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import CalendarPage from "./pages/CalendarPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CoachPage from "./pages/CoachPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/coach" element={<CoachPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </ThemeProvider>
  );
}
