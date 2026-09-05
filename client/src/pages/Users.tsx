import { useQuery } from "@tanstack/react-query";
import CreateUserDialog from "../components/CreateUserDialog";
import NavBar from "../components/NavBar";
import UsersTable from "../components/UsersTable";
import { api } from "@/lib/api";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  active: boolean;
  createdAt: string;
};

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

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Users
          </div>
          <CreateUserDialog />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error.message}</p>
        )}

        {!error && <UsersTable users={users} isPending={isPending} />}
      </div>
    </div>
  );
}

export default Users;
