import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import NavBar from "../components/NavBar";
import UserDialog from "../components/UserDialog";
import UsersTable from "../components/UsersTable";
import { api } from "@/lib/api";
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
  | { type: "edit"; user: UserListItem };

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
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Users
          </div>
          <Button onClick={() => setDialogMode({ type: "create" })}>
            <Plus />
            New User
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error.message}</p>
        )}

        {!error && (
          <UsersTable
            users={users}
            isPending={isPending}
            onEdit={(user) => setDialogMode({ type: "edit", user })}
          />
        )}
      </div>

      <UserDialog mode={dialogMode} onClose={() => setDialogMode(null)} />
    </div>
  );
}

export default Users;
