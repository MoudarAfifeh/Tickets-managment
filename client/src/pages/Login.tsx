import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { authClient } from "../lib/auth-client";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError("");

    const { error } = await authClient.signIn.email(values);

    if (error) {
      setServerError(error.message ?? "Invalid email or password");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <form
        className="flex w-80 flex-col gap-3 text-left"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h2 className="mb-2 text-xl font-medium text-gray-900 dark:text-gray-100">
          Sign in
        </h2>
        <label className="flex flex-col gap-1 text-sm text-gray-900 dark:text-gray-100">
          Email
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            aria-invalid={errors.email ? "true" : "false"}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-2 font-sans text-base text-gray-900 aria-[invalid=true]:border-red-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-900 dark:text-gray-100">
          Password
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? "true" : "false"}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-2 font-sans text-base text-gray-900 aria-[invalid=true]:border-red-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </label>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md border border-violet-300 bg-violet-50 px-2.5 py-2.5 font-sans text-violet-600 disabled:cursor-default disabled:opacity-60 dark:border-violet-500/50 dark:bg-violet-400/15 dark:text-violet-400"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default Login;
