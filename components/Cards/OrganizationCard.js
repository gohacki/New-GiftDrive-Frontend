// components/Cards/OrganizationCard.js

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';

const OrganizationCard = ({ org }) => {
  return (
    <Link href={`/visible/organization/${org.org_id}`} className="block group">
      <div className="border border-ggreen rounded-lg shadow-md 
                      h-full transition-shadow duration-300 hover:shadow-lg 
                      bg-white flex flex-col">
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

        <div className="flex flex-col flex-grow p-4">
  <h4 className="text-xl font-semibold text-gray-800 mb-2">
    {org.name}
  </h4>
  <p className="text-gray-600 line-clamp-3 flex-grow">
    {org.description || 'No description available.'}
  </p>
  
  {/* Button pinned at bottom */}
  <div className="mt-auto">
    <span className="inline-block bg-ggreen text-white px-4 py-2 
                    rounded-md text-sm font-semibold 
                    group-hover:bg-green-700 transition-colors">
      View Organization
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
