import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function ErrorMessage({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-destructive", className)} {...props} />;
}

export default ErrorMessage;
