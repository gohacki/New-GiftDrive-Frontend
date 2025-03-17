// components/Cards/DriveListCard.js
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';

import { MapPinIcon, ArrowRightIcon } from '@heroicons/react/24/solid';



const DriveListCard = ({ drive }) => {
  const {
    drive_id,
    photo,
    name,
    description,
    org_city,
    org_state,
    totalNeeded = 0,
    totalPurchased = 0,
  } = drive;

  // Calculate how many are left to go
  const remaining = Math.max(totalNeeded - totalPurchased, 0);
  // Calculate progress percentage for the bar
  const progressPercent = totalNeeded > 0 ? (totalPurchased / totalNeeded) * 100 : 0;

  return (
    <Link href={`/visible/drive/${drive_id}`} className="block group">
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden hover:shadow-md transition-shadow duration-200">
        {/* Drive Image */}
        <div className="relative w-full h-36 sm:h-40 md:h-44">
          <Image
            src={photo || '/img/default-drive.png'}
            alt={name}
            fill
            className="object-cover"
          />
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Location Row */}
          <div className="flex items-center text-sm text-gray-500 mb-2">
            {/* Location icon */}
            <MapPinIcon className="w-4 h-4 mr-1" />
            <span>
              {org_city}, {org_state}
            </span>
          </div>

          {/* Drive Name */}
          <h4 className="text-lg font-semibold text-gray-800 mb-1">
            {name}
          </h4>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {description || 'No description available.'}
          </p>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
            <div
              className="h-full bg-ggreen transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* "X to go!" text */}
          <p className="text-sm text-gray-700 font-medium mb-3">
            {remaining} to go!
          </p>

          {/* "View Drive" Button */}
          <div className="flex">
            <div className="inline-flex items-center bg-ggreen text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors">
              View Drive
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

DriveListCard.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    photo: PropTypes.string,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    org_city: PropTypes.string,
    org_state: PropTypes.string,
    totalNeeded: PropTypes.number,
    totalPurchased: PropTypes.number,
  }).isRequired,
};

export default DriveListCard;
