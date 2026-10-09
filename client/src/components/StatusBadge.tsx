import type { TicketStatus } from "code";
import { cn } from "@/lib/utils";

// Each status gets its own dot color from the theme's --status-* tokens;
// the label itself stays in the regular text color so a column of statuses
// reads calmly rather than as a wall of colored pills.
const STATUS_DOT_CLASS: Record<TicketStatus, string> = {
  new: "bg-status-new",
  processing: "bg-status-processing",
  open: "bg-status-open",
  resolved: "bg-status-resolved",
  closed: "bg-status-closed",
};

type StatusBadgeProps = {
  status: TicketStatus;
  className?: string;
};

function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-foreground capitalize",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", STATUS_DOT_CLASS[status])}
      />
      {status}
    </span>
  );
}

export default StatusBadge;
