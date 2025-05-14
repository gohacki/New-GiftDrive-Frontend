// pages/visible/search.js
import React, { useEffect, useState, useCallback, useRef } from 'react'; // Added useRef
import { useRouter } from 'next/router';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import DriveListCard from 'components/Cards/DriveListCard';
import OrganizationCard from 'components/Cards/OrganizationCard';
import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const driveStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'current', label: 'Current Drives' },
    { value: 'upcoming', label: 'Upcoming Drives' },
    { value: 'past', label: 'Past Drives' },
];

export default function CombinedSearchPage() {
    const router = useRouter();
    // Directly use router.query for applied filters/search term for fetching
    const { q, drive_status, org_state, org_city } = router.query;

    // State for search input field ON THIS PAGE (distinct from applied URL query)
    const [pageInputTerm, setPageInputTerm] = useState('');

    // State for filter dropdowns ON THIS PAGE
    const [pageDriveFilter, setPageDriveFilter] = useState('all');
    const [pageOrgStateFilter, setPageOrgStateFilter] = useState('All');
    const [pageOrgCityFilter, setPageOrgCityFilter] = useState('All');

    const [availableStates, setAvailableStates] = useState([]);
    const [availableCities, setAvailableCities] = useState([]);

    const [driveResults, setDriveResults] = useState([]);
    const [orgResults, setOrgResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchAttempted, setSearchAttempted] = useState(false);

    const isInitialMount = useRef(true); // To track initial mount

    // Effect 1: Initialize local input/filter states from URL when URL changes (e.g., navbar search, back/forward)
    useEffect(() => {
        setPageInputTerm(typeof q === 'string' ? q : '');
        setPageDriveFilter(typeof drive_status === 'string' ? drive_status : 'all');
        setPageOrgStateFilter(typeof org_state === 'string' ? org_state : 'All');
        // City filter might depend on state, if it's in query, set it.
        // The dependent useEffect for cities will handle populating `availableCities`
        // and potentially resetting pageOrgCityFilter if the state changes.
        setPageOrgCityFilter(typeof org_city === 'string' ? org_city : 'All');
    }, [q, drive_status, org_state, org_city]); // Listen to direct URL query changes

    // Fetch available states (runs once)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const statesResponse = await axios.get(`${apiUrl}/api/organizations/states`);
                setAvailableStates(statesResponse.data || []);
            } catch (err) {
                console.error('Error fetching states:', err);
            }
        };
        fetchFilterOptions();
    }, []);

    // Fetch cities when pageOrgStateFilter changes
    useEffect(() => {
        const fetchCitiesForState = async () => {
            if (pageOrgStateFilter && pageOrgStateFilter !== 'All') {
                try {
                    const citiesResponse = await axios.get(`${apiUrl}/api/organizations/cities`, {
                        params: { state: pageOrgStateFilter },
                    });
                    setAvailableCities(citiesResponse.data || []);
                    // If the current pageOrgCityFilter is not in the new list of available cities AND it wasn't set from the URL, reset it.
                    if (!citiesResponse.data.includes(pageOrgCityFilter) && router.query.org_city !== pageOrgCityFilter) {
                        setPageOrgCityFilter('All');
                    }
                } catch (err) {
                    console.error(`Error fetching cities for state ${pageOrgStateFilter}:`, err);
                    setAvailableCities([]);
                }
            } else {
                setAvailableCities([]);
                if (pageOrgStateFilter === 'All') setPageOrgCityFilter('All');
            }
        };
        fetchCitiesForState();
    }, [pageOrgStateFilter, router.query.org_city]); // Rerun if state filter changes or if city from URL changes (less likely to change independently)

    // Effect 2: Perform search when router.query parameters (q, drive_status, etc.) change
    // This is the primary effect for fetching data based on the URL state.
    useEffect(() => {
        const currentSearchTerm = typeof q === 'string' ? q : '';
        const currentDriveFilter = typeof drive_status === 'string' ? drive_status : 'all';
        const currentOrgState = typeof org_state === 'string' ? org_state : 'All';
        const currentOrgCity = typeof org_city === 'string' ? org_city : 'All';

        if (!currentSearchTerm && currentDriveFilter === 'all' && currentOrgState === 'All' && currentOrgCity === 'All') {
            // If page loaded with no query params initially
            setDriveResults([]);
            setOrgResults([]);
            setLoading(false);
            setSearchAttempted(false);
            setError(null);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setSearchAttempted(true);
            setDriveResults([]); // Clear previous results
            setOrgResults([]);

            try {
                const driveParams = { search: currentSearchTerm, status: currentDriveFilter, limit: 12 };
                if (currentDriveFilter === 'all') delete driveParams.status;

                const driveResponse = await axios.get(`${apiUrl}/api/drives`, { params: driveParams });
                setDriveResults(driveResponse.data || []);

                const orgParams = { search: currentSearchTerm, limit: 12, featured: "false" };
                if (currentOrgState !== 'All') orgParams.state = currentOrgState;
                if (currentOrgCity !== 'All' && currentOrgState !== 'All') orgParams.city = currentOrgCity;

                const orgResponse = await axios.get(`${apiUrl}/api/organizations/featured`, { params: orgParams });
                setOrgResults(orgResponse.data || []);

            } catch (err) {
                console.error('Error fetching search results:', err);
                setError('Failed to load search results. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        // router.isReady is important to ensure query params are available on first load
        if (router.isReady) {
            fetchData();
        }

    }, [q, drive_status, org_state, org_city, router.isReady]); // Depend on router.query values

    // Handler for submitting the search/filters FROM THIS PAGE
    const handleSearchAndFilterApply = (e) => {
        if (e) e.preventDefault();

        const queryParams = new URLSearchParams();
        const termToApply = pageInputTerm.trim();

        if (termToApply) queryParams.set('q', termToApply);
        if (pageDriveFilter !== 'all') queryParams.set('drive_status', pageDriveFilter);
        if (pageOrgStateFilter !== 'All') queryParams.set('org_state', pageOrgStateFilter);
        if (pageOrgCityFilter !== 'All' && pageOrgStateFilter !== 'All') queryParams.set('org_city', pageOrgCityFilter);

        // This push will update router.query, which then triggers the data fetching useEffect
        router.push(`/visible/search?${queryParams.toString()}`, undefined, { shallow: false }); // Use shallow: false if you want getServerSideProps to re-run, or true if client-side only fetch is enough
    };

    return (
        <>
            <Navbar transparent />
            <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-20 pb-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center mb-8 pt-6">
                        <h1 className="text-4xl font-semibold text-ggreen">Discover & Support</h1>
                        <p className="text-lg text-gray-600 mt-2">Find drives and organizations making a difference.</p>
                    </div>

                    <form onSubmit={handleSearchAndFilterApply} className="bg-white p-6 rounded-lg shadow-md mb-8 sticky top-20 z-10">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-grow">
                                <label htmlFor="page-search-input" className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Drives & Organizations
                                </label>
                                <div className="relative">
                                    <input
                                        type="search"
                                        id="page-search-input"
                                        value={pageInputTerm} // Controlled by pageInputTerm
                                        onChange={(e) => setPageInputTerm(e.target.value)}
                                        placeholder="Enter keywords..."
                                        className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2.5 pr-10 focus:ring-2 focus:ring-ggreen focus:border-transparent"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-0 top-0 bottom-0 px-3 text-gray-500 hover:text-ggreen"
                                        aria-label="Search"
                                    >
                                        <MagnifyingGlassIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full md:w-auto bg-ggreen text-white font-semibold px-6 py-2.5 rounded-md hover:bg-teal-700 transition-colors text-sm"
                            >
                                Search
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label htmlFor="drive-status-filter" className="block text-xs font-medium text-gray-700 mb-1">Drive Status</label>
                                <select
                                    id="drive-status-filter"
                                    value={pageDriveFilter} // Controlled by pageDriveFilter
                                    onChange={(e) => setPageDriveFilter(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-1 focus:ring-ggreen focus:border-ggreen bg-white"
                                >
                                    {driveStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="org-state-filter" className="block text-xs font-medium text-gray-700 mb-1">Organization State</label>
                                <select
                                    id="org-state-filter"
                                    value={pageOrgStateFilter} // Controlled by pageOrgStateFilter
                                    onChange={(e) => setPageOrgStateFilter(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-1 focus:ring-ggreen focus:border-ggreen bg-white"
                                >
                                    <option value="All">All States</option>
                                    {availableStates.map(state => <option key={state} value={state}>{state}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="org-city-filter" className="block text-xs font-medium text-gray-700 mb-1">Organization City</label>
                                <select
                                    id="org-city-filter"
                                    value={pageOrgCityFilter} // Controlled by pageOrgCityFilter
                                    onChange={(e) => setPageOrgCityFilter(e.target.value)}
                                    disabled={pageOrgStateFilter === 'All' && availableCities.length === 0}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-1 focus:ring-ggreen focus:border-ggreen bg-white disabled:bg-gray-100"
                                >
                                    <option value="All">All Cities in State</option>
                                    {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                </select>
                            </div>
                        </div>
                    </form>

                    {/* Results Section */}
                    {loading && <p className="text-center text-gray-600 text-lg py-10">Loading results...</p>}
                    {error && <p className="text-center text-red-500 text-lg py-10">{error}</p>}

                    {!loading && !error && !searchAttempted && !q && (
                        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
                            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-xl text-gray-700 mb-2">Ready to find something?</p>
                            <p className="text-gray-500">Enter a search term or use the filters above to begin.</p>
                        </div>
                    )}

                    {!loading && !error && searchAttempted && driveResults.length === 0 && orgResults.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
                            <p className="text-xl text-gray-700 mb-4">No results found for your criteria.</p>
                            <p className="text-gray-500">
                                Try different keywords or broaden your filters.
                            </p>
                        </div>
                    )}

                    {!loading && !error && (driveResults.length > 0 || orgResults.length > 0) && (
                        <>
                            {driveResults.length > 0 && (
                                <section className="mb-12">
                                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Drives</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {driveResults.map((drive) => (
                                            <DriveListCard key={`drive-${drive.drive_id}`} drive={drive} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {orgResults.length > 0 && (
                                <section>
                                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Organizations</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {orgResults.map((org) => (
                                            <OrganizationCard key={`org-${org.org_id}`} org={org} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}