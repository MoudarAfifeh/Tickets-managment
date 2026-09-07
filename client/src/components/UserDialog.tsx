import type { ReactNode } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DeleteUserConfirm from "@/components/DeleteUserConfirm";
import UserForm from "@/components/UserForm";
import type { UserDialogMode } from "@/pages/Users";

type DialogContentParts = {
  title: string;
  description: string;
  body: ReactNode;
};

// One place that turns a mode into the dialog's title, blurb, and body.
function contentFor(
  mode: UserDialogMode,
  onClose: () => void,
): DialogContentParts {
  switch (mode.type) {
    case "create":
    case "edit":
      return {
        title: mode.type === "edit" ? "Edit user" : "Create user",
        description:
          mode.type === "edit"
            ? "Leave the password blank to keep it unchanged."
            : "New users are created with the agent role.",
        body: (
          <UserForm
            key={mode.type === "edit" ? mode.user.id : "create"}
            mode={mode}
            onSuccess={onClose}
          />
        ),
      };
    case "delete":
      return {
        title: "Delete user",
        description: `${mode.user.name} will be removed from the list and lose access immediately.`,
        body: (
          <DeleteUserConfirm
            key={mode.user.id}
            user={mode.user}
            onSuccess={onClose}
          />
        ),
      };
  }
}

type UserDialogProps = {
  mode: UserDialogMode | null;
  onClose: () => void;
};

function UserDialog({ mode, onClose }: UserDialogProps) {
  // Keep showing the last mode's content while the close animation plays out,
  // so the dialog doesn't blank before it finishes.
  const [shownMode, setShownMode] = useState<UserDialogMode | null>(mode);
  if (mode && mode !== shownMode) setShownMode(mode);

  const content = shownMode ? contentFor(shownMode, onClose) : null;

  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content?.title}</DialogTitle>
          <DialogDescription>{content?.description}</DialogDescription>
        </DialogHeader>
        {content?.body}
      </DialogContent>
    </Dialog>
  );
}

export default UserDialog;
