import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import clsx from "clsx";

type CommandButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "ghost";

type CommandButtonSize = "sm" | "md" | "lg";

type CommandButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: CommandButtonVariant;
  size?: CommandButtonSize;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  children: ReactNode;
};

const variantClasses: Record<CommandButtonVariant, string> = {
  primary:
    "bg-white text-ledger-bg hover:scale-[1.01] hover:bg-white/90 shadow-glow",
  secondary:
    "border border-white/10 bg-white/[0.04] text-ledger-muted hover:bg-white/[0.07] hover:text-white",
  success:
    "border border-ledger-green/20 bg-ledger-green/10 text-ledger-green hover:bg-ledger-green/15",
  danger:
    "border border-ledger-red/20 bg-ledger-red/10 text-ledger-red hover:bg-ledger-red/15",
  ghost:
    "text-ledger-muted hover:bg-white/[0.05] hover:text-white",
};

const sizeClasses: Record<CommandButtonSize, string> = {
  sm: "rounded-xl px-3 py-2 text-xs",
  md: "rounded-2xl px-4 py-3 text-sm",
  lg: "rounded-2xl px-5 py-3.5 text-sm",
};

export const CommandButton = forwardRef<HTMLButtonElement, CommandButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-60",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : LeftIcon ? (
          <LeftIcon className="h-4 w-4" />
        ) : null}

        <span>{children}</span>

        {!loading && RightIcon ? <RightIcon className="h-4 w-4" /> : null}
      </button>
    );
  },
);

CommandButton.displayName = "CommandButton";