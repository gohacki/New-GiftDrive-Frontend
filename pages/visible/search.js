// File: pages/visible/search.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import DriveListCard from 'components/Cards/DriveListCard';
import OrganizationCard from 'components/Cards/OrganizationCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const driveStatusOptions = [
    { value: 'all', label: 'All Statuses (Current, Upcoming, Past)' },
    { value: 'current', label: 'Current Drives' },
    { value: 'upcoming', label: 'Upcoming Drives' },
    { value: 'past', label: 'Past Drives' },
];

export default function CombinedSearchPage() {
    const router = useRouter();
    const { q: queryParam_q, drive_status: queryParam_drive_status, org_state: queryParam_org_state, org_city: queryParam_org_city } = router.query;

    const [pageInputTerm, setPageInputTerm] = useState('');
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

    // New state to manage client-side readiness for rendering dynamic content
    const [isClientReady, setIsClientReady] = useState(false);

    useEffect(() => {
        // This effect runs only on the client, after hydration.
        // It sets isClientReady to true once the router is ready.
        if (router.isReady) {
            setIsClientReady(true);
        }
    }, [router.isReady]);

    // Sync form state with URL query parameters
    useEffect(() => {
        // Only update form state if router.isReady to ensure query params are available
        if (router.isReady) {
            setPageInputTerm(typeof queryParam_q === 'string' ? queryParam_q : '');
            setPageDriveFilter(typeof queryParam_drive_status === 'string' ? queryParam_drive_status : 'all');
            setPageOrgStateFilter(typeof queryParam_org_state === 'string' ? queryParam_org_state : 'All');
            // Set city filter based on state; ensure it's 'All' if state is 'All' or city not in new list
            const currentUrlCity = typeof queryParam_org_city === 'string' ? queryParam_org_city : 'All';
            if (typeof queryParam_org_state === 'string' && queryParam_org_state !== 'All') {
                // If cities for the current state are already fetched and the URL city is not among them, reset city to 'All'
                // This logic is further handled in the city fetching useEffect
                setPageOrgCityFilter(currentUrlCity);
            } else {
                setPageOrgCityFilter('All');
            }
        }
    }, [queryParam_q, queryParam_drive_status, queryParam_org_state, queryParam_org_city, router.isReady]);


    // Fetch available states for the filter dropdown
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const statesResponse = await axios.get(`/api/organizations/states`);
                setAvailableStates(statesResponse.data || []);
            } catch (err) {
                console.error('Error fetching states:', err.response?.data || err.message);
            }
        };
        fetchFilterOptions();
    }, []);

    // Fetch cities when the selected state changes
    useEffect(() => {
        const fetchCitiesForState = async () => {
            if (pageOrgStateFilter && pageOrgStateFilter !== 'All') {
                try {
                    const citiesResponse = await axios.get(`/api/organizations/cities`, {
                        params: { state: pageOrgStateFilter },
                    });
                    const newCities = citiesResponse.data || [];
                    setAvailableCities(newCities);
                    // If the currently selected city (from URL or user interaction) is not in the new list of cities, reset it.
                    if (!newCities.includes(pageOrgCityFilter)) {
                        setPageOrgCityFilter('All');
                    }
                } catch (err) {
                    console.error(`Error fetching cities for state ${pageOrgStateFilter}:`, err.response?.data || err.message);
                    setAvailableCities([]);
                    setPageOrgCityFilter('All'); // Reset city on error
                }
            } else {
                setAvailableCities([]);
                if (pageOrgStateFilter === 'All') setPageOrgCityFilter('All'); // Ensure city is 'All' if state is 'All'
            }
        };
        // Only run if isClientReady, as pageOrgStateFilter depends on router.isReady for its initial value
        if (isClientReady) {
            fetchCitiesForState();
        }
    }, [pageOrgStateFilter, isClientReady]); // pageOrgCityFilter removed to avoid loop, handled internally


    // Main data fetching effect
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setSearchAttempted(true);
            setDriveResults([]);
            setOrgResults([]);

            const effectiveSearchTerm = pageInputTerm.trim();
            const effectiveDriveFilter = pageDriveFilter;
            const effectiveOrgState = pageOrgStateFilter;
            const effectiveOrgCity = pageOrgCityFilter;

            try {
                const driveParams = { search: effectiveSearchTerm, limit: 12 };
                if (effectiveDriveFilter !== 'all') driveParams.status = effectiveDriveFilter;
                const driveResponse = await axios.get(`/api/drives`, { params: driveParams });
                setDriveResults(driveResponse.data || []);

                const orgParams = { search: effectiveSearchTerm, limit: 12, featured: "false" };
                if (effectiveOrgState !== 'All') orgParams.state = effectiveOrgState;
                if (effectiveOrgCity !== 'All' && effectiveOrgState !== 'All') orgParams.city = effectiveOrgCity;
                const orgResponse = await axios.get(`/api/organizations/featured`, { params: orgParams });
                setOrgResults(orgResponse.data || []);

            } catch (err) {
                console.error('Error fetching search results:', err.response?.data || err.message);
                setError('Failed to load search results. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        // Only fetch data if the client is ready and query params are available
        // This uses the state variables (pageInputTerm, etc.) which are synced from URL query params.
        if (isClientReady) {
            fetchData();
        }
        // Dependencies reflect the actual URL query parameters that should trigger a refetch.
        // Form input states (pageInputTerm etc.) are derived from these, so they don't need to be direct dependencies here
        // if their own useEffect correctly syncs them. However, to be absolutely sure fetchData runs when form state IS the source of truth
        // (e.g. user types then clicks submit, which updates URL, then this runs), it's safer to include them or simplify.
        // For now, relying on the fact that queryParam_x change will trigger this correctly.
    }, [isClientReady, queryParam_q, queryParam_drive_status, queryParam_org_state, queryParam_org_city]);


    const handleSearchAndFilterApply = (e) => {
        if (e) e.preventDefault();
        const queryParams = new URLSearchParams();
        const termToApply = pageInputTerm.trim();

        if (termToApply) queryParams.set('q', termToApply);
        if (pageDriveFilter !== 'all') queryParams.set('drive_status', pageDriveFilter);
        if (pageOrgStateFilter !== 'All') {
            queryParams.set('org_state', pageOrgStateFilter);
            if (pageOrgCityFilter !== 'All') {
                queryParams.set('org_city', pageOrgCityFilter);
            }
        }
        // Pushing to router will update queryParams and trigger the fetchData effect
        router.push(`/visible/search?${queryParams.toString()}`, undefined, { shallow: false });
    };

    // Initial content to be rendered consistently on server and client's first pass
    const initialContent = (
        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-700 mb-2">Initializing search...</p>
            <p className="text-sm text-gray-500">Use the filters above to find drives and organizations.</p>
        </div>
    );

    return (
        <>
            <Navbar transparent />
            <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-20 pb-16">
                <div className="container mx-auto px-4 py-8"> {/* Line 161 */}
                    <div className="text-center mb-8 pt-6"> {/* Line 162 */}
                        <h1 className="text-4xl font-semibold text-ggreen">Discover & Support</h1>
                        <p className="text-lg text-gray-600 mt-2">Find drives and organizations making a difference.</p>
                    </div>

                    <form onSubmit={handleSearchAndFilterApply} className="bg-white p-6 rounded-lg shadow-md mb-8 sticky top-24 z-40 border-ggreen border-2">
                        {/* Form content... (unchanged) */}
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
                                        // If state is changed to "All", city filter should also reset to "All"
                                        if (e.target.value === 'All') setPageOrgCityFilter('All');
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
                                    disabled={pageOrgStateFilter === 'All' || availableCities.length === 0}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-1 focus:ring-ggreen focus:border-ggreen bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="All">All Cities in State</option>
                                    {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                </select>
                            </div>
                        </div>
                    </form>

                    {!isClientReady ? initialContent : (
                        <>
                            {loading && <p className="text-center text-gray-600 text-lg py-10">Loading results...</p>}
                            {error && <p className="text-center text-red-500 text-lg py-10">{error}</p>}

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
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}