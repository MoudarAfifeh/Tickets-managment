import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  CircleAlert,
  Mail,
  Tag,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type { TicketCategory, TicketStatus } from "code";
import NavBar from "../components/NavBar";
import { CATEGORY_LABELS, STATUS_VARIANT } from "../components/TicketsTable";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await api.get<{ ticket: TicketDetail }>(`/tickets/${id}`);
  return res.data.ticket;
}

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
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {children}
        </div>
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
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
        <Card>
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
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {ticket.subject}
                </h1>
                <Badge variant={STATUS_VARIANT[ticket.status]} className="capitalize">
                  {ticket.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Ticket #{ticket.id.slice(0, 8)}
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
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

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <DetailRow icon={Tag} label="Category">
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[ticket.category]}
                    </Badge>
                  </DetailRow>
                  <DetailRow icon={UserRound} label="Assigned to">
                    {ticket.assignedTo?.name ?? "Unassigned"}
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
