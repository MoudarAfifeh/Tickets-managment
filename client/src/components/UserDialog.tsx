import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserForm from "@/components/UserForm";
import type { UserDialogMode } from "@/pages/Users";

const COPY: Record<
  UserDialogMode["type"],
  { title: string; description: string }
> = {
  create: {
    title: "Create user",
    description: "New users are created with the agent role.",
  },
  edit: {
    title: "Edit user",
    description: "Leave the password blank to keep it unchanged.",
  },
};

type UserDialogProps = {
  mode: UserDialogMode | null;
  onClose: () => void;
};

function UserDialog({ mode, onClose }: UserDialogProps) {
  // Keep showing the last mode's content while the close animation plays out,
  // so the dialog doesn't blank before it finishes.
  const [shownMode, setShownMode] = useState<UserDialogMode | null>(mode);
  if (mode && mode !== shownMode) setShownMode(mode);

  const copy = shownMode ? COPY[shownMode.type] : null;

  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy?.title}</DialogTitle>
          <DialogDescription>{copy?.description}</DialogDescription>
        </DialogHeader>
        {shownMode && (
          <UserForm
            key={shownMode.type === "edit" ? shownMode.user.id : "create"}
            mode={shownMode}
            onSuccess={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UserDialog;
