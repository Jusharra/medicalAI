import { forwardRef, InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, helperText, fullWidth = true, icon, ...props }, ref) => {
    return (
      <div className={twMerge('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-luxury-800 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={twMerge(
              'block rounded-xl border border-gray-200 bg-white text-luxury-800 placeholder-gray-400 shadow-sm transition-colors duration-200',
              'min-h-[48px] w-full text-base leading-normal touch-manipulation',
              'focus:border-luxury-500 focus:ring-2 focus:ring-luxury-500/20 focus:outline-none',
              'disabled:bg-gray-50 disabled:text-gray-500',
              'sm:text-sm sm:leading-5',
              icon && 'pl-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          />
        </div>
        {(error || helperText) && (
          <p className={twMerge(
            'text-sm mt-1.5',
            error ? 'text-red-600' : 'text-gray-500'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;