import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'gold':
        return 'bg-gold hover:bg-gold-dark text-black font-semibold shadow-[0_4px_20px_rgba(212,175,55,0.25)] border border-gold/20';
      case 'secondary':
        return 'bg-white hover:bg-slate-100 text-black font-medium border border-slate-200';
      case 'glass':
        return 'glass hover:bg-white/10 text-white border border-white/10 hover:border-white/20';
      case 'danger':
        return 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/25';
      default: // primary deep blue
        return 'bg-deep-blue hover:bg-navy text-slate-100 border border-slate-700/50 shadow-md shadow-black/20';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs rounded-lg gap-1.5';
      case 'lg':
        return 'px-6 py-3.5 text-base rounded-xl gap-2.5';
      default: // md
        return 'px-4 py-2.5 text-sm rounded-lg gap-2';
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-display tracking-wide active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {!isLoading && children}
      {rightIcon && !isLoading && rightIcon}
    </button>
  );
};

export default Button;
