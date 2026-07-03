import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AppProvider } from "./context/AppContext";
import { HomePage } from "./pages/HomePage";
import { IncorrectQuestionsPage } from "./pages/IncorrectQuestionsPage";
import { QuizPage } from "./pages/QuizPage";

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/quiz/:quizId" element={<QuizPage />} />
            <Route path="/quiz/:quizId/review" element={<IncorrectQuestionsPage />} />
            <Route path="/review-mistakes" element={<IncorrectQuestionsPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
