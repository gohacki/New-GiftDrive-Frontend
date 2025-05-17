// File: pages/visible/search.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import DriveListCard from 'components/Cards/DriveListCard';
import OrganizationCard from 'components/Cards/OrganizationCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const driveStatusOptions = [
    { value: 'all', label: 'All Statuses (Current, Upcoming, Past)' }, // Clarified label
    { value: 'current', label: 'Current Drives' },
    { value: 'upcoming', label: 'Upcoming Drives' },
    { value: 'past', label: 'Past Drives' },
];

export default function CombinedSearchPage() {
    const router = useRouter();
    const { q, drive_status, org_state, org_city } = router.query;

    // State for form inputs (controlled components)
    const [pageInputTerm, setPageInputTerm] = useState('');
    const [pageDriveFilter, setPageDriveFilter] = useState('all');
    const [pageOrgStateFilter, setPageOrgStateFilter] = useState('All');
    const [pageOrgCityFilter, setPageOrgCityFilter] = useState('All');

    // State for dynamic filter options
    const [availableStates, setAvailableStates] = useState([]);
    const [availableCities, setAvailableCities] = useState([]);

    // State for search results and status
    const [driveResults, setDriveResults] = useState([]);
    const [orgResults, setOrgResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchAttempted, setSearchAttempted] = useState(false); // To show initial message vs. "no results"

    // Sync form state with URL query parameters
    useEffect(() => {
        setPageInputTerm(typeof q === 'string' ? q : '');
        setPageDriveFilter(typeof drive_status === 'string' ? drive_status : 'all');
        setPageOrgStateFilter(typeof org_state === 'string' ? org_state : 'All');
        // Only set city from query if state is also set, otherwise default to 'All'
        setPageOrgCityFilter(typeof org_state === 'string' && org_state !== 'All' && typeof org_city === 'string' ? org_city : 'All');
    }, [q, drive_status, org_state, org_city]);

    // Fetch available states for the filter dropdown
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                // UPDATED to relative path
                const statesResponse = await axios.get(`/api/organizations/states`);
                setAvailableStates(statesResponse.data || []);
            } catch (err) {
                console.error('Error fetching states:', err.response?.data || err.message);
                // setError('Could not load state filter options.'); // Optional: display error
            }
        };
        fetchFilterOptions();
    }, []); // Fetch states only once on component mount

    // Fetch cities when the selected state changes
    useEffect(() => {
        const fetchCitiesForState = async () => {
            if (pageOrgStateFilter && pageOrgStateFilter !== 'All') {
                setLoading(true); // Indicate loading for cities
                try {
                    // UPDATED to relative path
                    const citiesResponse = await axios.get(`/api/organizations/cities`, {
                        params: { state: pageOrgStateFilter },
                    });
                    setAvailableCities(citiesResponse.data || []);
                    // If current city in URL isn't in new list, reset it (unless it's the initial load from URL)
                    if (!citiesResponse.data.includes(pageOrgCityFilter) && router.query.org_city !== pageOrgCityFilter) {
                        setPageOrgCityFilter('All');
                    }
                } catch (err) {
                    console.error(`Error fetching cities for state ${pageOrgStateFilter}:`, err.response?.data || err.message);
                    setAvailableCities([]);
                    // setError('Could not load city filter options.'); // Optional
                } finally {
                    setLoading(false);
                }
            } else {
                setAvailableCities([]);
                if (pageOrgStateFilter === 'All') setPageOrgCityFilter('All'); // Reset city if state is "All"
            }
        };
        fetchCitiesForState();
    }, [pageOrgStateFilter, router.query.org_city]); // Re-fetch if selected state or URL city changes

    // Main data fetching effect based on URL query parameters
    useEffect(() => {
        const currentSearchTerm = typeof q === 'string' ? q.trim() : '';
        const currentDriveFilter = typeof drive_status === 'string' ? drive_status : 'all';
        const currentOrgState = typeof org_state === 'string' ? org_state : 'All';
        const currentOrgCity = typeof org_city === 'string' ? org_city : 'All';

        // Only search if there's a query term or a specific filter is applied
        if (!currentSearchTerm && currentDriveFilter === 'all' && currentOrgState === 'All' && currentOrgCity === 'All') {
            setDriveResults([]);
            setOrgResults([]);
            setLoading(false);
            setSearchAttempted(false); // Not a search attempt if all filters are default and no query
            setError(null);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setSearchAttempted(true); // A search is being made
            setDriveResults([]);
            setOrgResults([]);

            try {
                // Fetch Drives
                const driveParams = { search: currentSearchTerm, status: currentDriveFilter, limit: 12 }; // Example limit
                if (currentDriveFilter === 'all') delete driveParams.status; // Don't send status if 'all'
                // UPDATED to relative path
                const driveResponse = await axios.get(`/api/drives`, { params: driveParams });
                setDriveResults(driveResponse.data || []);

                // Fetch Organizations
                const orgParams = { search: currentSearchTerm, limit: 12, featured: "false" }; // Example limit
                if (currentOrgState !== 'All') orgParams.state = currentOrgState;
                if (currentOrgCity !== 'All' && currentOrgState !== 'All') orgParams.city = currentOrgCity;
                // UPDATED to relative path
                const orgResponse = await axios.get(`/api/organizations/featured`, { params: orgParams }); // Using /featured but with featured=false
                setOrgResults(orgResponse.data || []);

            } catch (err) {
                console.error('Error fetching search results:', err.response?.data || err.message);
                setError('Failed to load search results. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (router.isReady) { // Ensure router.query is populated
            fetchData();
        }

    }, [q, drive_status, org_state, org_city, router.isReady]); // Depend on URL query params

    const handleSearchAndFilterApply = (e) => {
        if (e) e.preventDefault();
        const queryParams = new URLSearchParams();
        const termToApply = pageInputTerm.trim();

        if (termToApply) queryParams.set('q', termToApply);
        if (pageDriveFilter !== 'all') queryParams.set('drive_status', pageDriveFilter);
        if (pageOrgStateFilter !== 'All') {
            queryParams.set('org_state', pageOrgStateFilter);
            // Only set city if a specific state is selected and a specific city is chosen
            if (pageOrgCityFilter !== 'All') {
                queryParams.set('org_city', pageOrgCityFilter);
            }
        }
        // No need to set org_city if org_state is 'All'

        router.push(`/visible/search?${queryParams.toString()}`, undefined, { shallow: false });
    };

    return (
        <>
            <Navbar transparent /> {/* Assuming AuthNavbar handles transparency based on scroll */}
            <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-20 pb-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center mb-8 pt-6">
                        <h1 className="text-4xl font-semibold text-ggreen">Discover & Support</h1>
                        <p className="text-lg text-gray-600 mt-2">Find drives and organizations making a difference.</p>
                    </div>

                    <form onSubmit={handleSearchAndFilterApply} className="bg-white p-6 rounded-lg shadow-md mb-8 sticky top-20 z-40"> {/* Ensure z-index is high enough */}
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-grow">
                                <label htmlFor="page-search-input" className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Drives & Organizations
                                </label>
                                <div className="relative">
                                    <input
                                        type="search"
                                        id="page-search-input"
                                        value={pageInputTerm}
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label htmlFor="drive-status-filter" className="block text-xs font-medium text-gray-700 mb-1">Drive Status</label>
                                <select
                                    id="drive-status-filter"
                                    value={pageDriveFilter}
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
                                    value={pageOrgStateFilter}
                                    onChange={(e) => {
                                        setPageOrgStateFilter(e.target.value);
                                        if (e.target.value === 'All') setPageOrgCityFilter('All'); // Reset city if state becomes "All"
                                    }}
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
                                    value={pageOrgCityFilter}
                                    onChange={(e) => setPageOrgCityFilter(e.target.value)}
                                    disabled={pageOrgStateFilter === 'All'}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-1 focus:ring-ggreen focus:border-ggreen bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="All">All Cities in State</option>
                                    {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                </select>
                            </div>
                        </div>
                    </form>

                    {loading && <p className="text-center text-gray-600 text-lg py-10">Loading results...</p>}
                    {error && <p className="text-center text-red-500 text-lg py-10">{error}</p>}

                    {!loading && !error && !searchAttempted && !q && !drive_status && !org_state && !org_city && ( // More specific initial state check
                        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
                            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-xl text-gray-700 mb-2">Ready to find something?</p>
                            <p className="text-gray-500">Enter a search term or use the filters above to begin.</p>
                        </div>
                    )}

                    {!loading && !error && searchAttempted && driveResults.length === 0 && orgResults.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
                            <p className="text-xl text-gray-700 mb-4">No results found for your criteria.</p>
                            <p className="text-gray-500">Try different keywords or broaden your filters.</p>
                        </div>
                    )}

                    {!loading && !error && (driveResults.length > 0 || orgResults.length > 0) && (
                        <>
                            {driveResults.length > 0 && (
                                <section className="mb-12">
                                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Drives Found</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {driveResults.map((drive) => (
                                            <DriveListCard key={`drive-${drive.drive_id}`} drive={drive} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {orgResults.length > 0 && (
                                <section>
                                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Organizations Found</h2>
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