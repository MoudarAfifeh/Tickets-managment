import { useQuery } from "@tanstack/react-query";
import { Bot, CircleDot, Clock, Percent, Ticket as TicketIcon } from "lucide-react";
import NavBar from "@/components/NavBar";
import StatCard from "@/components/StatCard";
import TicketsPerDayChart from "@/components/TicketsPerDayChart";
import ErrorMessage from "@/components/ErrorMessage";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/types/dashboard";

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>("/tickets/stats");
  return res.data;
}

function formatResolutionTime(ms: number | null): string {
  if (ms === null) return "—";

  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

function Dashboard() {
  const { data, error, isPending } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <div className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Dashboard
        </div>

        {error && <ErrorMessage>{error.message}</ErrorMessage>}

        {!error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={TicketIcon}
              label="Total tickets"
              value={data?.totalTickets.toLocaleString() ?? ""}
              isPending={isPending}
            />
            <StatCard
              icon={CircleDot}
              label="Open tickets"
              value={data?.openTickets.toLocaleString() ?? ""}
              isPending={isPending}
            />
            <StatCard
              icon={Bot}
              label="Resolved by AI"
              value={data?.aiResolvedCount.toLocaleString() ?? ""}
              isPending={isPending}
            />
            <StatCard
              icon={Percent}
              label="% resolved by AI"
              value={
                data ? `${data.aiResolvedPercentage.toFixed(1)}%` : ""
              }
              isPending={isPending}
            />
            <StatCard
              icon={Clock}
              label="Avg. resolution time"
              value={
                data ? formatResolutionTime(data.averageResolutionMs) : ""
              }
              isPending={isPending}
            />
          </div>
        )}

        {!error && (
          <TicketsPerDayChart
            data={data?.ticketsPerDay}
            isPending={isPending}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
