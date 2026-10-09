import { LifeBuoy } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn, initials } from "@/lib/utils";
import { authClient, useSession } from "../lib/auth-client";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-foreground",
    isActive
      ? "bg-white/12 text-nav-foreground"
      : "text-nav-muted hover:bg-white/6 hover:text-nav-foreground",
  );
}

function NavBar() {
  const navigate = useNavigate();
  const { data } = useSession();
  const { pathname } = useLocation();
  // A single ticket (/tickets/:id) still belongs to the Tickets section.
  const onTickets = pathname === "/" || pathname.startsWith("/tickets/");

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  const userName = data?.user.name ?? "";

  return (
    <header className="bg-nav text-nav-foreground">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            to="/"
            aria-label="Helpdesk home"
            className="flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-foreground"
          >
            <LifeBuoy className="size-5 text-nav-muted" aria-hidden="true" />
            <span className="hidden sm:inline">Helpdesk</span>
          </Link>
          <div className="flex items-center gap-1">
            <NavLink to="/" className={() => navLinkClass({ isActive: onTickets })}>
              Tickets
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            {data?.user.role === "admin" && (
              <NavLink to="/users" className={navLinkClass}>
                Users
              </NavLink>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {userName && (
            <div className="hidden items-center gap-2 md:flex">
              <span
                className="flex size-7 items-center justify-center rounded-full bg-white/12 text-xs font-semibold"
                aria-hidden="true"
              >
                {initials(userName)}
              </span>
              <span className="text-nav-foreground">{userName}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md px-3 py-1.5 font-medium text-nav-muted transition-colors hover:bg-white/6 hover:text-nav-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-foreground"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
