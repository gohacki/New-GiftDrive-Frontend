// src/components/Navbars/AuthNavbar.js
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FaShoppingCart, FaSpinner } from 'react-icons/fa';
import { CartContext } from '../../contexts/CartContext';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useSession, signOut } from 'next-auth/react';

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
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  const [navbarOpen, setNavbarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const { cart } = useContext(CartContext);

  const itemCount = cart?.stores?.reduce((total, store) =>
    total + (store.cartLines?.reduce((lineTotal, line) => lineTotal + line.quantity, 0) || 0)
    , 0) || 0;


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
      setScrolled(true); // If not transparent, assume it's always "scrolled" (i.e., has background)
    }
  }, [transparent]);

  useEffect(() => {
    const handleRouteChange = () => {
      setNavbarOpen(false); // Close mobile menu on route change
    };
    router.events.on('routeChangeStart', handleRouteChange);

    const handleRouteComplete = () => {
      // Close suggestions if navigating away from search page or if search is not expanded
      if (!router.pathname.startsWith('/visible/search')) {
        setShowSuggestions(false);
      }
    };
    router.events.on('routeChangeComplete', handleRouteComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeComplete', handleRouteComplete);
    };
  }, [router.events, router.pathname, isSearchExpanded]); // isSearchExpanded added to re-evaluate if needed


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
        const response = await axios.get(`/api/search/suggestions`, {
          params: { q: query },
        });
        setSuggestions(response.data || []);
        setActiveSuggestionIndex(-1); // Reset active suggestion
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        // Optionally show a toast error for suggestion fetching
        // toast.error("Could not load search suggestions.");
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQueryVal(query);
    debouncedFetchSuggestions(query);
  };

  // Click outside suggestions closes them
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
    // Escape key closes suggestions or search
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showSuggestions) {
          setShowSuggestions(false);
        }
        // If search is expanded and suggestions are already hidden, then close search
        // else if (isSearchExpanded) {
        //   setIsSearchExpanded(false);
        // }
      }
    };

    document.addEventListener('mousedown', handleClickOutsideSuggestions);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSuggestions);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showSuggestions, isSearchExpanded]); // Depend on isSearchExpanded too

  const handleLogout = async (e) => {
    e.preventDefault();
    setNavbarOpen(false); // Close mobile menu if open
    setIsSearchExpanded(false); // Close search if open
    setShowSuggestions(false);
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  const isActive = (href) => router.pathname === href;

  const toggleSearchExpansion = useCallback(() => {
    setIsSearchExpanded(prevIsSearchExpanded => {
      const nextIsSearchExpanded = !prevIsSearchExpanded;
      if (nextIsSearchExpanded) {
        setTimeout(() => searchInputRef.current?.focus(), 0); // Focus input when expanded
      } else {
        // Clear search query and hide suggestions when collapsing search
        setSearchQueryVal('');
        setShowSuggestions(false);
      }
      // If mobile menu is open and search is being expanded, close mobile menu
      if (navbarOpen && nextIsSearchExpanded) {
        setNavbarOpen(false);
      }
      return nextIsSearchExpanded;
    });
  }, [navbarOpen]); // Dependency on navbarOpen

  // Click outside search input/form (when expanded) closes the search
  useEffect(() => {
    const handleClickOutsideSearch = (event) => {
      if (!isSearchExpanded) return;

      const searchFormElement = searchInputRef.current?.closest('form'); // Get the form element
      // Check if click is outside the form AND outside the suggestions container
      const clickedOutsideSearchForm = searchFormElement && !searchFormElement.contains(event.target);
      const clickedOutsideSuggestions = !suggestionsContainerRef.current || !suggestionsContainerRef.current.contains(event.target);

      if (clickedOutsideSearchForm && clickedOutsideSuggestions) {
        setIsSearchExpanded(false); // Collapse search
      }
    };

    if (isSearchExpanded) { // Only add listener if search is expanded
      document.addEventListener('mousedown', handleClickOutsideSearch);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSearch);
    };
  }, [isSearchExpanded]); // Rerun when isSearchExpanded changes

  // Effect to clear search state when isSearchExpanded becomes false
  useEffect(() => {
    if (!isSearchExpanded) {
      setSearchQueryVal('');
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }, [isSearchExpanded]);


  const handleSearchSubmit = (e, queryOverride) => {
    if (e) e.preventDefault();
    const query = (typeof queryOverride === 'string' ? queryOverride : searchQueryVal).trim();

    if (query) {
      router.push(`/visible/search?q=${encodeURIComponent(query)}`);
      // setIsSearchExpanded(false); // Optionally close search on submit
      if (navbarOpen) setNavbarOpen(false); // Close mobile menu
    } else {
      toast.info("Please enter something to search.");
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQueryVal(suggestion.name); // Set input value to suggestion name
    // setShowSuggestions(false); // Hide suggestions
    handleSearchSubmit(null, suggestion.name); // Submit search with suggestion name
  };

  const handleKeyDownOnSearch = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      setActiveSuggestionIndex(-1); // Ensure no active suggestion if list is hidden/empty
      if (e.key === 'Enter') return; // Allow default form submission if no suggestions
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prevIndex => (prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault(); // Prevent form submission if selecting a suggestion
        handleSuggestionClick(suggestions[activeSuggestionIndex]);
      } else {
        // If enter is pressed but no suggestion is highlighted, let the form submit normally.
        // setShowSuggestions(false); // Optionally hide suggestions
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // --- Navbar conditional styling ---
  let navPlClass = "";
  let navPrClass = "";
  let navWidthClass = "";
  let navBackgroundShapeClass = "";

  if (isSearchExpanded) {
    navWidthClass = "w-11/12 md:w-5/6 lg:w-3/4 xl:w-2/3";
    navPlClass = "pl-6";
    navPrClass = isBladeOpen ? "pr-[calc(15rem+1.5rem)]" : "pr-6"; // blade offset + its own padding
    navBackgroundShapeClass = "bg-white shadow-xl rounded-xl";
  } else {
    navWidthClass = "w-auto";
    navPlClass = "pl-4";
    navPrClass = isBladeOpen ? "pr-[calc(15rem+2rem)]" : "pr-8"; // blade offset + its own padding
    navBackgroundShapeClass = (transparent && !scrolled && !navbarOpen)
      ? "bg-transparent"
      : "bg-white shadow-lg rounded-full";
  }
  // --- End Navbar conditional styling ---

  return (
    <nav
      className={`fixed top-0 mt-2 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${navWidthClass} ${navPlClass} ${navPrClass} ${navBackgroundShapeClass}`}
    >
      <div className={`container mx-auto py-3 flex items-center ${isSearchExpanded ? 'justify-between' : 'justify-center'}`}>
        {/* Logo - always visible, shrinks slightly if search expanded */}
        <div className={`${isSearchExpanded ? 'flex-shrink-0' : 'flex-shrink-0'}`}>
          <Link href="/">
            <div className="leading-relaxed py-2 px-4 whitespace-nowrap cursor-pointer inter-semi-bold text-ggreen text-2xl flex items-center gap-2">
              <Image src="/MainGift.png" alt="GiftDrive Logo" width={128} height={128} className="h-8 w-auto -mt-1" priority />
              <span className={`${isSearchExpanded && !navbarOpen ? 'hidden sm:inline' : 'inline'}`}>GiftDrive</span>
            </div>
          </Link>
        </div>

        {/* Desktop Search Bar Area */}
        <div className={`hidden lg:flex items-center relative ${isSearchExpanded ? 'flex-grow mx-4' : 'flex-shrink-0 mx-4'}`}>
          {isSearchExpanded ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <input
                ref={searchInputRef}
                type="search"
                value={searchQueryVal}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDownOnSearch}
                onFocus={() => searchQueryVal.trim() && suggestions.length > 0 && setShowSuggestions(true)} // Show suggestions on focus if query & suggestions exist
                placeholder="Search Drives & Organizations..."
                className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm px-4 py-2.5 pr-10 focus:ring-2 focus:ring-ggreen focus:border-transparent transition-all duration-300"
                autoComplete="off"
              />
              <button type="button" onClick={toggleSearchExpansion} className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 mr-1 text-gray-500 hover:text-ggreen" aria-label="Close search">
                <XMarkIcon className="h-5 w-5" />
              </button>
              {showSuggestions && isSearchExpanded && ( // Only show suggestions if search is expanded
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

        {/* Desktop User Actions & Cart - Conditionally hide if search is too expanded and not enough space? For now, always show. */}
        <div className={`hidden lg:flex items-center ${isSearchExpanded ? 'flex-shrink-0 space-x-2' : 'space-x-4'}`}>
          <ul className="flex flex-row list-none items-center space-x-1">
            {authStatus === "authenticated" && user && (
              <>
                <li className="flex items-center">
                  <Link href="/visible/profile">
                    <span className={`relative group text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen ${isActive('/visible/profile') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>
                      Account
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-full"></span>
                    </span>
                  </Link>
                </li>
                {!!user.is_org_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/dashboard">
                      <span className={`relative group text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen ${isActive('/admin/dashboard') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>
                        My Org Dashboard
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-full"></span>
                      </span>
                    </Link>
                  </li>
                )}
                {!!user.is_super_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/superAdmin">
                      <span className={`relative group text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen ${isActive('/admin/superAdmin') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>
                        Super Admin
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-full"></span>
                      </span>
                    </Link>
                  </li>
                )}
                <li className="flex items-center">
                  <button onClick={handleLogout} className="relative group text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen cursor-pointer bg-transparent border-none whitespace-nowrap">
                    Logout
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-full"></span>
                  </button>
                </li>
              </>
            )}
            {authStatus === "unauthenticated" && (
              <>
                <li className="flex items-center">
                  <Link href="/auth/login">
                    <span className={`relative group text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen ${isActive('/auth/login') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>
                      Login
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-full"></span>
                    </span>
                  </Link>
                </li>
                <li className="flex items-center">
                  <Link href="/auth/register">
                    <span className={`relative group text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen ${isActive('/auth/register') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>
                      Register
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-full"></span>
                    </span>
                  </Link>
                </li>
              </>
            )}
            {authStatus === "loading" && (
              <li className="flex items-center">
                <span className="text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-gray-500 whitespace-nowrap">Loading...</span>
              </li>
            )}
          </ul>
          {/* Buttons */}
          <div>
            <Link href="/visible/search">
              <button
                className="bg-ggreen text-white text-xs inter-regular uppercase px-3 py-2 rounded-full shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 whitespace-nowrap"
                type="button"
              >
                Browse Drives
              </button>
            </Link>
          </div>
          <div>
            <Link href="/visible/registerdrive">
              <button className="bg-white text-blueGray-700 active:bg-blueGray-50 text-xs inter-regular uppercase px-3 py-2 rounded-full shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 whitespace-nowrap" type="button">
                Create A Drive
              </button>
            </Link>
          </div>
          {/* Cart Icon */}
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


        {/* Mobile Menu Toggle & Cart */}
        <div className="lg:hidden flex items-center">
          {/* Mobile Cart Icon */}
          <Link href="/visible/cart" className="p-2 text-ggreen">
            <div className="relative">
              <FaShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] inter-regular leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
          </Link>
          {/* Mobile Menu Toggle Button */}
          <button
            className="text-ggreen cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block outline-none focus:outline-none"
            type="button"
            onClick={() => { setNavbarOpen(!navbarOpen); if (isSearchExpanded) setIsSearchExpanded(false); }}
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
            {showSuggestions && navbarOpen && ( // Only show if navbar (mobile menu) is open
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
          {/* Mobile Navigation Links */}
          <ul className="flex flex-col list-none py-2">
            {authStatus === "authenticated" && user && (
              <>
                <li className="flex items-center">
                  <Link href="/visible/profile">
                    <span className="relative group text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen w-full whitespace-nowrap">
                      Account
                      <span className="absolute bottom-1 left-4 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                    </span>
                  </Link>
                </li>
                {!!user.is_org_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/dashboard">
                      <span className="relative group text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen w-full whitespace-nowrap">
                        My Org Dashboard
                        <span className="absolute bottom-1 left-4 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                      </span>
                    </Link>
                  </li>
                )}
                {!!user.is_super_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/superAdmin">
                      <span className="relative group text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen w-full whitespace-nowrap">
                        Super Admin
                        <span className="absolute bottom-1 left-4 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                      </span>
                    </Link>
                  </li>
                )}
                <li className="flex items-center">
                  <button onClick={handleLogout} className="relative group text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen w-full text-left bg-transparent border-none whitespace-nowrap">
                    Logout
                    <span className="absolute bottom-1 left-4 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                  </button>
                </li>
              </>
            )}
            {authStatus === "unauthenticated" && (
              <>
                <li className="flex items-center">
                  <Link href="/auth/login">
                    <span className="relative group text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen w-full whitespace-nowrap">
                      Login
                      <span className="absolute bottom-1 left-4 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                    </span>
                  </Link>
                </li>
                <li className="flex items-center">
                  <Link href="/auth/register">
                    <span className="relative group text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen w-full whitespace-nowrap">
                      Register
                      <span className="absolute bottom-1 left-4 w-0 h-0.5 bg-ggreen transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                    </span>
                  </Link>
                </li>
              </>
            )}
            {authStatus === "loading" && (
              <li className="flex items-center">
                <span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-gray-500 w-full whitespace-nowrap">Loading...</span>
              </li>
            )}
            {/* Mobile Buttons */}
            <li className="flex items-center px-4 py-3">
              <Link href="/visible/search" className='w-full'>
                <button className="bg-ggreen text-white active:bg-teal-700 text-xs inter-regular uppercase px-4 py-3 rounded-full shadow hover:shadow-md outline-none focus:outline-none w-full whitespace-nowrap" type="button">
                  Browse Drives
                </button>
              </Link>
            </li>
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