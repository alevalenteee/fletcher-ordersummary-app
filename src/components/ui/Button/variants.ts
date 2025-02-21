import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center rounded-md font-medium',
    'transition-all duration-200',
    'transform hover:-translate-y-0.5 active:translate-y-0',
    'active:scale-95',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none'
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-black text-white',
          'hover:bg-gray-800',
          'active:bg-gray-900',
          'focus:ring-gray-500'
        ].join(' '),
        outline: [
          'border border-gray-300 bg-white text-gray-700',
          'hover:bg-gray-50',
          'active:bg-gray-100',
          'focus:ring-gray-400'
        ].join(' '),
        danger: [
          'bg-red-600 text-white',
          'hover:bg-red-700',
          'active:bg-red-800',
          'focus:ring-red-500'
        ].join(' '),
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);