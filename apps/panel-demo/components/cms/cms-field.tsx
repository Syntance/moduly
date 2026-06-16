import type { ReactNode } from "react";

export const cmsInputClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type FieldsetProps = {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function CmsFieldset({ title, hint, action, children }: FieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {action ? (
        <div className="flex items-center justify-between gap-3">
          <legend className="px-1 text-sm font-medium">{title}</legend>
          {action}
        </div>
      ) : (
        <legend className="px-1 text-sm font-medium">{title}</legend>
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </fieldset>
  );
}
