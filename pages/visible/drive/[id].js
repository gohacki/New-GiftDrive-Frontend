// src/pages/drive/[id].js

import axios from 'axios';
import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import { FaArrowLeft } from 'react-icons/fa';
import Breadcrumbs from 'components/UI/Breadcrumbs.js'; // Optional: Create a Breadcrumbs component
import Image from 'next/image';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const DrivePage = ({ drive }) => {
  const router = useRouter();

  if (!drive) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">Drive not found.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: '/visible/orglist', label: 'Organizations' },
              { href: `/drive/${drive.id}`, label: drive.name },
            ]}
          />

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            aria-label="Go back to previous page"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>

          {/* Drive Header */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-10">
            <div className="flex flex-col md:flex-row">
              {/* Drive Image */}
              {drive.photo && (
                <div className="md:w-1/3 flex justify-center items-center p-4">
                  <Image
                    src={drive.photo || '/img/default-drive.png'}
                    alt={drive.name}
                    width={192} // 48 * 4 (Tailwind's default spacing scale)
                    height={192}
                    className="object-cover rounded-md"
                  />
                </div>
              )}
              {/* Drive Info */}
              <div className="md:w-2/3 p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  {drive.name}
                </h1>
                <p className="text-gray-600 mb-4">{drive.description}</p>
                {/* Optional: Add more drive details here */}
                {drive.location && (
                  <p className="text-gray-600">
                    <strong>Location:</strong> {drive.location}
                  </p>
                )}
                {drive.date && (
                  <p className="text-gray-600">
                    <strong>Date:</strong> {new Date(drive.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Children Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Children in {drive.name}
            </h2>
            {drive.children && drive.children.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {drive.children.map((child) => (
                  <Link
                    key={child.child_id}
                    href={`/visible/child/${child.child_id}`}
                    passHref
                    className="block bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                      {/* Child Image */}
                      {child.child_photo && (
                        <div className="flex justify-center mt-4">
                          <Image
                            src={child.child_photo || '/img/default-child.png'}
                            alt={child.child_name}
                            width={96} // 48 * 4 (Tailwind's default spacing scale)
                            height={96}
                            className="object-cover rounded-full"
                          />
                        </div>
                      )}
                      {/* Child Info */}
                      <div className="p-4 text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {child.child_name}
                        </h3>
                        {/* Optional: Add more child details here */}
                        {child.age && (
                          <p className="text-gray-600">
                            <strong>Age:</strong> {child.age}
                          </p>
                        )}
                        {child.gender && (
                          <p className="text-gray-600">
                            <strong>Gender:</strong> {child.gender}
                          </p>
                        )}
                      </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                No children available in this drive.
              </p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

// PropTypes validation for the DrivePage component
DrivePage.propTypes = {
  drive: PropTypes.shape({
    id: PropTypes.string.isRequired, // Assuming drive has an 'id' field
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    location: PropTypes.string, // Optional: Add if available
    date: PropTypes.string, // Optional: Add if available
    children: PropTypes.arrayOf(
      PropTypes.shape({
        child_id: PropTypes.string.isRequired,
        child_name: PropTypes.string.isRequired,
        child_photo: PropTypes.string,
        age: PropTypes.number, // Optional: Add if available
        gender: PropTypes.string, // Optional: Add if available
      })
    ),
  }),
};

// Fetch drive data on the server side
export async function getServerSideProps(context) {
  const { id } = context.params;

  try {
    const response = await axios.get(`${apiUrl}/api/drives/${id}`);
    const drive = response.data;

    return {
      props: {
        drive,
      },
    };
  } catch (error) {
    console.error('Error fetching drive data:', error);

    return {
      props: {
        drive: null,
      },
    };
  }
}

export default DrivePage;