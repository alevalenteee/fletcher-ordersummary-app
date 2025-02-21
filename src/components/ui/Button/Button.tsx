import React from 'react';
import { cn } from '../../../lib/utils';
import { ButtonProps } from './types';
import { buttonVariants } from './variants';

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size }),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}