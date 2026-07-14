import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary CTA per brand: gold background, navy text.
        primary: 'bg-gold text-navy hover:bg-gold-600 active:bg-gold-700 shadow-sm',
        // Warm-orange action CTA used on public marketing surfaces.
        cta: 'bg-orange text-white hover:bg-orange-600 active:bg-orange-700 shadow-sm',
        navy: 'bg-navy text-white hover:bg-navy-700 active:bg-navy-800',
        outline: 'border border-navy/30 text-navy bg-white hover:bg-navy/5',
        ghost: 'text-navy hover:bg-navy/5',
        subtle: 'bg-muted text-navy hover:bg-navy/10',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        link: 'text-navy underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
