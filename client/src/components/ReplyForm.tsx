import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReplySchema, type CreateReplyInput } from "code";
import { Loader2, Sparkles } from "lucide-react";
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

async function polishReply(ticketId: string, body: string): Promise<string> {
  const { data } = await api.post<{ body: string }>(
    `/tickets/${ticketId}/polish-reply`,
    { body },
  );
  return data.body;
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
    setValue,
    watch,
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

  const polishMutation = useMutation({
    mutationFn: (body: string) => polishReply(ticket.id, body),
    onSuccess: (polished) => {
      setValue("body", polished, { shouldValidate: true, shouldDirty: true });
    },
  });

  const bodyValue = watch("body");
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
      {polishMutation.isError && (
        <ErrorMessage className="text-xs">
          {getServerErrorMessage(polishMutation.error)}
        </ErrorMessage>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || polishMutation.isPending || !bodyValue.trim()}
          onClick={() => polishMutation.mutate(bodyValue)}
        >
          {polishMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          Polish
        </Button>
        <Button
          type="submit"
          disabled={pending || polishMutation.isPending || !bodyValue.trim()}
        >
          {pending && <Loader2 className="animate-spin" />}
          Send reply
        </Button>
      </div>
    </form>
  );
}

export default ReplyForm;
