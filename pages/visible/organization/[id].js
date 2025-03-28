// src/pages/organization/[id].js

import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import React from 'react';
import PropTypes from 'prop-types';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs';
import Image from 'next/image';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const OrganizationPage = ({ organization }) => {
  const router = useRouter();

  if (!organization) {
    return (
      <>
        {/* Use non-transparent Navbar for consistency */}
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-secondary_green text-gray-800 relative">
          <p className="text-gray-600 text-lg">Organization not found.</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      {/* Use non-transparent Navbar to match the drive page */}
      <Navbar />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: '/visible/orglist', label: 'Organizations' },
              {
                href: `/organization/${organization.org_id}`,
                label: organization.name,
              },
            ]}
          />

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center mb-6 px-4 py-2 bg-ggreen text-white rounded-md hover:bg-ggreen-dark transition-colors focus:outline-none focus:ring-2 focus:ring-ggreen"
            aria-label="Go back to previous page"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>

          {/* Organization Heading */}
          <h1 className="text-3xl font-semibold text-ggreen mb-4">
            {organization.name}
          </h1>

          {/* Organization Info Card */}
          <div className="bg-white shadow rounded-lg p-6 mb-10 flex flex-col md:flex-row">
            {/* Organization Image */}
            {organization.photo && (
              <div className="md:w-1/3 flex justify-center items-center mb-6 md:mb-0 md:mr-6">
                <Image
                  src={organization.photo || '/img/default-org.png'}
                  alt={organization.name}
                  width={256}
                  height={256}
                  className="object-cover rounded-lg"
                />
              </div>
            )}

            {/* Organization Details */}
            <div className="md:w-2/3">
              <p className="text-gray-600 mb-4">{organization.description}</p>
              {organization.location && (
                <p className="text-gray-600 mb-2">
                  <strong>Location:</strong> {organization.location}
                </p>
              )}
              {organization.founded && (
                <p className="text-gray-600">
                  <strong>Founded:</strong>{' '}
                  {new Date(organization.founded).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Drives Section */}
          <div>
            <h2 className="text-2xl font-semibold text-ggreen mb-4">
              Drives from {organization.name}
            </h2>
            {organization.drives && organization.drives.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {organization.drives.map((drive) => (
                  <Link
                    key={drive.drive_id}
                    href={`/visible/drive/${drive.drive_id}`}
                    className="border border-gray-200 bg-white p-4 rounded-lg shadow-sm hover:shadow-lg transition-shadow flex flex-col"
                  >
                      {/* Drive Image */}
                      {drive.photo && (
                        <div className="relative w-full h-48 mb-4">
                          <Image
                            src={drive.photo || '/img/default-drive.png'}
                            alt={drive.name}
                            layout="fill"
                            objectFit="cover"
                            className="rounded-md"
                          />
                        </div>
                      )}
                      {/* Drive Info */}
                      <h3 className="text-lg font-medium text-ggreen mb-2">
                        {drive.name}
                      </h3>
                      <p className="text-gray-600 text-sm">{drive.description}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                No drives available for this organization.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

OrganizationPage.propTypes = {
  organization: PropTypes.shape({
    org_id: PropTypes.number.isRequired,
    photo: PropTypes.string,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    location: PropTypes.string,
    founded: PropTypes.string,
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
