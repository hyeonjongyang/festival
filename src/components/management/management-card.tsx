import type { CSSProperties, HTMLAttributes } from "react";

type CardElement =
  | "div"
  | "section"
  | "article"
  | "header"
  | "main"
  | "aside"
  | "footer";

type EyebrowElement = "p" | "span" | "div" | "h2" | "h3";

type ManagementCardProps = HTMLAttributes<HTMLElement> & {
  as?: CardElement;
  padding?: "md" | "sm" | "none";
  shadow?: "soft" | "none";
  style?: CSSProperties;
};

type ManagementEyebrowProps = HTMLAttributes<HTMLElement> & {
  as?: EyebrowElement;
};

const paddingClassMap: Record<NonNullable<ManagementCardProps["padding"]>, string> = {
  md: "px-6 py-7 sm:px-8 sm:py-9",
  sm: "px-4 py-5 sm:px-6 sm:py-6",
  none: "p-0",
};

function cn(...values: Array<string | null | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function ManagementCard({
  as: Component = "div",
  padding = "md",
  shadow = "soft",
  className,
  style,
  children,
  ...rest
}: ManagementCardProps) {
  const paddingClass = paddingClassMap[padding] ?? paddingClassMap.md;
  const mergedStyle =
    shadow === "soft"
      ? { ...style, boxShadow: "var(--theme-shadow-soft)" }
      : style;

  return (
    <Component
      className={cn(
        "rounded-3xl border border-border bg-surface text-foreground",
        paddingClass,
        className,
      )}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function ManagementEyebrow({
  as: Component = "p",
  className,
  children,
  ...rest
}: ManagementEyebrowProps) {
  return (
    <Component
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.35em] text-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
