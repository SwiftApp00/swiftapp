import React from 'react';

export function Card({ children, className = '', hover = false, ...props }) {
    const hoverStyles = hover ? 'hover:shadow-lg transition-shadow duration-300' : '';
    return (
        <div 
            className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${hoverStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
