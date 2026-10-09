import { cn, initials } from "@/lib/utils";
import type { TicketDetail } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";

type RepliesProps = {
  ticket: TicketDetail;
};

function Replies({ ticket }: RepliesProps) {
  if (ticket.replies.length === 0) return null;

  // A "customer" reply has no author — its sender is the ticket's own
  // sender. An "ai" reply also has no author — it's the auto-resolver
  // posting on the customer's behalf (see autoResolveTicket.ts) — but it's
  // deliberately displayed identically to a human agent reply, with no
  // visible AI attribution, since the customer-facing message is meant to
  // read as an ordinary support reply.
  const customerName = ticket.senderName || ticket.senderEmail;

  return (
    <CardContent className="max-h-[32rem] space-y-4 overflow-y-auto border-t pt-4">
      {ticket.replies.map((reply) => {
        const displayName =
          reply.senderType === "agent"
            ? (reply.author?.name ?? "Agent")
            : reply.senderType === "ai"
              ? "Moudar Afifeh Support"
              : customerName;
        const badgeLabel = reply.senderType === "ai" ? "agent" : reply.senderType;
        return (
          <div key={reply.id} className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {initials(displayName)}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-lg border p-3",
                reply.senderType === "customer"
                  ? "border-border bg-card"
                  : "border-transparent bg-secondary/60",
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-foreground">
                  {displayName}
                </span>
                <Badge
                  variant={
                    reply.senderType === "agent" || reply.senderType === "ai"
                      ? "secondary"
                      : "outline"
                  }
                  className="capitalize"
                >
                  {badgeLabel}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(reply.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {reply.body}
              </p>
            </div>
          </div>
        );
      })}
    </CardContent>
  );
}

export default Replies;
