"use client";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors", checked ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/60")}>
      <CheckboxPrimitive.Root
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-muted-foreground/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className="leading-snug">{label}</span>
    </label>
  );
}
