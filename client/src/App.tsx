import { Navigate, Route, Routes } from "react-router-dom";
import {
  RedirectIfAuthed,
  RequireAdmin,
  RequireAuth,
} from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import Users from "./pages/Users";

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
            <TicketDetail />
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
