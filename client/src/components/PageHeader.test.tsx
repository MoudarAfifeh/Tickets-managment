import { render, screen } from "@testing-library/react";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as the page's h1", () => {
    render(<PageHeader title="Tickets" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Tickets" }),
    ).toBeInTheDocument();
  });

  it("renders the description and actions when given", () => {
    render(
      <PageHeader
        title="Users"
        description="People who can sign in"
        actions={<button type="button">New User</button>}
      />,
    );

    expect(screen.getByText("People who can sign in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New User" })).toBeInTheDocument();
  });

  it("omits the description paragraph when there is none", () => {
    const { container } = render(<PageHeader title="Dashboard" />);

    expect(container.querySelector("p")).toBeNull();
  });
});
