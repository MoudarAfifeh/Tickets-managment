import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  CircleAlert,
  CircleDot,
  Mail,
  Tag,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ticketCategoryValues,
  ticketStatusValues,
  type TicketCategory,
  type TicketStatus,
} from "code";
import NavBar from "../components/NavBar";
import { CATEGORY_LABELS } from "../components/TicketsTable";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/serverError";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type TicketDetail = {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category: TicketCategory;
  senderName: string | null;
  senderEmail: string;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type Assignee = { id: string; name: string };

async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await api.get<{ ticket: TicketDetail }>(`/tickets/${id}`);
  return res.data.ticket;
}

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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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

function TicketDetailSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-96" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [assignError, setAssignError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const { data: ticket, error, isPending } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
    // Don't burn through retries on a definitive 404 (or other 4xx) before
    // showing the error state — only retry on network/5xx failures.
    retry: (failureCount, err) =>
      !(axios.isAxiosError(err) && err.response && err.response.status < 500) &&
      failureCount < 3,
  });

  const { data: assignees } = useQuery({
    queryKey: ["assignees"],
    queryFn: fetchAssignees,
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      assignTicket(id!, assignedToId),
    onSuccess: (updated) => {
      setAssignError("");
      queryClient.setQueryData(["ticket", id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
    },
    onError: (err) => setAssignError(getServerErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) => updateTicketStatus(id!, status),
    onSuccess: (updated) => {
      setStatusError("");
      queryClient.setQueryData(["ticket", id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
    },
    onError: (err) => setStatusError(getServerErrorMessage(err)),
  });

  const categoryMutation = useMutation({
    mutationFn: (category: TicketCategory) =>
      updateTicketCategory(id!, category),
    onSuccess: (updated) => {
      setCategoryError("");
      queryClient.setQueryData(["ticket", id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
    },
    onError: (err) => setCategoryError(getServerErrorMessage(err)),
  });

  const notFound = axios.isAxiosError(error) && error.response?.status === 404;

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-5xl p-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="size-4" />
          Back to tickets
        </Link>

        {isPending && <TicketDetailSkeleton />}

        {!isPending && error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <CircleAlert className="size-8 text-muted-foreground" />
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {notFound ? "Ticket not found" : "Something went wrong"}
              </p>
              <p className="text-sm text-muted-foreground">
                {notFound
                  ? "This ticket doesn't exist or may have been removed."
                  : error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {!isPending && !error && ticket && (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {ticket.subject}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ticket #{ticket.id.slice(0, 8)}
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {initials(ticket.senderName || ticket.senderEmail)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {ticket.senderName || ticket.senderEmail}
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
              </Card>

              <Card className="lg:col-span-2">
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
                      <p className="mt-1 text-xs text-destructive">
                        {statusError}
                      </p>
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
                          {(value: string) =>
                            CATEGORY_LABELS[value as TicketCategory]
                          }
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
                      <p className="mt-1 text-xs text-destructive">
                        {categoryError}
                      </p>
                    )}
                  </DetailRow>
                  <DetailRow icon={UserRound} label="Assigned to">
                    <Select
                      value={ticket.assignedTo?.id ?? UNASSIGNED}
                      onValueChange={(value: string | null) =>
                        assignMutation.mutate(
                          value === UNASSIGNED || value === null
                            ? null
                            : value,
                        )
                      }
                      disabled={assignMutation.isPending}
                    >
                      <SelectTrigger className="w-full" aria-label="Assigned to">
                        <SelectValue className="truncate">
                          {(value: string) =>
                            value === UNASSIGNED
                              ? "Unassigned"
                              : (assignees?.find((a) => a.id === value)
                                  ?.name ?? "Unassigned")
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
                      <p className="mt-1 text-xs text-destructive">
                        {assignError}
                      </p>
                    )}
                  </DetailRow>
                  <DetailRow icon={Mail} label="Sender">
                    <a
                      href={`mailto:${ticket.senderEmail}`}
                      className="hover:underline"
                    >
                      {ticket.senderEmail}
                    </a>
                  </DetailRow>
                  <DetailRow icon={Calendar} label="Created">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </DetailRow>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TicketDetailPage;
