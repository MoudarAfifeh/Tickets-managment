import { render, screen } from "@testing-library/react";
import ErrorMessage from "./ErrorMessage";

describe("ErrorMessage", () => {
  it("renders its children with the destructive text style", () => {
    render(<ErrorMessage>Something went wrong</ErrorMessage>);

    const message = screen.getByText("Something went wrong");
    expect(message.tagName).toBe("P");
    expect(message).toHaveClass("text-sm", "text-destructive");
  });

  it("lets a className override the default size and add spacing", () => {
    render(<ErrorMessage className="mt-1 text-xs">Too short</ErrorMessage>);

    const message = screen.getByText("Too short");
    expect(message).toHaveClass("mt-1", "text-xs", "text-destructive");
    expect(message).not.toHaveClass("text-sm");
  });

  it("forwards other props to the paragraph", () => {
    render(<ErrorMessage role="alert">Invalid email</ErrorMessage>);

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
  });
});
