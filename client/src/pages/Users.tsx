import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import NavBar from "../components/NavBar";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserListItem = {
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
        <div className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Users
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading users...
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error.message}</p>
        )}

        {users && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? "outline" : "destructive"}>
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default Users;
