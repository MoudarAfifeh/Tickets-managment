import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDialog from "./UserDialog";
import { renderWithProviders } from "@/test/render";
import type { UserDialogMode, UserListItem } from "@/pages/Users";

const { mockedAxios } = vi.hoisted(() => {
  const mockedAxios = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    create: vi.fn(),
    isAxiosError: vi.fn(),
  };
  mockedAxios.create.mockReturnValue(mockedAxios);
  return { mockedAxios };
});

vi.mock("axios", () => ({ default: mockedAxios }));

const existingUser: UserListItem = {
  id: "1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "agent",
  active: true,
  createdAt: "2024-01-15T00:00:00.000Z",
};

beforeEach(() => {
  mockedAxios.post.mockReset();
  mockedAxios.patch.mockReset();
  mockedAxios.isAxiosError.mockReset();
});

/** Renders UserDialog with local open/close state so close behaviour is real. */
function Harness({ mode }: { mode: UserDialogMode }) {
  const [open, setOpen] = useState<UserDialogMode | null>(mode);
  return (
    <>
      <button onClick={() => setOpen(mode)}>reopen</button>
      <UserDialog mode={open} onClose={() => setOpen(null)} />
    </>
  );
}

function render(mode: UserDialogMode) {
  const user = userEvent.setup();
  renderWithProviders(<Harness mode={mode} />);
  return user;
}

describe("UserDialog — create mode", () => {
  const mode: UserDialogMode = { type: "create" };

  it("renders the create heading with empty fields", () => {
    render(mode);

    expect(
      screen.getByRole("heading", { name: "Create user" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("surfaces every field error at once and does not submit", async () => {
    const user = render(mode);

    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Name must be at least 3 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("POSTs /users and closes on success", async () => {
    mockedAxios.post.mockResolvedValue({
      data: { user: { ...existingUser, id: "9", name: "Alice" } },
    });
    const user = render(mode);

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

  it("disables the submit button and shows a spinner while pending", async () => {
    mockedAxios.post.mockReturnValue(new Promise(() => {}));
    const user = render(mode);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "password1");
    const submit = screen.getByRole("button", { name: "Create user" });
    await user.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows a server error and stays open on a duplicate email", async () => {
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: "A user with that email already exists" } },
    });
    const user = render(mode);

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

  it("clears the fields after being closed and reopened", async () => {
    const user = render(mode);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create user" }),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "reopen" }));

    expect(await screen.findByLabelText("Name")).toHaveValue("");
  });
});

describe("UserDialog — edit mode", () => {
  const mode: UserDialogMode = { type: "edit", user: existingUser };

  it("renders the edit heading pre-filled with a blank password", () => {
    render(mode);

    expect(
      screen.getByRole("heading", { name: "Edit user" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue(existingUser.name);
    expect(screen.getByLabelText("Email")).toHaveValue(existingUser.email);
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("blocks submit when a provided password is too short", async () => {
    const user = render(mode);

    await user.type(screen.getByLabelText("Password"), "short1");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(mockedAxios.patch).not.toHaveBeenCalled();
  });

  it("PATCHes with an empty password when it is left blank, then closes", async () => {
    mockedAxios.patch.mockResolvedValue({
      data: { user: { ...existingUser, name: "Ada Byron" } },
    });
    const user = render(mode);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Ada Byron");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/users/${existingUser.id}`,
        { name: "Ada Byron", email: existingUser.email, password: "" },
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Edit user" }),
      ).not.toBeInTheDocument();
    });
  });

  it("PATCHes with the new password when one is entered", async () => {
    mockedAxios.patch.mockResolvedValue({ data: { user: existingUser } });
    const user = render(mode);

    await user.type(screen.getByLabelText("Password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/users/${existingUser.id}`,
        {
          name: existingUser.name,
          email: existingUser.email,
          password: "newpassword1",
        },
      );
    });
  });

  it("shows a server error and stays open on a duplicate email", async () => {
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.patch.mockRejectedValue({
      response: { data: { error: "A user with that email already exists" } },
    });
    const user = render(mode);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("A user with that email already exists"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Edit user" }),
    ).toBeInTheDocument();
  });
});
