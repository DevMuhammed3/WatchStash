"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent/90 text-canvas font-medium hover:bg-accent active:bg-accent-hover transition-colors",
  secondary:
    "border border-border text-secondary hover:border-border-hover hover:text-primary active:bg-surface transition-colors",
  ghost: "text-muted hover:text-primary hover:bg-surface/50 active:bg-surface transition-colors",
  danger:
    "bg-red-600/80 text-white font-medium hover:bg-red-600 active:bg-red-700 transition-colors",
};

const sizeStyles: Record<Size, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs",
  md: "rounded-xl px-4 py-2 text-sm",
  icon: "rounded-full p-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${variantStyles[variant]} ${sizeStyles[size]} inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}