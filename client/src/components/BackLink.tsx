import { ArrowLeft } from "lucide-react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

// "← {label}" link back to a parent page. Takes everything <Link> does
// (`to`, `className`, ...); the label is its children.
function BackLink({ className, children, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        "mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
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
