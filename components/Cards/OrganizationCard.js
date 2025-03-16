// components/Cards/OrganizationCard.js

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';

const OrganizationCard = ({ org }) => {
  return (
    <Link href={`/visible/organization/${org.org_id}`} className="block group">
      <div className="border border-ggreen rounded-lg shadow-md h-full transition-shadow duration-300 hover:shadow-lg bg-white">
        {/* Slightly inward image container */}
        <div className="relative mx-4 mt-4 h-40 overflow-hidden">
          {/* Organization Image with rounded bottom corners */}
          <Image
            src={org.photo}
            alt={org.name}
            fill
            className="object-cover rounded-b-lg"
            priority={false}
          />
          {/* Location pill in bottom-left corner (only if city & state exist) */}
          {org.city && org.state && (
            <div className="absolute bottom-2 left-2 bg-white/80 text-gray-800 px-3 py-1 rounded-full text-xs shadow">
              {org.city}, {org.state}
            </div>
          )}
        </div>

        {/* Text content and CTA */}
        <div className="p-4 flex flex-col justify-between h-full">
          <h4 className="text-xl font-semibold text-gray-800 mb-2">
            {org.name}
          </h4>
          <p className="text-gray-600 line-clamp-3 flex-grow">
            {org.description || 'No description available.'}
          </p>

          {/* Bottom row with placeholder "X to go!" and "View Drive" button */}
          <div className="mt-4 flex items-center justify-between">
            {/* Replace “57 to go!” with real data once available */}
            <span className="text-gray-700 font-medium">57 to go!</span>
            <span className="inline-block bg-ggreen text-white px-4 py-2 rounded-md text-sm font-semibold group-hover:bg-green-700 transition-colors">
              View Drive
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

OrganizationCard.propTypes = {
  org: PropTypes.shape({
    org_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    photo: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
  }).isRequired,
};

export default OrganizationCard;
