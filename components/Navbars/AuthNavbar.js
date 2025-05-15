// src/components/Navbars/AuthNavbar.js
import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FaShoppingCart, FaSpinner } from 'react-icons/fa';
import { CartContext } from '../../contexts/CartContext';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// --- Debounce Helper Function ---
function debounce(func, delay) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}
// --- End Debounce Helper ---


const Navbar = ({ transparent, isBladeOpen }) => {
  const { user, logout } = useContext(AuthContext);
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const { cart } = useContext(CartContext);
  const itemCount = cart?.items
    ? cart.items.reduce((total, item) => total + item.quantity, 0)
    : 0;

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQueryVal, setSearchQueryVal] = useState('');
  const searchInputRef = useRef(null);
  const suggestionsContainerRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };
    if (transparent) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    } else {
      setScrolled(true);
    }
  }, [transparent]);

  useEffect(() => {
    const handleRouteChange = () => {
      setNavbarOpen(false);
      // Do not hide search suggestions on route change start,
      // as it might be a search submission causing the route change.
      // setShowSuggestions(false); // This was potentially closing suggestions prematurely
    };
    router.events.on('routeChangeStart', handleRouteChange);
    const handleRouteComplete = () => {
      // Hide suggestions once navigation is complete, unless it's the search page itself.
      if (!router.pathname.startsWith('/visible/search')) {
        setShowSuggestions(false);
      }
      if (isSearchExpanded && !router.pathname.startsWith('/visible/search')) {
        // If search was expanded and we navigate away from search results, collapse it.
        // This line is a bit aggressive, consider if user wants to keep it open.
        // setIsSearchExpanded(false);
      }
    };
    router.events.on('routeChangeComplete', handleRouteComplete);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeComplete', handleRouteComplete);
    };
  }, [router.events, router.pathname, isSearchExpanded]);


  const debouncedFetchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        setLoadingSuggestions(false);
        return;
      }
      setLoadingSuggestions(true);
      setShowSuggestions(true); // Show suggestions container when fetching
      try {
        const response = await axios.get(`${apiUrl}/api/search/suggestions`, {
          params: { q: query },
          withCredentials: true,
        });
        setSuggestions(response.data || []);
        setActiveSuggestionIndex(-1); // Reset active suggestion
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300),
    [apiUrl] // apiUrl is stable
  );

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQueryVal(query);
    debouncedFetchSuggestions(query);
  };

  // Effect for hiding suggestions on outside click or Escape key
  useEffect(() => {
    const handleClickOutsideSuggestions = (event) => {
      if (
        suggestionsContainerRef.current &&
        !suggestionsContainerRef.current.contains(event.target) &&
        searchInputRef.current && !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showSuggestions) {
          setShowSuggestions(false);
        } else if (isSearchExpanded) {
          // If suggestions are already hidden but search is expanded, then collapse search.
          // This is now handled by the new click-outside for the search bar itself.
          // For Escape key, we might want similar behavior:
          // toggleSearchExpansion(); // This would collapse it.
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutsideSuggestions);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSuggestions);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showSuggestions, isSearchExpanded]); // Re-evaluate if showSuggestions or isSearchExpanded changes

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    setNavbarOpen(false);
    setIsSearchExpanded(false);
    setShowSuggestions(false);
    router.push('/');
  };

  const isActive = (href) => router.pathname === href;

  // Memoize toggleSearchExpansion
  const toggleSearchExpansion = useCallback(() => {
    setIsSearchExpanded(prevIsSearchExpanded => {
      const nextIsSearchExpanded = !prevIsSearchExpanded;
      if (nextIsSearchExpanded) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        // This cleanup is now effectively handled by the useEffect watching isSearchExpanded
        // if we call setIsSearchExpanded(false) directly from outside click.
        // However, keeping it here ensures cleanup if toggle is called directly (e.g., by X button).
        setSearchQueryVal('');
        setShowSuggestions(false);
      }
      if (navbarOpen && nextIsSearchExpanded) {
        setNavbarOpen(false);
      }
      return nextIsSearchExpanded;
    });
  }, [navbarOpen, /* stable setters: setIsSearchExpanded, setSearchQueryVal, setShowSuggestions, setNavbarOpen */]);

  // NEW: Effect to handle clicks outside the search bar to collapse it (for desktop)
  useEffect(() => {
    const handleClickOutsideSearch = (event) => {
      if (!isSearchExpanded) return; // Only run if search is expanded

      const searchFormElement = searchInputRef.current?.closest('form');

      const clickedOutsideSearchForm = searchFormElement && !searchFormElement.contains(event.target);
      const clickedOutsideSuggestions = !suggestionsContainerRef.current || !suggestionsContainerRef.current.contains(event.target);

      if (clickedOutsideSearchForm && clickedOutsideSuggestions) {
        setIsSearchExpanded(false); // Directly set to false
      }
    };

    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutsideSearch);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSearch);
    };
  }, [isSearchExpanded]); // Dependency: isSearchExpanded

  // NEW: Effect to clean up search state when isSearchExpanded becomes false
  useEffect(() => {
    if (!isSearchExpanded) {
      setSearchQueryVal('');
      setShowSuggestions(false);
      // Potentially reset activeSuggestionIndex if needed
      setActiveSuggestionIndex(-1);
    }
  }, [isSearchExpanded]);


  const handleSearchSubmit = (e, queryOverride) => {
    if (e) e.preventDefault();
    const query = (typeof queryOverride === 'string' ? queryOverride : searchQueryVal).trim();
    if (query) {
      router.push(`/visible/search?q=${encodeURIComponent(query)}`);
      if (navbarOpen) setNavbarOpen(false);
      // setShowSuggestions(false); // Let routeChangeComplete handle this
      // setIsSearchExpanded(false); // Keep search expanded on search page, or let user decide.
      // Or collapse if navigating to a non-search page.
      // This can be handled by routeChangeComplete too.
    } else {
      toast.info("Please enter something to search.");
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQueryVal(suggestion.name);
    // setShowSuggestions(false); // Will be hidden by navigation or click-outside
    handleSearchSubmit(null, suggestion.name);
  };

  const handleKeyDownOnSearch = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      setActiveSuggestionIndex(-1);
      if (e.key === 'Enter') { // Allow submitting form even if no suggestions shown/selected
        // Form onSubmit will handle this
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prevIndex =>
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prevIndex =>
        prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault(); // Prevent form submission if selecting suggestion
        handleSuggestionClick(suggestions[activeSuggestionIndex]);
      } else {
        // If Enter is pressed and no suggestion is active, let the form submit
        setShowSuggestions(false); // Hide suggestions on explicit submit
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 z-50 w-full 
                 transition-all duration-300 ease-in-out
                 ${(transparent && !scrolled && !navbarOpen && !isSearchExpanded) ? 'bg-transparent' : 'bg-secondary_green shadow-lg'}
                 ${isBladeOpen ? 'pr-[15rem]' : 'pr-0'}`}
    >
      <div className="container mx-auto px-4 py-3 flex items-center"> {/* Main flex row for navbar items */}
        {/* Logo - Stays on the left */}
        <div className="flex-shrink-0">
          <Link href="/">
            <div className="leading-relaxed py-2 whitespace-nowrap cursor-pointer inter-semi-bold text-ggreen text-2xl flex items-center gap-2">
              <Image src="/MainGift.png" alt="GiftDrive Logo" width={128} height={128} className="h-8 w-auto -mt-1" priority />
              GiftDrive
            </div>
          </Link>
        </div>

        {/* Desktop Search Area */}
        <div className={`hidden lg:flex items-center mx-4 relative ${isSearchExpanded ? 'flex-grow' : 'flex-shrink-0'}`}>
          {isSearchExpanded ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <input
                ref={searchInputRef}
                type="search"
                value={searchQueryVal}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDownOnSearch}
                onFocus={() => searchQueryVal.trim() && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search Drives & Organizations..."
                className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm px-4 py-2.5 pr-10 focus:ring-2 focus:ring-ggreen focus:border-transparent transition-all duration-300"
                autoComplete="off"
              />
              <button type="button" onClick={toggleSearchExpansion} className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 mr-1 text-gray-500 hover:text-ggreen" aria-label="Close search">
                <XMarkIcon className="h-5 w-5" />
              </button>
              {/* Suggestions Dropdown - Desktop */}
              {showSuggestions && isSearchExpanded && (
                <div ref={suggestionsContainerRef} className="absolute top-full mt-1.5 w-full bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
                  {loadingSuggestions ? (
                    <div className="p-3 text-sm text-gray-500 flex items-center justify-center"><FaSpinner className="animate-spin mr-2" /> Loading...</div>
                  ) : suggestions.length > 0 ? (
                    <ul>
                      {suggestions.map((suggestion, index) => (
                        <li
                          key={`${suggestion.type}-${suggestion.id}-${index}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-100 ${index === activeSuggestionIndex ? 'bg-gray-100' : ''}`}
                        >
                          <span className="font-medium text-gray-800">{suggestion.name}</span>
                          <span className="text-xs text-gray-500 ml-2 capitalize">({suggestion.type})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    searchQueryVal.trim() && !loadingSuggestions && <div className="p-3 text-sm text-gray-500">No suggestions found.</div>
                  )}
                </div>
              )}
            </form>
          ) : (
            <button onClick={toggleSearchExpansion} className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-1.5 text-sm text-gray-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ggreen focus:border-transparent transition-all duration-200 w-48 h-[2.375rem] flex-shrink-0" aria-label="Open search">
              <MagnifyingGlassIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="text-xs truncate">Search...</span>
            </button>
          )}
        </div>

        {/* Right Aligned Group for Desktop */}
        <div className="hidden lg:flex items-center ml-auto space-x-4">
          <ul className="flex flex-row list-none items-center space-x-1">
            {user && (
              <>
                <li className="flex items-center">
                  <Link href="/visible/profile"><span className={`text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow ${isActive('/visible/profile') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>Account</span></Link>
                </li>
                {!!user.is_org_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/dashboard"><span className={`text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow ${isActive('/admin/dashboard') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>My Org Dashboard</span></Link>
                  </li>
                )}
                {!!user.is_super_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/superAdmin"><span className={`text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow ${isActive('/admin/superAdmin') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>Super Admin</span></Link>
                  </li>
                )}
                <li className="flex items-center">
                  <button onClick={handleLogout} className="text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow cursor-pointer bg-transparent border-none whitespace-nowrap">Logout</button>
                </li>
              </>
            )}
            {!user && (
              <>
                <li className="flex items-center">
                  <Link href="/auth/login"><span className={`text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow ${isActive('/auth/login') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>Login</span></Link>
                </li>
                <li className="flex items-center">
                  <Link href="/auth/register"><span className={`text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow ${isActive('/auth/register') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>Register</span></Link>
                </li>
              </>
            )}
          </ul>
          <div>
            <Link href="/visible/registerdrive">
              <button className="bg-white text-blueGray-700 active:bg-blueGray-50 text-xs inter-regular uppercase px-3 py-2 rounded-full shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 whitespace-nowrap" type="button">
                Create A Drive
              </button>
            </Link>
          </div>
          <div className="navbar-cart flex items-center">
            <Link href="/visible/cart">
              <div className="relative p-1">
                <FaShoppingCart className="h-6 w-6 text-ggreen" />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] inter-regular leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {itemCount}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Mobile Specific Controls */}
        <div className="lg:hidden flex items-center ml-auto">
          <Link href="/visible/cart" className="p-2 text-ggreen hover:text-gyellow">
            <div className="relative">
              <FaShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] inter-regular leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
          </Link>
          <button
            className="text-ggreen cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block outline-none focus:outline-none"
            type="button"
            onClick={() => { setNavbarOpen(!navbarOpen); if (isSearchExpanded) setIsSearchExpanded(false); /* setShowSuggestions(false); This is now handled by isSearchExpanded effect */ }}
            aria-label="Toggle navigation menu"
          >
            {navbarOpen ? <XMarkIcon className="h-6 w-6" /> : <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {navbarOpen && (
        <div className="lg:hidden bg-secondary_green shadow-lg">
          {/* Mobile Search Form */}
          <form onSubmit={handleSearchSubmit} className="p-4 border-b border-gray-200 relative">
            <div className="relative flex items-center">
              <input
                type="search"
                value={searchQueryVal}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDownOnSearch}
                onFocus={() => searchQueryVal.trim() && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search Drives & Organizations..."
                className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-full px-4 py-2 pr-10 focus:ring-2 focus:ring-ggreen focus:border-transparent"
                autoComplete="off"
              />
              <button type="submit" className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-ggreen" aria-label={searchQueryVal ? "Clear search" : "Search"}>
                {searchQueryVal ? <XMarkIcon className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setSearchQueryVal(''); setShowSuggestions(false); }} /> : <MagnifyingGlassIcon className="h-5 w-5" />}
              </button>
            </div>
            {/* Suggestions Dropdown - Mobile */}
            {showSuggestions && navbarOpen && ( // Only show if mobile menu is open
              <div ref={suggestionsContainerRef} className="absolute left-4 right-4 mt-1.5 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                {loadingSuggestions ? (
                  <div className="p-3 text-sm text-gray-500 flex items-center justify-center"><FaSpinner className="animate-spin mr-2" /> Loading...</div>
                ) : suggestions.length > 0 ? (
                  <ul>
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={`${suggestion.type}-${suggestion.id}-${index}-mobile`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-100 ${index === activeSuggestionIndex ? 'bg-gray-100' : ''}`}
                      >
                        <span className="font-medium text-gray-800">{suggestion.name}</span>
                        <span className="text-xs text-gray-500 ml-2 capitalize">({suggestion.type})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  searchQueryVal.trim() && !loadingSuggestions && <div className="p-3 text-sm text-gray-500">No suggestions found.</div>
                )}
              </div>
            )}
          </form>
          {/* Mobile Nav Links */}
          <ul className="flex flex-col list-none py-2">
            {user && (
              <>
                <li className="flex items-center"><Link href="/visible/profile"><span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full whitespace-nowrap">Account</span></Link></li>
                {!!user.is_org_admin && <li className="flex items-center"><Link href="/admin/dashboard"><span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full whitespace-nowrap">My Org Dashboard</span></Link></li>}
                {!!user.is_super_admin && <li className="flex items-center"><Link href="/admin/superAdmin"><span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full whitespace-nowrap">Super Admin</span></Link></li>}
                <li className="flex items-center"><button onClick={handleLogout} className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full text-left bg-transparent border-none whitespace-nowrap">Logout</button></li>
              </>
            )}
            {!user && (
              <>
                <li className="flex items-center"><Link href="/auth/login"><span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full whitespace-nowrap">Login</span></Link></li>
                <li className="flex items-center"><Link href="/auth/register"><span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full whitespace-nowrap">Register</span></Link></li>
              </>
            )}
            <li className="flex items-center px-4 py-3">
              <Link href="/visible/registerdrive" className='w-full'>
                <button className="bg-ggreen text-white active:bg-teal-700 text-xs inter-regular uppercase px-4 py-3 rounded-full shadow hover:shadow-md outline-none focus:outline-none w-full whitespace-nowrap" type="button">
                  Create A Drive
                </button>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

Navbar.propTypes = {
  transparent: PropTypes.bool,
  isBladeOpen: PropTypes.bool,
};

Navbar.defaultProps = {
  transparent: false,
  isBladeOpen: false,
};

export default Navbar;