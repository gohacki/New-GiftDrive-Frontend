// src/pages/organization/[id].js

import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import React from 'react';
import PropTypes from 'prop-types';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs'; // Ensure this component exists
import Image from 'next/image';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const OrganizationPage = ({ organization }) => {
  const router = useRouter();

  if (!organization) {
    return (
      <>
        <Navbar transparent />
        <div className="min-h-screen flex items-center justify-center bg-gray-00">
          <p className="text-gray-500 text-lg">Organization not found.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar transparent />
      <div className="min-h-screen bg-gray-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: '/visible/orglist', label: 'Organizations' },
              { href: `/organization/${organization.org_id}`, label: organization.name },
            ]}
          />

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            aria-label="Go back to previous page"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Organization Card */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-10">
            <div className="flex flex-col md:flex-row">
              {/* Organization Image */}
              {organization.photo && (
                <div className="md:w-1/3 flex justify-center items-center p-6">
                  <Image
                    src={organization.photo || '/img/default-org.png'}
                    alt={organization.name}
                    width={256} // 64 * 4
                    height={256}
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
              {/* Organization Info */}
              <div className="md:w-2/3 p-6 flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  {organization.name}
                </h2>
                <p className="text-gray-600 mb-4">{organization.description}</p>
                {/* Optional: Add more organization details here */}
                {organization.location && (
                  <p className="text-gray-600 mb-2">
                    <strong>Location:</strong> {organization.location}
                  </p>
                )}
                {organization.founded && (
                  <p className="text-gray-600">
                    <strong>Founded:</strong> {new Date(organization.founded).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Drives Section */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">Drives</h3>
            {organization.drives && organization.drives.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {organization.drives.map((drive) => (
                  <Link
                    key={drive.drive_id}
                    href={`/visible/drive/${drive.drive_id}`}
                    className="block bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {drive.photo && (
                      <div className="relative w-full h-48">
                        <Image
                          src={drive.photo || '/img/default-drive.png'}
                          alt={drive.name}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-t-lg"
                        />
                      </div>
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
    </>
  );
};

// PropTypes validation for the OrganizationPage component
OrganizationPage.propTypes = {
  organization: PropTypes.shape({
    org_id: PropTypes.number.isRequired,
    photo: PropTypes.string,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    location: PropTypes.string, // Optional: Add if available
    founded: PropTypes.string, // Optional: Add if available
    drives: PropTypes.arrayOf(
      PropTypes.shape({
        drive_id: PropTypes.number.isRequired,
        photo: PropTypes.string,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
      })
    ),
  }).isRequired,
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