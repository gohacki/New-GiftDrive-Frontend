// components/StatusDisplay.jsx
import React from 'react';
import PropTypes from 'prop-types'; // Import PropTypes


export default function StatusDisplay({ isLoading, error }) {
    if (!isLoading && !error) return null;

    return (
        <div className="my-4">
            {isLoading && (
                <div className="p-3 text-center text-blue-800 bg-blue-100 border border-blue-300 rounded-md">
                    Loading...
                </div>
            )}
            {error && (
                <div className="p-3 text-red-800 bg-red-100 border border-red-400 rounded-md break-words">
                    <span className="font-semibold">Error:</span> {error}
                </div>
            )}
        </div>
    );
}
// Add PropTypes validation
StatusDisplay.propTypes = {
    isLoading: PropTypes.bool,
    error: PropTypes.string, // Assuming error is a string message
};

StatusDisplay.defaultProps = {
    isLoading: false,
    error: null,
};