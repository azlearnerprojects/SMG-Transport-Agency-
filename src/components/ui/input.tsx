import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:border-navy',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-500',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
