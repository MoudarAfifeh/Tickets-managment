import { Navigate, Route, Routes } from "react-router-dom";
import { RedirectIfAuthed, RequireAuth } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
