import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Same shape as createUserSchema, but the password is optional: "" means
// "leave the password unchanged" rather than "set it to an empty string".
export const editUserSchema = createUserSchema.extend({
  password: z.union([
    z.string().min(8, "Password must be at least 8 characters"),
    z.literal(""),
  ]),
});

export type EditUserInput = z.infer<typeof editUserSchema>;
