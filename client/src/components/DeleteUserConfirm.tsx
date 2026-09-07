import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/serverError";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import type { UserListItem } from "@/pages/Users";

async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

type DeleteUserConfirmProps = {
  user: UserListItem;
  onSuccess: () => void;
};

function DeleteUserConfirm({ user, onSuccess }: DeleteUserConfirmProps) {
  const [serverError, setServerError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
    },
    onError: (error) => setServerError(getServerErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-4">
      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}
      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" disabled={mutation.isPending} />}
        >
          Cancel
        </DialogClose>
        <Button
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() => {
            setServerError("");
            mutation.mutate();
          }}
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          Delete user
        </Button>
      </DialogFooter>
    </div>
  );
}

export default DeleteUserConfirm;
