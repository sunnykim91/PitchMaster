import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/20",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/30",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
        success: "bg-[hsl(var(--success))] text-[hsl(0_0%_10%)] shadow-sm hover:bg-[hsl(var(--success))]/90 hover:shadow-md hover:shadow-[hsl(var(--success))]/20",
        warning: "bg-[hsl(var(--warning))] text-[hsl(0_0%_10%)] shadow-sm hover:bg-[hsl(var(--warning))]/90 hover:shadow-md hover:shadow-[hsl(var(--warning))]/20",
        info: "bg-[hsl(var(--info))] text-white shadow-sm hover:bg-[hsl(var(--info))]/90 hover:shadow-md hover:shadow-[hsl(var(--info))]/20",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-12 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** true 면 자동으로 disabled + Loader2 스피너 prepend (asChild 시 무시) */
  loading?: boolean;
  /** loading 중 표시할 텍스트. 없으면 children 그대로 */
  loadingText?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // Slot 은 단일 child 만 허용 — loading 합성은 일반 button 일 때만 활성
    const showLoading = loading && !asChild;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || showLoading}
        aria-busy={showLoading || undefined}
        {...props}
      >
        {showLoading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
