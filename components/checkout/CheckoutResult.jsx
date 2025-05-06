// components/Cards/CheckoutResult.jsx
import React from 'react';
import PropTypes from 'prop-types'; // Import PropTypes

export default function CheckoutResult({ result }) {
    if (!result) return null;

    // Determine if it's an error or success based on structure (adjust if needed)
    // Assuming success might have message/dbOrderId, error might have error prop
    const isSuccess = result && (result.message || result.dbOrderId);
    const isFailure = result && result.error;

    return (
        <div className={`p-4 rounded-md border ${isSuccess ? 'bg-green-50 border-green-300 text-green-800' : (isFailure ? 'bg-red-50 border-red-300 text-red-800' : 'bg-gray-50 border-gray-300 text-gray-800')}`}>
            <h3 className="text-lg font-semibold mb-2">
                {isSuccess ? 'Order Submitted!' : (isFailure ? 'Checkout Issue' : 'Checkout Status')}
            </h3>
            {/* Display messages based on type */}
            {isSuccess && result.message && <p>{result.message}</p>}
            {isSuccess && result.dbOrderId && <p className="text-sm mt-1">Order Confirmation ID: {result.dbOrderId}</p>}
            {isSuccess && <p className="text-sm mt-2">You should receive confirmation emails shortly.</p>}

            {isFailure && result.error && <p>{result.error}</p>}
            {isFailure && result.details && <p className="text-sm mt-1">{result.details}</p>}

            {/* Fallback for unexpected result structure */}
            {!isSuccess && !isFailure && result.message && <p>{result.message}</p>}
            {!isSuccess && !isFailure && result.details && <p className="text-sm mt-1">{result.details}</p>}
        </div>
    );
}

// Add PropTypes validation
CheckoutResult.propTypes = {
    result: PropTypes.shape({
        message: PropTypes.string,
        details: PropTypes.string,
        dbOrderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        error: PropTypes.string,
        // Add any other potential properties of the result object
    }),
};