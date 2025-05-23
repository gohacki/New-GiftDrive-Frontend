// File: components/Modals/ConfirmActionModal.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ConfirmActionModal = ({
    isOpen,
    onClose,
    title,
    message,
    options, // Array of { label: string, action: function, style?: 'primary' | 'secondary' | 'danger' }
    itemName, // Optional: for more specific messaging
}) => {
    if (!isOpen) return null;

    const getButtonStyle = (style) => {
        switch (style) {
            case 'primary':
                return 'bg-ggreen text-white hover:bg-teal-700';
            case 'danger':
                return 'bg-red-600 text-white hover:bg-red-700';
            case 'secondary':
            default:
                return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={onClose} // Close if overlay is clicked
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-action-modal-title"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all"
                onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal
            >
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
                            <h3 id="confirm-action-modal-title" className="text-lg font-semibold text-gray-800">
                                {title || `Action Required for "${itemName || 'Item'}"`}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                            aria-label="Close modal"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="text-sm text-gray-600 mb-6 whitespace-pre-line">
                        {message}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
                        {options && options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    option.action();
                                    onClose(); // Automatically close modal after action
                                }}
                                className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonStyle(option.style || 'secondary')}`}
                            >
                                {option.label}
                            </button>
                        ))}
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-md shadow-sm bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

ConfirmActionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    message: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            action: PropTypes.func.isRequired,
            style: PropTypes.oneOf(['primary', 'secondary', 'danger']),
        })
    ).isRequired,
    itemName: PropTypes.string,
};

export default ConfirmActionModal;