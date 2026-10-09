import { ArrowLeft } from "lucide-react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

// "← {label}" link back to a parent page. Takes everything <Link> does
// (`to`, `className`, ...); the label is its children.
function BackLink({ className, children, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        "mb-6 inline-flex items-center gap-1 text-sm rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}

export default BackLink;
