// File: pages/visible/organization/[id].js
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import React from 'react';
import PropTypes from 'prop-types';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs';
import Image from 'next/image';
import ShareButton from '@/components/Share/ShareButton'; // Import ShareButton
import { FaArrowLeft } from 'react-icons/fa'; // For back button consistency

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const OrganizationPage = ({ organization, error }) => {
  const router = useRouter();
  const [pageUrl, setPageUrl] = React.useState(''); // For ShareButton

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, [router.asPath]);


  if (error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex flex-col items-center justify-center bg-secondary_green text-gray-800 relative px-4 text-center">
          <p className="text-red-600 text-lg font-semibold">{error}</p>
          <Link href="/visible/orglist" className="mt-4 px-4 py-2 bg-ggreen text-white rounded hover:bg-teal-700">
            Browse Other Organizations
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  if (router.isFallback || !organization) { // Added router.isFallback for completeness
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-secondary_green text-gray-800 relative">
          <p className="text-gray-600 text-lg">Loading organization details...</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-20 pb-16"> {/* Adjusted pt */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: '/visible/orglist', label: 'Organizations' },
              {
                href: `/visible/organization/${organization.org_id}`,
                label: organization.name,
              },
            ]}
          />
          <div className="flex justify-between items-center my-6">
            <button
              onClick={() => router.back()}
              className="flex items-center px-4 py-2 bg-ggreen text-white rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ggreen"
              aria-label="Go back to previous page"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            {pageUrl && organization && (
              <ShareButton
                pageType="organization"
                pageData={organization} // Pass the organization object
                pageUrl={pageUrl}
              />
            )}
          </div>


          <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 mb-10">
            <div className="flex flex-col md:flex-row items-center md:items-start">
              {organization.photo && (
                <div className="flex-shrink-0 md:w-1/3 mb-6 md:mb-0 md:mr-8 flex justify-center">
                  <Image
                    src={organization.photo || '/img/default-org.png'}
                    alt={organization.name}
                    width={256}
                    height={256}
                    className="object-contain rounded-lg shadow-md" // Changed object-cover to object-contain
                    priority
                  />
                </div>
              )}
              <div className="md:w-2/3 text-center md:text-left">
                <h1 className="text-3xl lg:text-4xl font-semibold text-ggreen mb-3">
                  {organization.name}
                </h1>
                <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                  {organization.description || "No description available."}
                </p>
                {(organization.address || organization.city || organization.state) && (
                  <p className="text-gray-600 mb-1 text-sm">
                    <strong>Location:</strong> {organization.address && `${organization.address}, `}
                    {organization.city && `${organization.city}, `}
                    {organization.state && `${organization.state} `}
                    {organization.zip_code && organization.zip_code}
                  </p>
                )}
                {organization.website_link && (
                  <p className="text-gray-600 mb-1 text-sm">
                    <strong>Website:</strong> <a href={organization.website_link} target="_blank" rel="noopener noreferrer" className="text-ggreen hover:underline">{organization.website_link}</a>
                  </p>
                )}
                {organization.phone && (
                  <p className="text-gray-600 text-sm">
                    <strong>Phone:</strong> {organization.phone}
                  </p>
                )}
              </div>
            </div>
          </div>


          <div>
            <h2 className="text-2xl font-semibold text-ggreen mb-6">
              Active & Upcoming Drives from {organization.name}
            </h2>
            {organization.drives && organization.drives.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {organization.drives.map((drive) => (
                  <Link
                    key={drive.drive_id}
                    href={`/visible/drive/${drive.drive_id}`}
                    className="border border-gray-200 bg-white p-4 rounded-lg shadow-sm hover:shadow-lg transition-shadow flex flex-col"
                  >
                    {drive.photo && (
                      <div className="relative w-full h-48 mb-4 rounded-md overflow-hidden">
                        <Image
                          src={drive.photo || '/img/default-drive.png'}
                          alt={drive.name}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <h3 className="text-lg font-medium text-ggreen mb-2">
                      {drive.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-3 flex-grow">{drive.description || "No description available."}</p>
                    <div className="mt-auto pt-2">
                      <span className="inline-block bg-ggreen text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-teal-700 transition-colors">
                        View Drive
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 italic text-center py-8">
                No active or upcoming drives available for this organization at the moment.
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
    org_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, // GSSP might pass as string
    photo: PropTypes.string,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    zip_code: PropTypes.string,
    country: PropTypes.string,
    website_link: PropTypes.string,
    phone: PropTypes.string,
    is_featured: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]), // DB might store as 0/1
    drives: PropTypes.arrayOf(
      PropTypes.shape({
        drive_id: PropTypes.number.isRequired,
        photo: PropTypes.string,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
      })
    ),
  }),
  error: PropTypes.string,
};

export async function getServerSideProps(context) {
  const { id } = context.params;
  const baseApiUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  try {
    // UPDATED: Use the full internal URL for the API call from GSSP
    const response = await axios.get(`${baseApiUrl}/api/organizations/${id}`);
    const organization = response.data;

    if (!organization || !organization.org_id) { // Check for org_id for validity
      return { notFound: true };
    }
    // Ensure drives is an array, even if null/undefined from API
    organization.drives = organization.drives || [];

    return {
      props: {
        organization: {
          ...organization,
          org_id: Number(organization.org_id) // Ensure org_id is a number if needed by ShareButton or other logic
        },
        error: null,
      },
    };
  } catch (error) {
    console.error(`Error fetching organization data for orgId ${id} in GSSP:`, error.response?.data || error.message);
    if (error.response?.status === 404) {
      return { notFound: true };
    }
    return {
      props: {
        organization: null,
        error: 'Failed to load organization data. Please try again later.',
      },
    };
  }
}

export default OrganizationPage;