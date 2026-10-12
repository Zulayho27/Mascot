"use client";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({
  value,
  onChange,
  min = 0,
  max = 10,
  className,
  label,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  const set = typeof value === "number";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <SliderPrimitive.Root
        aria-label={label}
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={1}
        value={[set ? value : min]}
        onValueChange={(v) => onChange(v[0])}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className={cn("absolute h-full", set ? "bg-primary" : "bg-transparent")} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block size-4 rounded-full border-2 bg-card shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            set ? "border-primary" : "border-muted-foreground/40",
          )}
        />
      </SliderPrimitive.Root>
      <button
        type="button"
        onClick={() => onChange(undefined)}
        title="Tozalash"
        className={cn("w-8 shrink-0 rounded-md text-center text-sm tabular-nums font-semibold", set ? "text-primary" : "text-muted-foreground")}
      >
        {set ? value : "–"}
      </button>
    </div>
  );
}
