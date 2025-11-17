"use client";

import { useState } from "react";
import { cn } from "@/lib/client/cn";
import { StarGlyph } from "@/components/chrome/star-meter";

type StarSelectorProps = {
  value: number;
  onChange?: (score: number) => void;
  max?: number;
  disabled?: boolean;
  size?: number;
  className?: string;
};

export function StarSelector({
  value,
  onChange,
  max = 5,
  disabled = false,
  size = 36,
  className,
}: StarSelectorProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {Array.from({ length: max }, (_, index) => {
        const rank = index + 1;
        const filled = displayValue >= rank;

        const starStyles = filled
          ? { color: "#f5c842", filter: "drop-shadow(0 0 12px rgba(245,200,66,0.65))" }
          : { color: "var(--outline-strong)" };

        return (
          <button
            key={rank}
            type="button"
            className={cn(
              "rounded-full p-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
              disabled ? "cursor-not-allowed opacity-50" : "hover:scale-110 active:scale-95",
            )}
            style={starStyles}
            onMouseEnter={() => !disabled && setHovered(rank)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => !disabled && setHovered(rank)}
            onBlur={() => setHovered(null)}
            onClick={() => !disabled && onChange?.(rank)}
            disabled={disabled}
            aria-label={`${rank}점`}
          >
            <StarGlyph size={size} />
          </button>
        );
      })}
    </div>
  );
}
