import { useQuery } from "@tanstack/react-query";
import type { TicketCategory, TicketStatus } from "code";
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

async function fetchTickets(): Promise<TicketListItem[]> {
  const res = await api.get<{ tickets: TicketListItem[] }>("/tickets");
  return res.data.tickets;
}

function Tickets() {
  const {
    data: tickets,
    error,
    isPending,
  } = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <div className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Tickets
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        {!error && <TicketsTable tickets={tickets} isPending={isPending} />}
      </div>
    </div>
  );
}

export default Tickets;
