// File: components/checkout/CheckoutResult.jsx
import React from 'react';
import PropTypes from 'prop-types';

export default function CheckoutResult({ result }) {
    if (!result) return null;

    const isSuccess = !!result.message && !result.error; // Success if message and no explicit error

    return (
        <div className={`p-4 rounded-md border ${isSuccess ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
            <h3 className="text-lg font-semibold mb-2">
                {isSuccess ? 'Order Submitted!' : (result.error ? 'Checkout Issue' : 'Checkout Status')}
            </h3>

            {result.message && <p>{result.message}</p>}

            {isSuccess && result.dbOrderId && (
                <p className="text-sm mt-1">GiftDrive Order ID: <span className="font-mono">{result.dbOrderId}</span></p>
            )}
            {isSuccess && result.ryeOrderId && (
                <p className="text-sm mt-1">Rye Order Reference: <span className="font-mono">{result.ryeOrderId}</span></p>
            )}
            {isSuccess && (
                <p className="text-sm mt-2">You should receive confirmation emails shortly. You can also view your order in your account.</p>
            )}

            {result.error && <p className="font-medium">{result.error}</p>}
            {result.details && <p className="text-sm mt-1">{result.details}</p>}

            {!isSuccess && !result.error && result.details && (
                <p className="text-sm mt-1">{result.details}</p>
            )}
        </div>
    );
}

CheckoutResult.propTypes = {
    result: PropTypes.shape({
        message: PropTypes.string,
        details: PropTypes.string,
        dbOrderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        ryeOrderId: PropTypes.string,
        error: PropTypes.string,
    }),
};