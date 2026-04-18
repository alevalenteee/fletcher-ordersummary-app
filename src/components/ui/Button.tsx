import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const baseStyles = [
    'inline-flex items-center justify-center rounded-lg font-sans font-medium whitespace-nowrap',
    'transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out-soft',
    'active:scale-[0.98]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'disabled:opacity-40 disabled:pointer-events-none',
  ].join(' ');

  const variants = {
    default: 'bg-neutral-900 text-white shadow-btn-primary hover:bg-neutral-800 active:bg-black focus-visible:ring-neutral-900/25',
    outline: 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100 focus-visible:ring-neutral-900/15',
    danger: 'bg-red-600 text-white shadow-btn-primary hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500/30',
    ghost: 'text-neutral-600 bg-transparent hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 focus-visible:ring-neutral-900/15',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
