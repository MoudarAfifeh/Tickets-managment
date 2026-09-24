import { initials } from "@/lib/utils";
import type { TicketDetail } from "@/types/ticket";
import { CardContent, CardHeader } from "@/components/ui/card";

type TicketDetailsProps = {
  ticket: TicketDetail;
};

// The ticket's own content — subject, sender, date and message. The AI
// summary, reply thread and reply box are separate components (TicketSummary,
// Replies, ReplyForm).
function TicketDetails({ ticket }: TicketDetailsProps) {
  const senderName = ticket.senderName || ticket.senderEmail;

  return (
    <>
      <CardHeader className="border-b">
        <div className="mb-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {ticket.subject}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ticket #{ticket.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
            {initials(senderName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {senderName}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {ticket.senderEmail} ·{" "}
              {new Date(ticket.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
          {ticket.body}
        </p>
      </CardContent>
    </>
  );
}

export default TicketDetails;
