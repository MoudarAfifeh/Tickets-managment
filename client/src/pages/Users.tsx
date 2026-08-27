import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import NavBar from "../components/NavBar";
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

function Users() {
  const [users, setUsers] = useState<UserListItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setError("");
      const res = await fetch("/api/users");

      if (!res.ok) {
        if (!cancelled) setError("Failed to load users.");
        return;
      }

      const data = await res.json();
      if (!cancelled) setUsers(data.users);
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <div className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Users
        </div>

        {!users && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading users...
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

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
