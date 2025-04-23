import { ButtonHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'luxury';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, fullWidth = false, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-98 touch-manipulation whitespace-nowrap';
    
    const variants = {
      primary: 'bg-luxury-500 text-white hover:bg-luxury-600 shadow-luxury hover:shadow-luxury-lg active:bg-luxury-700',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
      outline: 'border-2 border-luxury-500 text-luxury-500 hover:bg-luxury-50 active:bg-luxury-100',
      luxury: 'bg-gold-gradient text-navy-900 hover:opacity-90 shadow-luxury hover:shadow-luxury-lg transform hover:scale-102 transition-transform active:opacity-100',
    };

    const sizes = {
      xs: 'px-2 py-1 text-xs min-h-[28px]',
      sm: 'px-3 py-1.5 text-sm min-h-[36px]',
      md: 'px-4 py-2 text-base min-h-[44px]',
      lg: 'px-5 py-2.5 text-lg min-h-[52px]',
    };

    return (
      <button
        ref={ref}
        className={twMerge(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          isLoading && 'opacity-50 cursor-wait',
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;