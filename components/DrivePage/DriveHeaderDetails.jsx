// components/DrivePage/DriveHeaderDetails.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image'; // Assuming you might want the main drive image here eventually

const DriveHeaderDetails = ({
    name,
    description,
    photo, // Main drive photo
    totalNeeded,
    orgCity,
    orgState,
    totalPurchased,
    progressPercentage,
}) => {
    const totalRemaining = Math.max(0, totalNeeded - totalPurchased);

    return (
        <>
            {photo && (
                <div className="relative w-full h-64 sm:h-80 md:h-96 mb-6 rounded-lg overflow-hidden shadow-lg">
                    <Image
                        src={photo}
                        alt={name || 'Drive image'}
                        fill
                        style={{ objectFit: "cover" }}
                        priority
                        onError={(e) => e.currentTarget.style.display = 'none'} // Hide if image fails
                    />
                </div>
            )}
            <div className="mb-6">
                <h1 className="text-3xl font-semibold text-ggreen mb-2">{name}</h1>
                <p className="text-gray-700 mb-4">{description}</p>
                <div className="text-gray-600 flex flex-wrap gap-x-4 gap-y-1 items-center mb-4">
                    <p className="font-medium">{totalNeeded} Item(s) Needed</p>
                    {orgCity && orgState && <p className="font-medium">{orgCity}, {orgState}</p>}
                </div>
            </div>
            {/* Progress Bar Section */}
            <div className="border-2 border-ggreen shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Drive Progress</h2>
                <div className="bg-gray-200 w-full h-4 rounded-full mb-2 overflow-hidden">
                    <div className="bg-ggreen h-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p className="text-sm text-gray-700 mb-1">Donated: <strong>{totalPurchased}</strong> of {totalNeeded}</p>
                <p className="text-sm text-gray-700">Remaining: <strong>{totalRemaining}</strong></p>
            </div>
        </>
    );
};

DriveHeaderDetails.propTypes = {
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    totalNeeded: PropTypes.number.isRequired,
    orgCity: PropTypes.string,
    orgState: PropTypes.string,
    totalPurchased: PropTypes.number.isRequired,
    progressPercentage: PropTypes.number.isRequired,
};

export default DriveHeaderDetails;