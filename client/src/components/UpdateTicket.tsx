import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CircleDot, Mail, Tag, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  ticketCategoryValues,
  ticketStatusValues,
  type TicketCategory,
  type TicketStatus,
} from "code";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/serverError";
import type { TicketDetail } from "@/types/ticket";
import ErrorMessage from "@/components/ErrorMessage";
import { CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS } from "./TicketsTable";

type Assignee = { id: string; name: string };

async function fetchAssignees(): Promise<Assignee[]> {
  const res = await api.get<{ users: Assignee[] }>("/tickets/assignees");
  return res.data.users;
}

async function assignTicket(
  id: string,
  assignedToId: string | null,
): Promise<TicketDetail> {
  const res = await api.patch<{ ticket: TicketDetail }>(
    `/tickets/${id}/assign`,
    { assignedToId },
  );
  return res.data.ticket;
}

async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<TicketDetail> {
  const res = await api.patch<{ ticket: TicketDetail }>(
    `/tickets/${id}/status`,
    { status },
  );
  return res.data.ticket;
}

async function updateTicketCategory(
  id: string,
  category: TicketCategory,
): Promise<TicketDetail> {
  const res = await api.patch<{ ticket: TicketDetail }>(
    `/tickets/${id}/category`,
    { category },
  );
  return res.data.ticket;
}

// Base UI's Select doesn't accept an empty-string item value, so the
// "Unassigned" option uses this sentinel and gets mapped back to null.
const UNASSIGNED = "__unassigned__";

// Gives the status control an at-a-glance severity cue: open (active, needs
// attention) in green, resolved (done) in blue, closed (archived) muted.
const STATUS_TRIGGER_CLASS: Record<TicketStatus, string> = {
  open: "border-transparent bg-green-600 text-white hover:bg-green-600/90 dark:bg-green-500/90 dark:hover:bg-green-500",
  resolved:
    "border-transparent bg-blue-600 text-white hover:bg-blue-600/90 dark:bg-blue-500/90 dark:hover:bg-blue-500",
  closed: "border-border bg-transparent text-foreground",
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-28 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-sm text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </div>
  );
}

type UpdateTicketProps = {
  ticket: TicketDetail;
};

// The editable side of a ticket: status, category and assignee (each saved on
// change), plus the read-only sender and created date. A successful update
// writes the returned ticket into the `["ticket", id]` query, so the page that
// owns that query re-renders with the new values.
function UpdateTicket({ ticket }: UpdateTicketProps) {
  const queryClient = useQueryClient();
  const [assignError, setAssignError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const { data: assignees } = useQuery({
    queryKey: ["assignees"],
    queryFn: fetchAssignees,
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      assignTicket(ticket.id, assignedToId),
    onSuccess: (updated) => {
      setAssignError("");
      queryClient.setQueryData(["ticket", ticket.id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
    },
    onError: (err) => setAssignError(getServerErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      updateTicketStatus(ticket.id, status),
    onSuccess: (updated) => {
      setStatusError("");
      queryClient.setQueryData(["ticket", ticket.id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
    },
    onError: (err) => setStatusError(getServerErrorMessage(err)),
  });

  const categoryMutation = useMutation({
    mutationFn: (category: TicketCategory) =>
      updateTicketCategory(ticket.id, category),
    onSuccess: (updated) => {
      setCategoryError("");
      queryClient.setQueryData(["ticket", ticket.id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
    },
    onError: (err) => setCategoryError(getServerErrorMessage(err)),
  });

  return (
    <CardContent className="space-y-4 pt-6">
      <DetailRow icon={CircleDot} label="Status">
        <Select
          value={ticket.status}
          onValueChange={(value: TicketStatus | null) =>
            value && statusMutation.mutate(value)
          }
          disabled={statusMutation.isPending}
        >
          <SelectTrigger
            className={cn(
              "w-full capitalize font-medium",
              STATUS_TRIGGER_CLASS[ticket.status],
            )}
            aria-label="Status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ticketStatusValues.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusError && (
          <ErrorMessage className="mt-1 text-xs">{statusError}</ErrorMessage>
        )}
      </DetailRow>
      <DetailRow icon={Tag} label="Category">
        <Select
          value={ticket.category}
          onValueChange={(value: TicketCategory | null) =>
            value && categoryMutation.mutate(value)
          }
          disabled={categoryMutation.isPending}
        >
          <SelectTrigger className="w-full" aria-label="Category">
            <SelectValue className="truncate">
              {(value: string) => CATEGORY_LABELS[value as TicketCategory]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ticketCategoryValues.map((category) => (
              <SelectItem key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoryError && (
          <ErrorMessage className="mt-1 text-xs">{categoryError}</ErrorMessage>
        )}
      </DetailRow>
      <DetailRow icon={UserRound} label="Assigned to">
        <Select
          value={ticket.assignedTo?.id ?? UNASSIGNED}
          onValueChange={(value: string | null) =>
            assignMutation.mutate(
              value === UNASSIGNED || value === null ? null : value,
            )
          }
          disabled={assignMutation.isPending}
        >
          <SelectTrigger className="w-full" aria-label="Assigned to">
            <SelectValue className="truncate">
              {(value: string) =>
                value === UNASSIGNED
                  ? "Unassigned"
                  : (assignees?.find((a) => a.id === value)?.name ??
                    "Unassigned")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {assignees?.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id}>
                {assignee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignError && (
          <ErrorMessage className="mt-1 text-xs">{assignError}</ErrorMessage>
        )}
      </DetailRow>
      <DetailRow icon={Mail} label="Sender">
        <a href={`mailto:${ticket.senderEmail}`} className="hover:underline">
          {ticket.senderEmail}
        </a>
      </DetailRow>
      <DetailRow icon={Calendar} label="Created">
        {new Date(ticket.createdAt).toLocaleString()}
      </DetailRow>
    </CardContent>
  );
}

export default UpdateTicket;
