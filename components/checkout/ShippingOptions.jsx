// components/ShippingOptions.jsx
import React from 'react'; // Import React
import PropTypes from 'prop-types'; // Import PropTypes
import { formatCurrency } from '@/lib/utils';

export default function ShippingOptions({ stores }) {
    let hasOptions = false;
    let content = [];

    if (!stores || stores.length === 0) {
        content.push(<p key="no-stores" className="text-gray-500 italic text-center py-3">Enter shipping address to see options.</p>);
    } else {
        stores.forEach((store, storeIndex) => {
            const shippingMethods = store.offer?.shippingMethods;
            if (shippingMethods && shippingMethods.length > 0) {
                hasOptions = true;
                content.push(<h4 key={`store-hdr-${storeIndex}`} className="font-semibold text-gray-800 mt-2 first:mt-0">Options for {store.store || `Store ${storeIndex + 1}`}:</h4>);
                shippingMethods.forEach((method, methodIndex) => {
                    const price = formatCurrency(method.price?.value, method.price?.currency);
                    // NOTE: Currently display-only. Add radio inputs if selection needed before payment.
                    // const inputId = `shipping-${storeIndex}-${methodIndex}`;
                    content.push(
                        <div key={method.id || methodIndex} className="text-sm text-gray-600 pl-2 py-1">
                            {/* <input type="radio" name={`shippingOption-${storeIndex}`} value={method.id} id={inputId} defaultChecked={methodIndex === 0}/> */}
                            {/* <label htmlFor={inputId}> */}
                            {method.label} ({price})
                            {/* </label> */}
                        </div>
                    );
                });
            }
        });

        if (!hasOptions) {
            content.push(<p key="no-options" className="text-gray-500 italic text-center py-3">No shipping options currently available for this address/cart.</p>);
        }
    }

    // Only render the fieldset if there are stores to potentially show options for
    if (!stores || stores.length === 0) return null;

    return (
        <fieldset className="border p-4 rounded-md shadow space-y-2">
            <legend className="text-lg font-semibold px-2">4b. Shipping Options</legend>
            {content}
        </fieldset>
    );
}
// Add PropTypes validation
ShippingOptions.propTypes = {
    stores: PropTypes.arrayOf(PropTypes.shape({
        store: PropTypes.string, // Name of the store/marketplace
        offer: PropTypes.shape({
            shippingMethods: PropTypes.arrayOf(PropTypes.shape({
                id: PropTypes.string, // Or number
                label: PropTypes.string,
                price: PropTypes.shape({
                    value: PropTypes.number,
                    currency: PropTypes.string,
                }),
            })),
            // Add other offer properties if accessed
        }),
        // Add other store properties if accessed
    })),
};

ShippingOptions.defaultProps = {
    stores: [], // Default to an empty array
};