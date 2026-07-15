import { cn } from "@/lib/utils";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

type FieldControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true";
};

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const errorId = `field-error-${useId().replace(/:/g, "")}`;
  const control = error && isValidElement<FieldControlProps>(children)
    ? cloneElement(children as ReactElement<FieldControlProps>, {
        "aria-describedby": [children.props["aria-describedby"], errorId].filter(Boolean).join(" "),
        "aria-invalid": true,
      })
    : children;

  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink">
      <span>{label}</span>
      {control}
      {error ? <span className="text-xs font-semibold text-red-700" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}

export function inputClass(className?: string) {
  return cn(
    "min-h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary",
    className,
  );
}
