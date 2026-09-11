import { z } from "zod";

/**
 * Inbound support email as handed to `POST /api/webhooks/inbound-email`.
 * Provider-neutral: whatever forwards mail to us flattens its format into this
 * shape (no mail provider is wired yet).
 */
export const inboundEmailSchema = z.object({
  from: z.email(),
  fromName: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  bodyHtml: z.string().optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
