import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "normal" | "attack" | "neutral";
};

const styles = {
  primary:
    "border-slate-900 bg-slate-900 text-white enabled:hover:bg-blue-800",
  normal:
    "border-emerald-200 bg-emerald-50 text-emerald-800 enabled:hover:bg-emerald-100",
  attack:
    "border-rose-200 bg-rose-50 text-rose-800 enabled:hover:bg-rose-100",
  neutral:
    "border-slate-200 bg-white text-slate-700 enabled:hover:bg-slate-100",
};

export function ActionButton({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={type}
      className={[
        "inline-flex min-h-10 items-center justify-center gap-2",
        "rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm",
        "transition duration-200 enabled:cursor-pointer enabled:hover:shadow-md",
        "motion-safe:enabled:hover:-translate-y-0.5",
        "motion-safe:enabled:active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "motion-reduce:transition-none",
        styles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}