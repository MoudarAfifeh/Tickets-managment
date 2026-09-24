import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/serverError";
import type { TicketDetail } from "@/types/ticket";
import ErrorMessage from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

async function summarizeTicket(ticketId: string): Promise<string> {
  const { data } = await api.post<{ summary: string }>(
    `/tickets/${ticketId}/summarize`,
  );
  return data.summary;
}

type TicketSummaryProps = {
  ticket: TicketDetail;
};

// Rendered as its own Card section on TicketDetailsPage, between TicketDetails
// (the message) and Replies (the thread). Summarizing is manual (the button
// below) the first time, but once a summary exists it's kept fresh
// automatically: a new reply changes `ticket.replies.length`, which
// re-triggers the mutation.
function TicketSummary({ ticket }: TicketSummaryProps) {
  const mutation = useMutation({
    mutationFn: () => summarizeTicket(ticket.id),
  });

  const repliesCount = ticket.replies.length;
  const hasSummary = mutation.data !== undefined;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (hasSummary) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repliesCount]);

  return (
    <CardContent className="flex flex-col gap-1.5 border-t pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Summary
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          Summarize
        </Button>
      </div>
      {mutation.data && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mutation.data}
        </p>
      )}
      {mutation.isError && (
        <ErrorMessage className="text-xs">
          {getServerErrorMessage(mutation.error)}
        </ErrorMessage>
      )}
    </CardContent>
  );
}

export default TicketSummary;
