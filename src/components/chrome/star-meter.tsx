import { cn } from "@/lib/client/cn";

const STAR_PATH =
  "M12 1.5l2.89 6.522 7.11.59-5.37 4.62 1.61 7.268L12 16.9l-6.24 3.6 1.61-7.268-5.37-4.62 7.11-.59z";

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 26,
} as const;

const gapMap = {
  sm: 2,
  md: 3,
  lg: 4,
} as const;

export type StarMeterProps = {
  value: number | null;
  max?: number;
  size?: keyof typeof sizeMap;
  className?: string;
  muted?: boolean;
};

export function StarMeter({
  value,
  max = 5,
  size = "md",
  className,
  muted = false,
}: StarMeterProps) {
  const safeValue =
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(Math.max(value, 0), max)
      : 0;
  const ratio = max > 0 ? safeValue / max : 0;
  const pixelSize = sizeMap[size];
  const gap = gapMap[size];
  const totalWidth = pixelSize * max + gap * (max - 1);

  return (
    <div
      className={cn("relative inline-block align-middle", className)}
      style={{ width: `${totalWidth}px`, height: `${pixelSize}px` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 flex opacity-70"
        style={{ gap: `${gap}px`, color: muted ? "var(--outline)" : "var(--outline-strong)" }}
      >
        {renderRow("base", max, pixelSize)}
      </div>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          width: `${ratio * 100}%`,
        }}
      >
        <div
          className="flex drop-shadow-lg"
          style={{ gap: `${gap}px`, color: "var(--rating-star, #fadb4a)" }}
        >
          {renderRow("fill", max, pixelSize)}
        </div>
      </div>
    </div>
  );
}

export function StarGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-hidden="true"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

function renderRow(prefix: string, count: number, size: number) {
  return Array.from({ length: count }, (_, index) => (
    <StarGlyph key={`${prefix}-${index}`} size={size} />
  ));
}
