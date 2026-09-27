import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import TicketFilters, { type TicketFiltersValue } from "./TicketFilters";

const DEFAULT_VALUE: TicketFiltersValue = {
  status: "all",
  category: "all",
  search: "",
};

describe("TicketFilters", () => {
  it("lists every status, including the new lifecycle ones, plus 'All statuses'", async () => {
    const user = userEvent.setup();
    render(<TicketFilters value={DEFAULT_VALUE} onChange={() => {}} />);

    await user.click(screen.getByRole("combobox", { name: "Status" }));

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "All statuses",
      "New",
      "Processing",
      "Open",
      "Resolved",
      "Closed",
    ]);
  });

  it("calls onChange with the selected status", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TicketFilters value={DEFAULT_VALUE} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: "Processing" }));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      status: "processing",
    });
  });
});
