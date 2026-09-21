import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import BackLink from "./BackLink";

describe("BackLink", () => {
  it("renders a link to the given path with the label as its text", () => {
    renderWithProviders(<BackLink to="/">Back to tickets</BackLink>);

    expect(
      screen.getByRole("link", { name: "Back to tickets" }),
    ).toHaveAttribute("href", "/");
  });

  it("links wherever `to` points", () => {
    renderWithProviders(<BackLink to="/users">Back to users</BackLink>);

    expect(
      screen.getByRole("link", { name: "Back to users" }),
    ).toHaveAttribute("href", "/users");
  });

  it("lets a className override the default spacing", () => {
    renderWithProviders(
      <BackLink to="/" className="mb-2">
        Back
      </BackLink>,
    );

    const link = screen.getByRole("link", { name: "Back" });
    expect(link).toHaveClass("mb-2", "inline-flex");
    expect(link).not.toHaveClass("mb-6");
  });
});
