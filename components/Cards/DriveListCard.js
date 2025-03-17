import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';

const DriveListCard = ({ drive }) => {
  return (
    <Link href={`/visible/drive/${drive.drive_id}`} className="block group">
      <div className="border border-ggreen rounded-lg shadow-md h-full transition-shadow duration-300 hover:shadow-lg bg-white flex flex-col">
        {/* Image section */}
        <div className="relative mx-4 mt-4 h-40 overflow-hidden">
          <Image
            src={drive.photo || '/img/default-drive.png'}
            alt={drive.name}
            fill
            className="object-cover rounded-b-lg"
            priority={false}
          />
        </div>
        {/* Drive information */}
        <div className="flex flex-col flex-grow p-4">
          <h4 className="text-xl font-semibold text-gray-800 mb-2">{drive.name}</h4>
          <p className="text-gray-600 line-clamp-3 flex-grow">
            {drive.description || 'No description available.'}
          </p>
          <div className="mt-auto">
            <span className="inline-block bg-ggreen text-white px-4 py-2 rounded-md text-sm font-semibold group-hover:bg-green-700 transition-colors">
              View Drive
            </span>
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
  }).isRequired,
};

export default DriveListCard;
