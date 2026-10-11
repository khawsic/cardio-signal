import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2 rounded-lg gap-2',
    lg: 'text-sm px-5 py-2.5 rounded-lg gap-2.5 font-semibold',
  };

  const variantClasses = {
    primary:
      'bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white shadow-sm hover:shadow transition-colors',
    navy:
      'bg-[#0A192F] hover:bg-[#112240] active:bg-[#071324] text-white shadow-sm transition-colors',
    secondary:
      'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 transition-colors',
    outline:
      'border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors',
    ghost:
      'hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
