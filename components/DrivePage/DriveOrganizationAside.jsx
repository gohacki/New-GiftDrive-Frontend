// components/DrivePage/DriveOrganizationAside.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import Image from 'next/image';
// ShareButton is now handled at the DrivePage level, so not needed here directly
// unless you want a separate share button specifically for the organization.

const DriveOrganizationAside = ({
    orgId,
    organizationName,
    organizationPhoto,
    donorsCount,
}) => {
    return (
        <div className="border-2 border-ggreen shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-ggreen mb-4">Organization</h2>
            {orgId && organizationName ? (
                <Link href={`/visible/organization/${orgId}`} className="text-ggreen hover:underline block mb-2">
                    <strong>{organizationName}</strong>
                </Link>
            ) : (
                <p className="text-gray-500 mb-2">Organization details unavailable.</p>
            )}

            {organizationPhoto && (
                <div className="my-3 flex justify-center">
                    <Image src={organizationPhoto} alt={organizationName || 'Organization logo'} width={100} height={100} className="rounded-md object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
            )}
            {donorsCount != null && (
                <p className="text-gray-700 mb-4 text-sm">
                    Supported by {donorsCount} donor(s)
                </p>
            )}
            {/* ShareButton for the drive itself is at the top level of DrivePage.
          If you want a button to share the *organization* specifically, add it here.
          Example: <ShareButton pageType="organization" pageData={{ id: orgId, name: organizationName, photo: organizationPhoto }} pageUrl={`/visible/organization/${orgId}`} />
      */}
        </div>
    );
};

DriveOrganizationAside.propTypes = {
    orgId: PropTypes.number,
    organizationName: PropTypes.string,
    organizationPhoto: PropTypes.string,
    donorsCount: PropTypes.number,
};

export default DriveOrganizationAside;