import { useNavigate } from "react-router-dom";
import { authClient, useSession } from "../lib/auth-client";
import "./NavBar.css";

function NavBar() {
  const navigate = useNavigate();
  const { data } = useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="navbar">
      <span className="navbar-title">Tickets</span>
      <div className="navbar-user">
        <span>{data?.user.name}</span>
        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default NavBar;
