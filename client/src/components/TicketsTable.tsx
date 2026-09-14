import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TicketListItem } from "@/pages/Tickets";

const SKELETON_ROWS = 5;

const CATEGORY_LABELS: Record<TicketListItem["category"], string> = {
  general_question: "General question",
  technical_question: "Technical question",
  refund_request: "Refund request",
};

const STATUS_VARIANT: Record<
  TicketListItem["status"],
  "default" | "secondary" | "outline"
> = {
  open: "default",
  resolved: "secondary",
  closed: "outline",
};

type TicketsTableProps = {
  tickets: TicketListItem[] | undefined;
  isPending: boolean;
};

function TicketsTable({ tickets, isPending }: TicketsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>From</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned to</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending
          ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-28 rounded-4xl" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-4xl" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
              </TableRow>
            ))
          : tickets?.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  {ticket.subject}
                </TableCell>
                <TableCell>{ticket.senderName || ticket.senderEmail}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {CATEGORY_LABELS[ticket.category]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[ticket.status]}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.assignedTo?.name ?? "Unassigned"}</TableCell>
                <TableCell>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

export default TicketsTable;
