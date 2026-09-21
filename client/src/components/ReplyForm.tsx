import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReplySchema, type CreateReplyInput } from "code";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/serverError";
import type { TicketDetail } from "@/types/ticket";
import ErrorMessage from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

async function postReply(
  ticketId: string,
  data: CreateReplyInput,
): Promise<void> {
  await api.post(`/tickets/${ticketId}/replies`, data);
}

type ReplyFormProps = {
  ticket: TicketDetail;
};

function ReplyForm({ ticket }: ReplyFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateReplyInput) => postReply(ticket.id, data),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
    },
  });

  const pending = isSubmitting || mutation.isPending;

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
    >
      <Label htmlFor="reply-body">Reply</Label>
      <Textarea
        id="reply-body"
        rows={3}
        placeholder="Write a reply..."
        aria-invalid={errors.body ? "true" : "false"}
        {...register("body")}
      />
      {errors.body && (
        <ErrorMessage className="text-xs">{errors.body.message}</ErrorMessage>
      )}
      {mutation.isError && (
        <ErrorMessage className="text-xs">
          {getServerErrorMessage(mutation.error)}
        </ErrorMessage>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Send reply
        </Button>
      </div>
    </form>
  );
}

export default ReplyForm;
