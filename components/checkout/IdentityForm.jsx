// components/IdentityForm.jsx
'use client';
import React, { useState, useEffect } from 'react'; // Import React
import PropTypes from 'prop-types'; // Import PropTypes

// Helper function to ensure optional fields are empty strings, not null
const sanitizeInitialData = (data = {}) => {
    const sanitized = { ...data };
    sanitized.phone = sanitized.phone ?? ''; // Use nullish coalescing
    sanitized.address2 = sanitized.address2 ?? '';
    // Add any other potentially null fields here if needed
    return sanitized;
};

export default function IdentityForm({ initialData = {}, onSubmit, onCancel, isLoading }) {
    // ***** MODIFICATION START ***** Use sanitized initial data
    const [formData, setFormData] = useState({
        // Define defaults
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address1: '',
        address2: '',
        city: '',
        provinceCode: '', // State/Province
        postalCode: '',
        countryCode: 'US',
        // Spread sanitized initial data over defaults
        ...sanitizeInitialData(initialData)
    });
    // ***** MODIFICATION END *****

    // Update state if initialData changes, ensuring sanitization
    useEffect(() => {
        // Check if initialData actually differs from current relevant parts of formData
        // to avoid unnecessary re-renders if possible (optional optimization)
        const sanitizedNewData = sanitizeInitialData(initialData);
        setFormData(prev => ({
            ...prev,
            ...sanitizedNewData
        }));
    }, [initialData]); // Dependency array is correct

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Trim whitespace from fields before submitting (optional but good practice)
        const trimmedData = Object.fromEntries(
            Object.entries(formData).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
        );
        onSubmit(trimmedData);
    };

    // Render part remains the same...
    return (
        <fieldset className="border p-4 rounded-md shadow space-y-4">
            <legend className="text-lg font-semibold px-2">4a. Shipping Information</legend>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name:</label>
                        <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name:</label>
                        <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                </div>

                {/* Email & Phone */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email:</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone <span className="text-xs">(Optional, E.164 format e.g. +14155551212):</span></label>
                    <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} autoComplete="tel" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                </div>

                {/* Address */}
                <div>
                    <label htmlFor="address1" className="block text-sm font-medium text-gray-700">Address 1:</label>
                    <input type="text" id="address1" name="address1" value={formData.address1} onChange={handleChange} required autoComplete="address-line1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                </div>
                <div>
                    <label htmlFor="address2" className="block text-sm font-medium text-gray-700">Address 2 <span className="text-xs">(Optional):</span></label>
                    {/* Value is now guaranteed to be string or undefined */}
                    <input type="text" id="address2" name="address2" value={formData.address2} onChange={handleChange} autoComplete="address-line2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                </div>

                {/* City & State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">City:</label>
                        <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} required autoComplete="address-level2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="provinceCode" className="block text-sm font-medium text-gray-700">State/Province Code:</label>
                        <input type="text" id="provinceCode" name="provinceCode" value={formData.provinceCode} onChange={handleChange} required maxLength="3" autoComplete="address-level1" placeholder="e.g., CA, NY, ON" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                </div>

                {/* Zip & Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">ZIP/Postal Code:</label>
                        <input type="text" id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} required autoComplete="postal-code" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">Country:</label>
                        <select id="countryCode" name="countryCode" value={formData.countryCode} onChange={handleChange} required autoComplete="country" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white">
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            {/* Add other countries as needed */}
                        </select>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium rounded-md shadow-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
                    >
                        {isLoading ? 'Submitting...' : 'Submit Address & View Shipping'}
                    </button>
                </div>
            </form>
        </fieldset>
    );
}

// Add PropTypes validation
IdentityForm.propTypes = {
    initialData: PropTypes.object, // Could be more specific if shape is known
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};

IdentityForm.defaultProps = {
    initialData: {},
    isLoading: false,
};