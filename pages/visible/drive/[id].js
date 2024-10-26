// src/pages/drive/[id].js

import axios from 'axios';
import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types'; // Import PropTypes
import { useRouter } from 'next/router';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const DrivePage = ({ drive }) => {
  const router = useRouter();

  if (!drive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-lg">Drive not found.</p>
      </div>
    );
  }

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gray-500 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Back
        </button>

        {/* Drive Header */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-10">
          {drive.photo && (
            <img
              src={drive.photo || '/img/default-drive.png'}
              alt={drive.name}
              className="w-full h-64 object-cover"
            />
          )}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{drive.name}</h1>
            <p className="text-gray-600">{drive.description}</p>
          </div>
        </div>

        {/* Children Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Children in {drive.name}
          </h2>
          {drive.children && drive.children.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {drive.children.map((child) => (
                <Link key={child.child_id} href={`/visible/child/${child.child_id}`} className="block bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {child.child_photo && (
                      <img
                        src={child.child_photo || '/img/default-child.png'}
                        alt={child.child_name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {child.child_name}
                      </h3>
                      {/* Add more child details here if necessary */}
                    </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No children available in this drive.</p>
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
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        child_id: PropTypes.string.isRequired,
        child_name: PropTypes.string.isRequired,
        child_photo: PropTypes.string,
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