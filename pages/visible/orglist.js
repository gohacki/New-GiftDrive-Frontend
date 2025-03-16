// src/pages/visible/orglist.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import OrganizationCard from 'components/Cards/OrganizationCard';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function OrgList() {
  const [organizations, setOrganizations] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [featuredOnly, setFeaturedOnly] = useState(true);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch filter options (states and cities)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const statesResponse = await axios.get(`${apiUrl}/api/organizations/states`);
        setStates(statesResponse.data);

        const citiesResponse = await axios.get(`${apiUrl}/api/organizations/cities`);
        setCities(citiesResponse.data);
      } catch (error) {
        console.error('Error fetching filter options:', error);
        setError('Failed to load filter options. Please try again later.');
        setStates(['California', 'Texas', 'New York']);
        setCities(['Los Angeles', 'Houston', 'New York City']);
      }
    };

    fetchFilterOptions();
  }, []);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setFeaturedOnly(searchInput.trim() === '' ? true : false);
  };

  // Debounce search input updates
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedInput = searchInput.trim();
      setSearchQuery(trimmedInput);
      if (trimmedInput !== '') {
        setFeaturedOnly(false);
      } else {
        setFeaturedOnly(true);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  // Fetch organizations with filtering and pagination
  const fetchOrganizations = async (currentPage, reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 6,
        featured: featuredOnly.toString(),
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

      const response = await axios.get(`${apiUrl}/api/organizations/featured`, { params });

      if (response.data && response.data.length > 0) {
        setOrganizations((prev) => (reset ? response.data : [...prev, ...response.data]));
        if (response.data.length < 6) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError('Failed to load organizations. Please try again later.');
      setHasMore(false);
    }
    setLoading(false);
  };

  // Refetch when filters/search change
  useEffect(() => {
    setOrganizations([]);
    setPage(1);
    setHasMore(true);
    fetchOrganizations(1, true);
  }, [featuredOnly, selectedState, selectedCity, searchQuery]);

  // Pagination: fetch more organizations when page changes
  useEffect(() => {
    if (page === 1) return;
    fetchOrganizations(page, false);
  }, [page]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  // Update cities based on selected state
  useEffect(() => {
    const fetchCitiesByState = async () => {
      if (selectedState === 'All') {
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
          setCities(['Los Angeles', 'San Francisco', 'New York City']);
        }
      }
      setSelectedCity('All');
    };

    fetchCitiesByState();
  }, [selectedState]);

  return (
    <>
      <Navbar transparent />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative">
        {/* Search and Filter Bar Section */}
        <section className="relative px-4 py-12 sm:py-20 bg-background ">
          <div className="container mx-auto">
            <h2 className="inter-regular text-ggreen text-3xl sm:text-4xl text-center mb-6 pt-12">
              Find the Perfect Organization for Your Cause
            </h2>
            <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <svg
                      className="h-5 w-5 text-gray-400"
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
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ggreen focus:border-transparent"
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
                    className="block w-full pl-3 pr-10 py-3 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-ggreen focus:border-transparent sm:text-sm"
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
                    className="block w-full pl-3 pr-10 py-3 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-ggreen focus:border-transparent sm:text-sm"
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
                    className="h-4 w-4 text-ggreen focus:ring-ggreen border-gray-300 rounded"
                    aria-label="Filter by featured organizations"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-gray-800">
                    Featured Only
                  </label>
                </div>
                {/* Search Button */}
                <div className="flex items-center">
                  <button
                    type="submit"
                    className="ml-2 bg-ggreen text-white px-4 py-2 rounded-md hover:bg-ggreen-dark focus:outline-none focus:ring-2 focus:ring-ggreen"
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
        <section id="organizations" className="relative py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="inter-semi-bold text-ggreen text-3xl">Organizations</h3>
              <p className="text-gray-600 mt-2">Discover organizations making a real impact</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.length > 0 ? (
                organizations.map((org) => (
                  <OrganizationCard key={org.org_id} org={org} />
                ))
              ) : (
                <p className="text-center text-gray-600 col-span-full">No organizations found.</p>
              )}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className={`bg-ggreen text-white active:bg-ggreen-dark text-sm inter-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } transition-all duration-150`}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
            {!hasMore && organizations.length > 0 && (
              <p className="text-center text-gray-600 mt-4">No more organizations to display.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
