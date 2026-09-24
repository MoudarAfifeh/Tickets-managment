import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { CircleAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import BackLink from "../components/BackLink";
import NavBar from "../components/NavBar";
import Replies from "../components/Replies";
import ReplyForm from "../components/ReplyForm";
import TicketDetails from "../components/TicketDetails";
import TicketSummary from "../components/TicketSummary";
import UpdateTicket from "../components/UpdateTicket";
import { api } from "@/lib/api";
import type { TicketDetail } from "@/types/ticket";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await api.get<{ ticket: TicketDetail }>(`/tickets/${id}`);
  return res.data.ticket;
}

function TicketDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader className="border-b">
          <div className="mb-3 space-y-2">
            <Skeleton className="h-7 w-96 max-w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
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
  );
}

// Layout/container only: owns the ticket query and the loading/error states,
// then hands the whole `ticket` object to each section.
function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: ticket,
    error,
    isPending,
  } = useQuery({
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
        <BackLink to="/">Back to tickets</BackLink>

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
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <TicketDetails ticket={ticket} />
              <TicketSummary ticket={ticket} />
              <Replies ticket={ticket} />
              <CardFooter className="flex-col items-stretch gap-2 border-t">
                <ReplyForm ticket={ticket} />
              </CardFooter>
            </Card>

            <Card className="lg:col-span-2">
              <UpdateTicket ticket={ticket} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketDetailsPage;
