import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateUserDialog from "./CreateUserDialog";
import { renderWithProviders } from "@/test/render";

const { mockedAxios } = vi.hoisted(() => {
  const mockedAxios = {
    get: vi.fn(),
    post: vi.fn(),
    create: vi.fn(),
    isAxiosError: vi.fn(),
  };
  mockedAxios.create.mockReturnValue(mockedAxios);
  return { mockedAxios };
});

vi.mock("axios", () => ({ default: mockedAxios }));

beforeEach(() => {
  mockedAxios.post.mockReset();
  mockedAxios.isAxiosError.mockReset();
});

async function openDialog() {
  const user = userEvent.setup();
  renderWithProviders(<CreateUserDialog />);
  await user.click(screen.getByRole("button", { name: /new user/i }));
  return user;
}

describe("CreateUserDialog", () => {
  it("opens the modal with name, email, and password fields", async () => {
    await openDialog();

    expect(screen.getByRole("heading", { name: "Create user" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when the name is too short", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("Name"), "Al");
    await user.type(screen.getByLabelText("Email"), "al@example.com");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Name must be at least 3 characters"),
    ).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not submit when the email is invalid", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not submit when the password is too short", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "short1");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("shows every field's validation error at once when submitted empty", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Name must be at least 3 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enter a valid email address"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("disables the submit button and shows a spinner while the request is pending", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const user = await openDialog();

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "password1");

    const submitButton = screen.getByRole("button", { name: "Create user" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("clears the fields when the dialog is closed and reopened", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create user" }),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /new user/i }));

    expect(await screen.findByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("creates the user and closes the modal on success", async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        user: {
          id: "3",
          name: "Alice",
          email: "alice@example.com",
          role: "agent",
          active: true,
          createdAt: "2024-03-01T00:00:00.000Z",
        },
      },
    });
    const user = await openDialog();

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith("/users", {
        name: "Alice",
        email: "alice@example.com",
        password: "password1",
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create user" }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows a server error and keeps the modal open on a duplicate email", async () => {
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: "A user with that email already exists" } },
    });
    const user = await openDialog();

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("A user with that email already exists"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Create user" }),
    ).toBeInTheDocument();
  });
});
