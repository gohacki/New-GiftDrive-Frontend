// src/pages/visible/orglist.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import OrganizationCard from 'components/Cards/OrganizationCard';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function OrgList() {
  const [organizations, setOrganizations] = useState([]);
  const [searchInput, setSearchInput] = useState(''); // State for the search input field
  const [searchQuery, setSearchQuery] = useState(''); // Actual query used for fetching
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [featuredOnly, setFeaturedOnly] = useState(true); // Load featured by default
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
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
        setStates(statesResponse.data);

        // Fetch unique cities
        const citiesResponse = await axios.get(`${apiUrl}/api/organizations/cities`);
        setCities(citiesResponse.data);
      } catch (error) {
        console.error('Error fetching filter options:', error);
        setError('Failed to load filter options. Please try again later.');
        // Fallback to predefined states and cities if API fails
        setStates(['California', 'Texas', 'New York']);
        setCities(['Los Angeles', 'Houston', 'New York City']);
      }
    };

    fetchFilterOptions();
  }, []);

  // Handle search form submission (optional)
  const handleSearch = (e) => {
    e.preventDefault();
    // Update searchQuery immediately if user submits the form
    setSearchQuery(searchInput.trim());
    setFeaturedOnly(searchInput.trim() === '' ? true : false); // Clear "Featured Only" when searching if search is not empty
  };

  // Debounce the search input to update searchQuery after user stops typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedInput = searchInput.trim();
      setSearchQuery(trimmedInput);
      if (trimmedInput !== '') {
        setFeaturedOnly(false); // Clear "Featured Only" when searching
      } else {
        setFeaturedOnly(true); // Reset "Featured Only" when search is cleared
      }
    }, 500); // 500ms delay

    // Cleanup the timeout if searchInput changes before 500ms
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  // Fetch organizations with filtering and pagination
  const fetchOrganizations = async (currentPage, reset = false) => {
    setLoading(true);
    setError(null); // Reset error state
    try {
      // Build query parameters
      const params = {
        page: currentPage,
        limit: 6, // Adjust as needed
        featured: featuredOnly.toString(), // Convert to string
      };

      if (searchQuery !== '') {
        params.search = searchQuery;
      }

      if (selectedState !== 'All') {
        params.state = selectedState;
      }

      if (selectedCity !== 'All') {
        params.city = selectedCity;
      }

      // Use the unified endpoint
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

  // useEffect to handle filter and search changes
  useEffect(() => {
    // Reset organizations and pagination when filters or search query change
    setOrganizations([]);
    setPage(1);
    setHasMore(true);
    fetchOrganizations(1, true);
  }, [featuredOnly, selectedState, selectedCity, searchQuery]);

  // Fetch more organizations when 'page' changes
  useEffect(() => {
    if (page === 1) return; // Already fetched in the filter/search useEffect
    fetchOrganizations(page, false);
  }, [page]);

  // Load more organizations (for "Load More" button)
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
          setCities(citiesResponse.data);
        } catch (error) {
          console.error('Error fetching cities:', error);
          setCities(['Los Angeles', 'Houston', 'New York City']);
        }
      } else {
        try {
          const citiesResponse = await axios.get(`${apiUrl}/api/organizations/cities`, {
            params: { state: selectedState },
          });
          setCities(citiesResponse.data);
        } catch (error) {
          console.error('Error fetching cities:', error);
          setCities(['Los Angeles', 'San Francisco', 'New York City']); // Fallback
        }
      }
      setSelectedCity('All'); // Reset city selection when state changes
    };

    fetchCitiesByState();
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
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
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
                    className="block w-full pl-3 pr-10 py-3 border border-blueGray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    aria-label="Filter by state"
                  >
                    <option value="All">All States</option>
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
                    className="block w-full pl-3 pr-10 py-3 border border-blueGray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    aria-label="Filter by city"
                  >
                    <option value="All">All Cities</option>
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
                    onChange={(e) => setFeaturedOnly(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    aria-label="Filter by featured organizations"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-blueGray-800">
                    Featured Only
                  </label>
                </div>
                {/* Optional: Additional Filters can be added here */}
                <div className="flex items-center">
                  <button
                    type="submit"
                    className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Search
                  </button>
                </div>
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

        {/* Organizations Section */}
        <section id="organizations" className="relative py-20 bg-blueGray-200">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h3 className="text-3xl font-semibold text-blueGray-800">Organizations</h3>
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
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className={`bg-blueGray-800 text-white active:bg-blueGray-700 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } transition-all duration-150`}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
            {!hasMore && organizations.length > 0 && (
              <p className="text-center text-blueGray-600 mt-4">No more organizations to display.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
