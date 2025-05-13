// components/DrivePage/SupportedChildrenSection.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
// If you create a specific ChildCardForDrivePage, import it here.
// For now, direct rendering.

const SupportedChildrenSection = ({ children, driveName, onOpenChildModal }) => {
    if (!children || children.length === 0) {
        return null; // Or a message
    }

    return (
        <section>
            <h2 className="text-2xl font-semibold text-ggreen mb-4">
                Children Supported by {driveName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {children.map((child) => (
                    <div
                        key={child.child_id}
                        onClick={() => onOpenChildModal(child.child_id)}
                        className="cursor-pointer block border-2 border-ggreen bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        {child.child_photo && (
                            <div className="flex justify-center mt-4 h-24 relative">
                                <Image src={child.child_photo || '/img/default-child.png'} alt={child.child_name} fill style={{ objectFit: "contain" }} className="rounded-full" sizes="96px" onError={(e) => e.currentTarget.src = '/img/default-child.png'} />
                            </div>
                        )}
                        <div className="p-4 text-center">
                            <h3 className="text-lg font-semibold text-ggreen mb-2">
                                {child.child_name}
                            </h3>
                            <p className="text-xs text-gray-500">{child.items_needed_count || 0} items needed</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

SupportedChildrenSection.propTypes = {
    children: PropTypes.array.isRequired,
    driveName: PropTypes.string.isRequired,
    onOpenChildModal: PropTypes.func.isRequired,
};

export default SupportedChildrenSection;