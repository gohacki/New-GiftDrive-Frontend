// src/pages/visible/orglist.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import OrganizationCard from 'components/Cards/OrganizationCard';
import InfiniteScroll from 'react-infinite-scroll-component';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function OrgList() {
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [featuredOnly, setFeaturedOnly] = useState(true); // Load featured by default
  const [states, setStates] = useState(['All']);
  const [cities, setCities] = useState(['All']);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // To handle errors

  // Fetch filter options (states and cities)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch unique states
        const statesResponse = await axios.get(`${apiUrl}/api/organizations/states`);
        setStates(['All States', ...statesResponse.data]);

        // Fetch unique cities
        const citiesResponse = await axios.get(`${apiUrl}/api/organizations/cities`);
        setCities(['All Cities', ...citiesResponse.data]);
      } catch (error) {
        console.error('Error fetching filter options:', error);
        setError('Failed to load filter options. Please try again later.');
        // Fallback to predefined states and cities if API fails
        setStates(['All', 'California', 'Texas', 'New York']);
        setCities(['All', 'Los Angeles', 'Houston', 'New York City']);
      }
    };

    fetchFilterOptions();
  }, []);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    // Reset organizations and pagination when a new search is performed
    setOrganizations([]);
    setPage(1);
    setHasMore(true);
    setFeaturedOnly(false); // Clear "Featured Only" when searching
    fetchOrganizations(1, true);
  };

  // Handle filter changes
  const handleFilterChange = () => {
    // Reset organizations and pagination when filters are changed
    setOrganizations([]);
    setPage(1);
    setHasMore(true);
    fetchOrganizations(1, true);
  };

  // Fetch organizations with filtering and pagination
  const fetchOrganizations = async (currentPage, reset = false) => {
    setLoading(true);
    setError(null); // Reset error state
    try {
      // Build query parameters
      const params = {
        page: currentPage,
        limit: 6, // Adjust as needed
      };

      if (searchQuery.trim() !== '') {
        params.search = searchQuery.trim();
      }

      if (selectedState !== 'All') {
        params.state = selectedState;
      }

      if (selectedCity !== 'All') {
        params.city = selectedCity;
      }

      if (featuredOnly) {
        params.featured = true;
      }

      const response = await axios.get(`${apiUrl}/api/organizations/featured`, { params });

      if (response.data && response.data.length > 0) {
        setOrganizations((prev) => (reset ? response.data : [...prev, ...response.data]));
        if (response.data.length < 6) {
          setHasMore(false); // No more data to load
        }
      } else {
        setHasMore(false); // No more data to load
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError('Failed to load organizations. Please try again later.');
      setHasMore(false); // Stop further fetching on error
    }
    setLoading(false);
  };

  // Fetch initial data
  useEffect(() => {
    fetchOrganizations(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Load more organizations (for infinite scroll)
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  // Update cities based on selected state
  useEffect(() => {
    const fetchCitiesByState = async () => {
      if (selectedState === 'All') {
        // Reset to all cities
        try {
          const citiesResponse = await axios.get(`${apiUrl}/api/organizations/cities`);
          setCities(['All', ...citiesResponse.data]);
        } catch (error) {
          console.error('Error fetching cities:', error);
          setCities(['All', 'Los Angeles', 'Houston', 'New York City']);
        }
      } else {
        try {
          const citiesResponse = await axios.get(`${apiUrl}/api/organizations/cities`, {
            params: { state: selectedState },
          });
          setCities(['All', ...citiesResponse.data]);
        } catch (error) {
          console.error('Error fetching cities for state:', error);
          setCities(['All', 'Los Angeles', 'San Francisco', 'New York City']); // Fallback
        }
      }
      setSelectedCity('All'); // Reset city selection when state changes
    };

    fetchCitiesByState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  return (
    <>
      <Navbar transparent />
      <main>
        {/* Search and Filter Bar Section */}
        <section className="relative py-20 bg-blueGray-600">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-blueGray-800 text-center mb-6">
              Find the Perfect Organization for Your Cause
            </h2>
            <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <svg
                      className="h-5 w-5 text-blueGray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search for organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-blueGray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Search for organizations"
                  />
                </div>
              </div>
              {/* Filter Menu */}
              <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:space-x-4">
                {/* State Filter */}
                <div className="flex-1">
                  <label htmlFor="state" className="sr-only">
                    State
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    onBlur={handleFilterChange}
                    className="block w-full pl-3 pr-10 py-3 border border-blueGray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    aria-label="Filter by state"
                  >
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                {/* City Filter */}
                <div className="flex-1">
                  <label htmlFor="city" className="sr-only">
                    City
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    onBlur={handleFilterChange}
                    className="block w-full pl-3 pr-10 py-3 border border-blueGray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    aria-label="Filter by city"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Featured Filter */}
                <div className="flex items-center">
                  <input
                    id="featured"
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={(e) => {
                      setFeaturedOnly(e.target.checked);
                      handleFilterChange();
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    aria-label="Filter by featured organizations"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-blueGray-800">
                    Featured Only
                  </label>
                </div>
                {/* Optional: Additional Filters can be added here */}
              </div>
            </form>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <section className="py-4 bg-red-100">
            <div className="container mx-auto px-4">
              <p className="text-center text-red-600">{error}</p>
            </div>
          </section>
        )}

        {/* Featured Organizations Section */}
        <section id="organizations" className="relative py-20 bg-blueGray-200">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h3 className="text-3xl font-semibold text-blueGray-800">Featured Organizations</h3>
              <p className="text-blueGray-600 mt-2">Discover organizations making a real impact</p>
            </div>
            {/* Organizations Grid with Infinite Scroll */}
            <InfiniteScroll
              dataLength={organizations.length}
              next={loadMore}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center mt-4">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-label="Loading spinner"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                </div>
              }
              endMessage={
                <p className="text-center text-blueGray-600 mt-4">
                  <b>No more organizations to display.</b>
                </p>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.length > 0 ? (
                  organizations.map((org) => (
                    <OrganizationCard key={org.org_id} org={org} />
                  ))
                ) : (
                  <p className="text-center text-blueGray-600 col-span-full">No organizations found.</p>
                )}
              </div>
            </InfiniteScroll>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// PropTypes validation for the OrgList component
OrgList.propTypes = {
  // No props are being passed to OrgList currently
};