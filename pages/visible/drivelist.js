import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import DriveListCard from 'components/Cards/DriveListCard';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function DriveList() {
  const [drives, setDrives] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch drives with search and pagination
  const fetchDrives = async (currentPage, reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 6,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await axios.get(`${apiUrl}/api/drives`, { params });

      if (response.data && response.data.length > 0) {
        setDrives((prev) => (reset ? response.data : [...prev, ...response.data]));
        if (response.data.length < 6) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching drives:', err);
      setError('Failed to load drives. Please try again later.');
      setHasMore(false);
    }
    setLoading(false);
  };

  // Refetch when search query changes
  useEffect(() => {
    setDrives([]);
    setPage(1);
    setHasMore(true);
    fetchDrives(1, true);
  }, [searchQuery]);

  // Fetch next page when page changes
  useEffect(() => {
    if (page === 1) return;
    fetchDrives(page, false);
  }, [page]);

  // Debounce search input updates
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedInput = searchInput.trim();
      setSearchQuery(trimmedInput);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <>
      <Navbar transparent />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative">
        {/* Search Section */}
        <section className="relative px-4 py-12 sm:py-20 bg-background">
          <div className="container mx-auto">
            <h2 className="inter-regular text-ggreen text-3xl sm:text-4xl text-center mb-6 pt-12">
              Find a Drive to Support
            </h2>
            <form
              className="w-full max-w-4xl mx-auto mb-6"
              onSubmit={(e) => {
                e.preventDefault();
                setSearchQuery(searchInput.trim());
              }}
            >
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
                  placeholder="Search for drives..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ggreen focus:border-transparent"
                  aria-label="Search for drives"
                />
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

        {/* Drives Section */}
        <section id="drives" className="relative py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {drives.length > 0 ? (
                drives.map((drive) => (
                  <DriveListCard key={drive.drive_id} drive={drive} />
                ))
              ) : (
                <p className="text-center text-gray-600 col-span-full">No drives found.</p>
              )}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className={`bg-white text-ggreen border-2 border-solid border-ggreen active:bg-ggreen-dark text-sm inter-bold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg outline-none focus:outline-none ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } transition-all duration-150`}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
            {!hasMore && drives.length > 0 && (
              <p className="text-center text-gray-600 mt-4">No more drives to display.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
