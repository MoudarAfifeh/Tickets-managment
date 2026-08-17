import { useNavigate } from "react-router-dom";
import { authClient, useSession } from "../lib/auth-client";

function NavBar() {
  const navigate = useNavigate();
  const { data } = useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
      <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Tickets
      </span>
      <div className="flex items-center gap-3 text-sm">
        <span>{data?.user.name}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-gray-200 px-3 py-1.5 font-sans text-gray-600 dark:border-gray-800 dark:text-gray-400"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default NavBar;
