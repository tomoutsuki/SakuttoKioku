import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { QuizPage } from "./pages/QuizPage";

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/quiz/:quizId" element={<QuizPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
