// components/Cards/OrganizationCard.js

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';

const OrganizationCard = ({ org }) => {
  return (
    <Link href={`/visible/organization/${org.org_id}`} className="block transform hover:scale-105 transition-transform duration-300 cursor-pointer">
      <div className="bg-white rounded-lg overflow-hidden shadow-md h-full">
        {/* Organization Image */}
        <div className="relative w-full h-48">
          <Image
            src={org.photo}
            alt={org.name}
            layout="fill"
            objectFit="cover"
            className="rounded-t-lg"
            priority={false} // Set to true if images are above the fold
          />
        </div>
        {/* Organization Details */}
        <div className="p-4">
          <h4 className="text-xl font-semibold text-blueGray-800">{org.name}</h4>
          <p className="text-blueGray-600 mt-2 line-clamp-3">{org.description}</p>
        </div>
      </div>
    </Link>
  );
};

// Define PropTypes for the component
OrganizationCard.propTypes = {
  org: PropTypes.shape({
    org_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, // 'org_id' can be string or number
    photo: PropTypes.string.isRequired,   // 'photo' must be a string URL
    name: PropTypes.string.isRequired,    // 'name' must be a string
    description: PropTypes.string,        // 'description' is optional
  }).isRequired, // 'org' prop is required
};

export default OrganizationCard;