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
  it("disables the send button while the reply is empty or whitespace-only", async () => {
    const user = renderForm();

    expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled();

    await user.type(screen.getByLabelText("Reply"), "   ");
    expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled();

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

  it("disables the polish button while the reply is empty", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Polish" })).toBeDisabled();
  });

  it("polishes the reply and replaces the textarea with the result", async () => {
    mockedAxios.post.mockResolvedValue({
      data: { body: "Polished version of the reply." },
    });
    const user = renderForm();

    const textarea = screen.getByLabelText("Reply");
    await user.type(textarea, "the reply text");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/tickets/${ticket.id}/polish-reply`,
        { body: "the reply text" },
      );
    });
    await waitFor(() =>
      expect(textarea).toHaveValue("Polished version of the reply."),
    );
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/replies"),
      expect.anything(),
    );
  });

  it("shows a server error when polishing fails", async () => {
    mockedAxios.isAxiosError.mockImplementation(
      (err: unknown) =>
        typeof err === "object" && err !== null && "response" in err,
    );
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: "AI features are not configured" } },
    });
    const user = renderForm();

    const textarea = screen.getByLabelText("Reply");
    await user.type(textarea, "the reply text");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    expect(
      await screen.findByText("AI features are not configured"),
    ).toBeInTheDocument();
    expect(textarea).toHaveValue("the reply text");
  });
});
