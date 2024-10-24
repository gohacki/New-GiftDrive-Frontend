// OrganizationCard.js

import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types'; // Import PropTypes

const OrganizationCard = ({ org }) => {
  return (
    <Link href={`/organization/${org.org_id}`}>
      <div className="w-full px-4 mr-auto ml-auto">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-700">
          <img
            src={org.photo} alt={org.name}
            className="w-full h-48 object-cover align-middle rounded-t-lg"
          />
          <blockquote className="relative p-8 mb-4">
            <svg
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 583 95"
              className="absolute left-0 w-full block h-95-px -top-94-px"
            >
              <polygon
                points="-30,95 583,95 583,65"
                className="text-blueGray-700 fill-current"
              ></polygon>
            </svg>
            <h4 className="text-xl font-bold text-white">
              {org.name}
            </h4>
            <p className="text-md font-light mt-2 text-white">
              {org.description}
            </p>
          </blockquote>
        </div>
      </div>
    </Link>
  );
};

// Define PropTypes for the component
OrganizationCard.propTypes = {
  org: PropTypes.shape({
    org_id: PropTypes.string.isRequired,  // 'org_id' must be a string
    photo: PropTypes.string.isRequired,   // 'photo' must be a string URL
    name: PropTypes.string.isRequired,    // 'name' must be a string
    description: PropTypes.string,        // 'description' is optional
  }).isRequired, // 'org' prop is required
};

export default OrganizationCard;