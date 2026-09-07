import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUserSchema, editUserSchema, type CreateUserInput } from "code";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/serverError";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserDialogMode, UserListItem } from "@/pages/Users";

// The form only handles the modes with a form; delete has its own confirmation.
type FormMode = Extract<UserDialogMode, { type: "create" | "edit" }>;

// name / email / password — identical for create and edit; only the password
// rule differs, and that lives in the schema picked below.
type UserFormValues = CreateUserInput;

const SUBMIT_LABEL: Record<FormMode["type"], string> = {
  create: "Create user",
  edit: "Save changes",
};

async function submitUser(
  mode: FormMode,
  values: UserFormValues,
): Promise<UserListItem> {
  const res =
    mode.type === "edit"
      ? await api.patch<{ user: UserListItem }>(
          `/users/${mode.user.id}`,
          values,
        )
      : await api.post<{ user: UserListItem }>("/users", values);
  return res.data.user;
}

type UserFormProps = {
  mode: FormMode;
  onSuccess: () => void;
};

function UserForm({ mode, onSuccess }: UserFormProps) {
  const [serverError, setServerError] = useState("");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    // create requires a password; edit lets it stay blank to keep the current one
    resolver: zodResolver(
      mode.type === "edit" ? editUserSchema : createUserSchema,
    ),
    defaultValues:
      mode.type === "edit"
        ? { name: mode.user.name, email: mode.user.email, password: "" }
        : { name: "", email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => submitUser(mode, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
    },
    onError: (error) => setServerError(getServerErrorMessage(error)),
  });

  const pending = isSubmitting || mutation.isPending;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => {
        setServerError("");
        mutation.mutate(values);
      })}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-name">Name</Label>
        <Input
          id="user-name"
          autoComplete="name"
          aria-invalid={errors.name ? "true" : "false"}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="text"
          inputMode="email"
          autoComplete="email"
          aria-invalid={errors.email ? "true" : "false"}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-password">Password</Label>
        <Input
          id="user-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? "true" : "false"}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {SUBMIT_LABEL[mode.type]}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default UserForm;
