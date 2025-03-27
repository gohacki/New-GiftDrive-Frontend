import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';

import { ArrowRightIcon } from '@heroicons/react/24/solid';

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

  // Calculate how many are left to go and progress percent
  const remaining = Math.max(totalNeeded - totalPurchased, 0);
  const progressPercent = totalNeeded > 0 ? (totalPurchased / totalNeeded) * 100 : 0;

  return (
    <Link href={`/visible/drive/${drive_id}`} className="block group">
      <div className="border border-ggreen rounded-lg shadow-md h-full transition-shadow duration-300 hover:shadow-lg bg-white flex flex-col">
        {/* Inset Image Container with Location Overlay */}
        <div className="relative mx-4 mt-4 h-40 overflow-hidden">
          <Image
            src={photo || '/img/default-drive.png'}
            alt={name}
            fill
            className="object-cover rounded-lg"
          />
          {(org_city && org_state) && (
            <div className="absolute bottom-2 left-2 bg-white/80 text-gray-800 px-3 py-1 rounded-full text-xs shadow">
              {org_city}, {org_state}
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="flex flex-col flex-grow p-4">
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
          <div className="mt-auto">
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
