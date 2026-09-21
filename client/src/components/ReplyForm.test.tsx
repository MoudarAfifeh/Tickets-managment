import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTicket } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import ReplyForm from "./ReplyForm";

const { mockedAxios } = vi.hoisted(() => {
  const mockedAxios = {
    post: vi.fn(),
    create: vi.fn(),
    isAxiosError: vi.fn(),
  };
  mockedAxios.create.mockReturnValue(mockedAxios);
  return { mockedAxios };
});

vi.mock("axios", () => ({ default: mockedAxios }));

const ticket = makeTicket();

beforeEach(() => {
  mockedAxios.post.mockReset();
  mockedAxios.isAxiosError.mockReset();
});

function renderForm() {
  const user = userEvent.setup();
  renderWithProviders(<ReplyForm ticket={ticket} />);
  return user;
}

describe("ReplyForm", () => {
  it("shows a validation error and does not submit an empty reply", async () => {
    const user = renderForm();

    await user.click(screen.getByRole("button", { name: "Send reply" }));

    expect(await screen.findByText("Message is required")).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("posts the reply to the ticket and clears the form", async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });
    const user = renderForm();

    const textarea = screen.getByLabelText("Reply");
    await user.type(textarea, "Try resetting from the login page.");
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/tickets/${ticket.id}/replies`,
        { body: "Try resetting from the login page." },
      );
    });
    await waitFor(() => expect(textarea).toHaveValue(""));
  });

  it("shows a server error and keeps the text when the reply fails to send", async () => {
    mockedAxios.isAxiosError.mockImplementation(
      (err: unknown) =>
        typeof err === "object" && err !== null && "response" in err,
    );
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: "Ticket not found" } },
    });
    const user = renderForm();

    const textarea = screen.getByLabelText("Reply");
    await user.type(textarea, "Hello");
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    expect(await screen.findByText("Ticket not found")).toBeInTheDocument();
    expect(textarea).toHaveValue("Hello");
  });
});
