import { cn } from "../lib/utils";
import type { JSX, ComponentChildren } from "preact";

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ComponentChildren;
}

export function Button({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
        "disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-zinc-100 text-zinc-900 hover:bg-zinc-200": variant === "default",
          "border border-zinc-700 bg-transparent hover:bg-zinc-800": variant === "outline",
          "hover:bg-zinc-800": variant === "ghost",
        },
        {
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4": size === "md",
          "h-12 px-6 text-lg": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
