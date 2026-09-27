import { Navigate, Route, Routes } from "react-router-dom";
import {
  RedirectIfAuthed,
  RequireAdmin,
  RequireAuth,
} from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Tickets from "./pages/Tickets";
import TicketDetailsPage from "./pages/TicketDetailsPage";
import Users from "./pages/Users";
import Dashboard from "./pages/Dashboard";

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
            <Tickets />
          </RequireAuth>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RequireAuth>
            <TicketDetailsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAdmin>
            <Users />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
