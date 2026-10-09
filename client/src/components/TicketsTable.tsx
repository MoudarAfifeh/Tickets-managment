import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
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
const SKELETON_WIDTHS = ["w-48", "w-40", "w-28", "w-16", "w-24", "w-20"];

export const CATEGORY_LABELS: Record<TicketListItem["category"], string> = {
  general_question: "General question",
  technical_question: "Technical question",
  refund_request: "Refund request",
};

const columnHelper = createColumnHelper<TicketListItem>();

const columns = [
  columnHelper.accessor("subject", {
    id: "subject",
    header: "Subject",
    cell: (info) => (
      <Link
        to={`/tickets/${info.row.original.id}`}
        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor((row) => row.senderName || row.senderEmail, {
    id: "senderEmail",
    header: "From",
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("category", {
    id: "category",
    header: "Category",
    // Refunds involve money, so they're the one category tinted (clay);
    // the rest stay neutral.
    cell: (info) => (
      <span
        className={
          info.getValue() === "refund_request"
            ? "font-medium text-clay"
            : "text-muted-foreground"
        }
      >
        {CATEGORY_LABELS[info.getValue()]}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor((row) => row.assignedTo?.name ?? "Unassigned", {
    id: "assignedTo",
    header: "Assigned to",
    cell: (info) => (
      <span
        className={
          info.row.original.assignedTo ? undefined : "text-muted-foreground"
        }
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: "Created",
    cell: (info) => (
      <span className="text-muted-foreground tabular-nums">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
];

type TicketsTableProps = {
  tickets: TicketListItem[] | undefined;
  isPending: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
};

function TicketsTable({
  tickets,
  isPending,
  sorting,
  onSortingChange,
}: TicketsTableProps) {
  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sortDirection = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  className="h-10 bg-muted/50 px-4 text-xs font-medium text-muted-foreground"
                >
                  <button
                    type="button"
                    className="-mx-1 flex cursor-pointer items-center gap-1 rounded-sm px-1 select-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {sortDirection === "asc" && (
                      <ArrowUp className="size-3.5" />
                    )}
                    {sortDirection === "desc" && (
                      <ArrowDown className="size-3.5" />
                    )}
                    {!sortDirection && (
                      <ChevronsUpDown className="size-3.5 opacity-50" />
                    )}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isPending
          ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                {SKELETON_WIDTHS.map((width, j) => (
                  <TableCell key={j} className="px-4 py-3.5">
                    <Skeleton className={`h-4 ${width}`} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : table.getRowModel().rows.length === 0
            ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No tickets to show.
                  </TableCell>
                </TableRow>
              )
            : table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

export default TicketsTable;
