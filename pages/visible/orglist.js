import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import OrganizationCard from 'components/Cards/OrganizationCard';
import { useRouter } from 'next/router'; // For navigation

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function HomePage() {
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
  };

  useEffect(() => {
    const fetchFeaturedOrganizations = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/organizations/featured`);
        setOrganizations(response.data);
      } catch (error) {
        console.error('Error fetching featured organizations:', error);
      }
    };

    fetchFeaturedOrganizations();
  }, []);

  return (
    <>
      <Navbar transparent />
      <main>

        {/* Search Bar Section */}
        <section className="relative py-20 bg-blueGray-600">
          <div className="container mx-auto px-4 flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-blueGray-800 mb-6">Find the Perfect Organization for Your Cause</h2>
            <form onSubmit={handleSearch} className="w-full max-w-md">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <svg className="h-5 w-5 text-blueGray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search for organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-blueGray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md transition duration-300"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Featured Organizations Section */}
        <section id="organizations" className="relative py-20 bg-blueGray-200">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h3 className="text-3xl font-semibold text-blueGray-800">Featured Organizations</h3>
              <p className="text-blueGray-600 mt-2">Discover organizations making a real impact</p>
            </div>
            {/* Organizations Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.length > 0 ? (
                organizations.map((org) => (
                  <OrganizationCard key={org.org_id} org={org} />
                ))
              ) : (
                <p className="text-center text-blueGray-600 col-span-full">No organizations found.</p>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}