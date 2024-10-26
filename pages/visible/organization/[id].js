// src/pages/organization/[id].js

import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import React from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const OrganizationPage = ({ organization }) => {
  const router = useRouter();

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-lg">Organization not found.</p>
      </div>
    );
  }

  return (
    <>
    <Navbar transparent />
    <div className="min-h-screen bg-gray-400 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Back
        </button>

        {/* Organization Card */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-10">
          <div className="flex flex-col md:flex-row">
            {/* Organization Image */}
            <div className="md:w-1/3">
              <img
                src={organization.photo || '/img/default-org.png'}
                alt={organization.name}
                className="w-full h-48 object-cover"
              />
            </div>
            {/* Organization Info */}
            <div className="p-6 md:w-2/3">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {organization.name}
              </h2>
              <p className="text-gray-600">{organization.description}</p>
            </div>
          </div>
        </div>

        {/* Drives Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Drives</h3>
          {organization.drives && organization.drives.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {organization.drives.map((drive) => (
                <Link key={drive.drive_id} href={`/visible/drive/${drive.drive_id}`} className="block bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {drive.photo && (
                      <img
                        src={drive.photo || '/img/default-drive.png'}
                        alt={drive.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        {drive.name}
                      </h4>
                      <p className="text-gray-600">{drive.description}</p>
                    </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No drives available for this organization.</p>
          )}
        </div>
      </div>
    </div>
    <Footer />
    </ >
  );
};

// PropTypes validation for the OrganizationPage component
OrganizationPage.propTypes = {
  organization: PropTypes.shape({
    org_id: PropTypes.number, // Changed from PropTypes.int to PropTypes.number
    photo: PropTypes.string,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    drives: PropTypes.arrayOf(
      PropTypes.shape({
        drive_id: PropTypes.number.isRequired,
        photo: PropTypes.string,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
      })
    ),
  }),
};

// Fetch organization data on the server side
export async function getServerSideProps(context) {
  const { id } = context.params;

  try {
    const response = await axios.get(`${apiUrl}/api/organizations/${id}`);
    const organization = response.data;

    return {
      props: {
        organization,
      },
    };
  } catch (error) {
    console.error('Error fetching organization data:', error);
    return {
      props: {
        organization: null,
      },
    };
  }
}

export default OrganizationPage;