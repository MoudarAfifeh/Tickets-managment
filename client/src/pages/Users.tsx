import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import NavBar from "../components/NavBar";
import PageHeader from "@/components/PageHeader";
import UserDialog from "../components/UserDialog";
import UsersTable from "../components/UsersTable";
import { api } from "@/lib/api";
import ErrorMessage from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  active: boolean;
  createdAt: string;
};

// Drives the single <UserDialog>: `null` = closed, otherwise which flow it runs.
export type UserDialogMode =
  | { type: "create" }
  | { type: "edit"; user: UserListItem }
  | { type: "delete"; user: UserListItem };

async function fetchUsers(): Promise<UserListItem[]> {
  const res = await api.get<{ users: UserListItem[] }>("/users");
  return res.data.users;
}

function Users() {
  const {
    data: users,
    error,
    isPending,
  } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const [dialogMode, setDialogMode] = useState<UserDialogMode | null>(null);

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Users"
          description="People who can sign in and work on tickets."
          actions={
            <Button onClick={() => setDialogMode({ type: "create" })}>
              <Plus />
              New User
            </Button>
          }
        />

        {error && <ErrorMessage>{error.message}</ErrorMessage>}

        {!error && (
          <section className="overflow-hidden rounded-xl border bg-card [&_td]:px-4 [&_td]:py-3 [&_th]:h-10 [&_th]:bg-muted/50 [&_th]:px-4 [&_th]:text-xs [&_th]:text-muted-foreground">
            <UsersTable
              users={users}
              isPending={isPending}
              onEdit={(user) => setDialogMode({ type: "edit", user })}
              onDelete={(user) => setDialogMode({ type: "delete", user })}
            />
          </section>
        )}
      </main>

      <UserDialog mode={dialogMode} onClose={() => setDialogMode(null)} />
    </div>
  );
}

export default Users;
