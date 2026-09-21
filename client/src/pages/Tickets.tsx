import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useState } from "react";
import type { TicketCategory, TicketSortField, TicketStatus } from "code";
import NavBar from "../components/NavBar";
import TicketsTable from "../components/TicketsTable";
import TicketFilters, {
  type TicketFiltersValue,
} from "../components/TicketFilters";
import TicketsPagination from "../components/TicketsPagination";
import { api } from "@/lib/api";
import ErrorMessage from "@/components/ErrorMessage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

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

type TicketListResponse = {
  tickets: TicketListItem[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_FILTERS: TicketFiltersValue = {
  status: "all",
  category: "all",
  search: "",
};

const PAGE_SIZE = 10;

async function fetchTickets(
  sortBy: TicketSortField,
  sortOrder: "asc" | "desc",
  status: TicketStatus | "all",
  category: TicketCategory | "all",
  search: string,
  page: number,
): Promise<TicketListResponse> {
  const res = await api.get<TicketListResponse>("/tickets", {
    params: {
      sortBy,
      sortOrder,
      status: status === "all" ? undefined : status,
      category: category === "all" ? undefined : category,
      search: search || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
  });
  return res.data;
}

function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const sortBy = (sorting[0]?.id ?? "createdAt") as TicketSortField;
  const sortOrder =
    sorting[0] === undefined || sorting[0].desc ? "desc" : "asc";

  const [filters, setFilters] = useState<TicketFiltersValue>(DEFAULT_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const [page, setPage] = useState(1);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater);
    setPage(1);
  };

  const handleFiltersChange = (next: TicketFiltersValue) => {
    setFilters(next);
    setPage(1);
  };

  const { data, error, isPending } = useQuery({
    queryKey: [
      "tickets",
      sortBy,
      sortOrder,
      filters.status,
      filters.category,
      debouncedSearch,
      page,
    ],
    queryFn: () =>
      fetchTickets(
        sortBy,
        sortOrder,
        filters.status,
        filters.category,
        debouncedSearch,
        page,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <div className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Tickets
        </div>

        <TicketFilters value={filters} onChange={handleFiltersChange} />

        {error && <ErrorMessage>{error.message}</ErrorMessage>}

        {!error && (
          <>
            <TicketsTable
              tickets={data?.tickets}
              isPending={isPending}
              sorting={sorting}
              onSortingChange={handleSortingChange}
            />
            <TicketsPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Tickets;
