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
                return 'bg-ggreen text-white hover:bg-teal-700 focus:ring-ggreen';
            case 'danger':
                return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
            case 'secondary':
            default:
                return 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400 font-medium';
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
                className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all border border-slate-200" /* Added border */
                onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal
            >
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
                            <h3 id="confirm-action-modal-title" className="text-lg font-semibold text-slate-800"> {/* Updated title color */}
                                {title || `Action Required for "${itemName || 'Item'}"`}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100" /* Updated close button */
                            aria-label="Close modal"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="text-sm text-slate-600 mb-6 whitespace-pre-line"> {/* Updated message color */}
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
                            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-md shadow-sm bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 font-medium" /* Updated cancel button */
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