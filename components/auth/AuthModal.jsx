// components/auth/AuthModal.jsx
'use client';
import React from 'react';

// Simple Modal Component
export default function AuthModal({ isOpen, onClose, children }) {
    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black bg-opacity-60 z-40"
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Modal Content */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 sm:p-8 rounded-lg shadow-xl z-50 w-full max-w-md">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold leading-none"
                    aria-label="Close"
                >
                    ×
                </button>
                {children}
            </div>
        </>
    );
}