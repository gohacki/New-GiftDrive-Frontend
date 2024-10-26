// components/Cards/OrganizationCard.js

import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types'; // Import PropTypes

const OrganizationCard = ({ org }) => {
  return (
    <Link href={`/visible/organization/${org.org_id}`} className="block transform hover:scale-105 transition-transform duration-300">
        <div className="bg-white rounded-lg overflow-hidden shadow-md">
          {/* Organization Image */}
          <img
            src={org.photo}
            alt={org.name}
            className="w-full h-40 object-cover"
          />
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
    org_id: PropTypes.number.isRequired,  // 'org_id' must be a string
    photo: PropTypes.string.isRequired,   // 'photo' must be a string URL
    name: PropTypes.string.isRequired,    // 'name' must be a string
    description: PropTypes.string,        // 'description' is optional
  }).isRequired, // 'org' prop is required
};

export default OrganizationCard;