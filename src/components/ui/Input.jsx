import React from 'react';

export function Input({
    label,
    id,
    type = 'text',
    error,
    className = '',
    labelClassName = '',
    inputClassName = '',
    required = false,
    ...props
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={id} className={`text-sm font-semibold text-gray-700 ${labelClassName}`}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            {type === 'textarea' ? (
                <textarea
                    id={id}
                    className={`w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'
                        } bg-white px-4 py-2 text-gray-900 focus:border-[#8B0000] focus:outline-none focus:ring-1 focus:ring-[#8B0000] min-h-[100px] ${inputClassName}`}
                    {...props}
                />
            ) : type === 'select' ? (
                <select
                    id={id}
                    className={`w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'
                        } bg-white px-4 py-2 text-gray-900 focus:border-[#8B0000] focus:outline-none focus:ring-1 focus:ring-[#8B0000] ${inputClassName}`}
                    {...props}
                >
                    {props.children}
                </select>
            ) : (
                <input
                    id={id}
                    type={type}
                    className={`w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'
                        } bg-white px-4 py-2 text-gray-900 focus:border-[#8B0000] focus:outline-none focus:ring-1 focus:ring-[#8B0000] ${inputClassName}`}
                    {...props}
                />
            )}
            {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
    );
}
