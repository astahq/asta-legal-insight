import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-elevation-1 hover:bg-primary/92 hover:shadow-elevation-2 focus-visible:ring-primary/80",
        primaryGlow:
          "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-primary-glow ring-2 ring-primary-foreground/20 ring-offset-2 ring-offset-background hover:from-primary hover:to-primary/95 hover:shadow-primary-glow-hover focus-visible:ring-primary/60 focus-visible:ring-offset-2",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elevation-1 hover:bg-destructive/90 hover:shadow-elevation-2 focus-visible:ring-destructive/80",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-border hover:shadow-elevation-1 focus-visible:ring-ring",
        secondary:
          "bg-secondary text-secondary-foreground shadow-elevation-1 hover:bg-secondary/90 hover:shadow-elevation-2 focus-visible:ring-muted-foreground/30",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/90 focus-visible:ring-muted-foreground/20",
        link:
          "text-primary underline-offset-4 hover:underline focus-visible:ring-primary/50 active:opacity-90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
