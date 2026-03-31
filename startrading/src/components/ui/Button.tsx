import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[#ADA3E6] text-white hover:bg-[#9B8FE0] shadow-lg",
    secondary: "bg-[#F3F0FF] text-[#ADA3E6] hover:bg-[#EBE5FF]",
    outline: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm",
    ghost: "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs rounded-full",
    md: "px-6 py-2.5 text-sm rounded-full",
    lg: "px-8 py-4 text-base rounded-full",
    icon: "w-10 h-10 rounded-full",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
