import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { useState } from "react";
import type { TicketCategory, TicketSortField, TicketStatus } from "code";
import NavBar from "../components/NavBar";
import TicketsTable from "../components/TicketsTable";
import { api } from "@/lib/api";

export type TicketListItem = {
  id: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  senderName: string | null;
  senderEmail: string;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
};

async function fetchTickets(
  sortBy: TicketSortField,
  sortOrder: "asc" | "desc",
): Promise<TicketListItem[]> {
  const res = await api.get<{ tickets: TicketListItem[] }>("/tickets", {
    params: { sortBy, sortOrder },
  });
  return res.data.tickets;
}

function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const sortBy = (sorting[0]?.id ?? "createdAt") as TicketSortField;
  const sortOrder = sorting[0] === undefined || sorting[0].desc ? "desc" : "asc";

  const {
    data: tickets,
    error,
    isPending,
  } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder],
    queryFn: () => fetchTickets(sortBy, sortOrder),
  });

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <div className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Tickets
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        {!error && (
          <TicketsTable
            tickets={tickets}
            isPending={isPending}
            sorting={sorting}
            onSortingChange={setSorting}
          />
        )}
      </div>
    </div>
  );
}

export default Tickets;
