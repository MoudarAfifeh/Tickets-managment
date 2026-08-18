import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: ["admin", "agent"],
          input: false,
        },
      },
    }),
  ],
});
export const { useSession, signIn, signOut } = authClient;
