// src/components/Navbars/AuthNavbar.js
import React, { useContext, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FaShoppingCart } from 'react-icons/fa';
import { CartContext } from '../../contexts/CartContext';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

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
      setIsSearchExpanded(false);
      setSearchQueryVal('');
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    setNavbarOpen(false);
    setIsSearchExpanded(false);
    router.push('/');
  };

  const isActive = (href) => router.pathname === href;

  const toggleSearchExpansion = () => {
    setIsSearchExpanded(prev => {
      const nextState = !prev;
      if (nextState) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        setSearchQueryVal('');
      }
      if (navbarOpen && nextState) {
        setNavbarOpen(false);
      }
      return nextState;
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQueryVal.trim()) {
      console.log("Searching for:", searchQueryVal);
      toast.info(`Search functionality for "${searchQueryVal}" is not yet implemented.`);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 z-50 w-full 
                 transition-all duration-300 ease-in-out
                 ${(transparent && !scrolled && !navbarOpen && !isSearchExpanded) ? 'bg-transparent' : 'bg-secondary_green shadow-lg'}
                 ${isBladeOpen ? 'pr-[15rem]' : 'pr-0'}`}
    >
      <div className="container mx-auto px-4 py-3 flex items-center">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <Link href="/">
            <div className="leading-relaxed py-2 whitespace-nowrap cursor-pointer inter-semi-bold text-ggreen text-2xl flex items-center gap-2">
              <Image
                src="/MainGift.png"
                alt="GiftDrive Logo"
                width={128}
                height={128}
                className="h-8 w-auto -mt-1"
                priority
              />
              GiftDrive
            </div>
          </Link>
        </div>

        {/* Desktop: Search Area - Positioned after logo */}
        <div className={`hidden lg:flex items-center mx-4 ${isSearchExpanded ? 'flex-grow' : 'flex-shrink-0'}`}>
          {isSearchExpanded ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-lg">
              <input
                ref={searchInputRef}
                type="search"
                value={searchQueryVal}
                onChange={(e) => setSearchQueryVal(e.target.value)}
                placeholder="Search Drives & Organizations..."
                className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm px-4 py-2.5 pr-10 focus:ring-2 focus:ring-ggreen focus:border-transparent transition-all duration-300"
              />
              <button type="button" onClick={toggleSearchExpansion} className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 mr-1 text-gray-500 hover:text-ggreen" aria-label="Close search">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </form>
          ) : (
            <button onClick={toggleSearchExpansion} className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-1.5 text-sm text-gray-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ggreen focus:border-transparent transition-all duration-200 w-48 h-[2.375rem] flex-shrink-0" aria-label="Open search">
              <MagnifyingGlassIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="text-xs truncate">Search...</span>
            </button>
          )}
        </div>

        {/* Desktop: Navigation Links Group - This will grow and center if search is not expanded */}
        <div className={`hidden lg:flex flex-grow items-center ${isSearchExpanded ? 'lg:hidden' : 'justify-center'}`}> {/* Key change: justify-center when visible */}
          <ul className="flex flex-row list-none items-center space-x-1">
            <li className="flex items-center">
              <Link href="/visible/orglist"><span className={`text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow ${isActive('/visible/orglist') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>Browse Organizations</span></Link>
            </li>
            <li className="flex items-center">
              <Link href="/visible/drivelist"><span className={`text-sm inter-regular uppercase px-2.5 py-2 flex items-center text-ggreen hover:text-gyellow ${isActive('/visible/drivelist') ? 'text-blueGray-300' : ''} whitespace-nowrap`}>Browse Drives</span></Link>
            </li>
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
        </div>


        {/* Far Right Group: Create Drive, Cart (Desktop), Mobile Toggle */}
        {/* This group now has ml-auto only if search is NOT expanded, to allow nav links to center */}
        <div className={`flex items-center flex-shrink-0 ${isSearchExpanded ? 'ml-auto lg:hidden' : 'lg:ml-auto'}`}>
          {/* Create Drive Button - Desktop only */}
          <div className={`hidden lg:flex items-center mr-2 flex-shrink-0 ${isSearchExpanded ? 'lg:hidden' : ''}`}>
            <Link href="/visible/registerdrive">
              <button className="bg-white text-blueGray-700 active:bg-blueGray-50 text-xs inter-regular uppercase px-3 py-2 rounded-full shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150 whitespace-nowrap" type="button">
                Create A Drive
              </button>
            </Link>
          </div>
          {/* Desktop Cart Icon - Desktop only */}
          <div className={`navbar-cart items-center hidden lg:flex flex-shrink-0 mr-2 ${isSearchExpanded ? 'lg:hidden' : ''}`}>
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

          {/* Mobile Toggles (Cart and Hamburger) - Always at the far right visually for mobile */}
          <div className="lg:hidden flex items-center"> {/* Removed ml-auto here as the parent now handles it */}
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
              onClick={() => { setNavbarOpen(!navbarOpen); if (isSearchExpanded) setIsSearchExpanded(false); }}
              aria-label="Toggle navigation menu"
            >
              {navbarOpen ? <XMarkIcon className="h-6 w-6" /> : <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {navbarOpen && (
        <div className="lg:hidden bg-secondary_green shadow-lg">
          <form onSubmit={handleSearchSubmit} className="p-4 border-b border-gray-200">
            <div className="relative flex items-center">
              <input type="search" value={searchQueryVal} onChange={(e) => setSearchQueryVal(e.target.value)} placeholder="Search..." className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-full px-4 py-2 pr-10 focus:ring-2 focus:ring-ggreen focus:border-transparent" />
              <button type="submit" className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-ggreen" aria-label={searchQueryVal ? "Clear search" : "Search"}>
                {searchQueryVal ? <XMarkIcon className="h-5 w-5" onClick={() => setSearchQueryVal('')} /> : <MagnifyingGlassIcon className="h-5 w-5" />}
              </button>
            </div>
          </form>
          <ul className="flex flex-col list-none py-2">
            <li className="flex items-center"><Link href="/visible/orglist"><span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full whitespace-nowrap">Browse Organizations</span></Link></li>
            <li className="flex items-center"><Link href="/visible/drivelist"><span className="text-sm inter-regular uppercase px-4 py-3 flex items-center text-ggreen hover:text-gyellow w-full whitespace-nowrap">Browse Drives</span></Link></li>
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