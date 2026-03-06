import React from 'react';

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
        primary: 'bg-[#8B0000] text-white hover:bg-[#640A15] focus:ring-[#8B0000]',
        secondary: 'bg-white text-[#8B0000] border border-[#8B0000] hover:bg-gray-50 focus:ring-[#8B0000]',
        outline: 'bg-transparent text-[#8B0000] border-2 border-[#8B0000] hover:bg-red-50 focus:ring-[#8B0000]',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
