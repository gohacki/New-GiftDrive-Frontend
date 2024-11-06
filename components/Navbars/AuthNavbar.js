// src/components/Navbars/AdminNavbar.js

import React, { useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FaShoppingCart } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  // Handle scroll event to toggle navbar background
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);

    // Clean up the event listener
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close navbar when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setNavbarOpen(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    setNavbarOpen(false); // Close navbar after logout
    router.push('/'); // Redirect to homepage after logout
  };

  // Determine active link
  const isActive = (href) => router.pathname === href;

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
        scrolled || navbarOpen ? 'bg-blueGray-800 shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
        {/* Brand and Toggle Button */}
        <div className="flex justify-between w-full lg:w-auto">
          <Link href="/">
            <div className="flex items-center text-white text-sm font-bold leading-relaxed mr-4 py-2 whitespace-nowrap uppercase cursor-pointer">
              <Image
                src="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/GiftDriveLogo.png"
                alt="GiftDrive Logo"
                width={24}
                height={24}
                className="inline-block h-6 w-6 mr-2"
              />
              GiftDrive
            </div>
          </Link>
          <button
            className="text-white cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block lg:hidden outline-none focus:outline-none"
            type="button"
            onClick={() => setNavbarOpen(!navbarOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={navbarOpen}
            aria-controls="navbar-menu"
          >
            {/* Hamburger Icon */}
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {navbarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Navbar Links */}
        <div
          className={`lg:flex flex-grow items-center transition-all duration-300 ease-in-out ${
            navbarOpen ? 'block bg-blueGray-800 lg:bg-transparent' : 'hidden'
          }`}
          id="navbar-menu"
        >
          <ul className="flex flex-col lg:flex-row list-none lg:ml-auto">
            <li className="flex items-center">
              <Link href="/visible/orglist">
                <span
                  className={`text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 ${
                    isActive('/visible/orglist') ? 'text-blueGray-300' : ''
                  }`}
                >
                  Browse all Organizations
                </span>
              </Link>
            </li>

            {user && (
              <>
                <li className="flex items-center">
                  <Link href="/visible/profile">
                    <span
                      className={`text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 ${
                        isActive('/visible/profile') ? 'text-blueGray-300' : ''
                      }`}
                    >
                      Account
                    </span>
                  </Link>
                </li>

                {user.is_org_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/dashboard">
                      <span
                        className={`text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 ${
                          isActive('/admin/dashboard') ? 'text-blueGray-300' : ''
                        }`}
                      >
                        My Organization Dashboard
                      </span>
                    </Link>
                  </li>
                )}

                {/* Super Admin Link */}
                {user.is_super_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/superAdmin">
                      <span
                        className={`text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 ${
                          isActive('/admin/superAdmin') ? 'text-blueGray-300' : ''
                        }`}
                      >
                        Super Admin
                      </span>
                    </Link>
                  </li>
                )}

                <li className="flex items-center">
                  <button
                    onClick={handleLogout}
                    className="text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 cursor-pointer bg-transparent border-none"
                  >
                    Logout
                  </button>
                </li>
              </>
            )}

            {!user && (
              <>
                <li className="flex items-center">
                  <Link href="/auth/login">
                    <span
                      className={`text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 ${
                        isActive('/auth/login') ? 'text-blueGray-300' : ''
                      }`}
                    >
                      Login
                    </span>
                  </Link>
                </li>
                <li className="flex items-center">
                  <Link href="/auth/register">
                    <span
                      className={`text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 ${
                        isActive('/auth/register') ? 'text-blueGray-300' : ''
                      }`}
                    >
                      Register
                    </span>
                  </Link>
                </li>
              </>
            )}

            {user?.is_org_admin && (
              <li className="flex items-center">
                <Link href="/visible/registerorg">
                  <span className="text-sm font-bold uppercase px-3 py-2 flex items-center">
                    <button
                      className="bg-white text-blueGray-700 active:bg-blueGray-50 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                      type="button"
                    >
                      Enroll Your Org Now
                    </button>
                  </span>
                </Link>
              </li>
            )}

            {/* Cart Icon for Small Screens */}
            <li className="flex items-center lg:hidden">
              <Link href="/visible/cart">
                <span
                  className={`text-sm font-bold uppercase px-3 py-2 flex items-center text-white hover:text-blueGray-200 ${
                    isActive('/visible/cart') ? 'text-blueGray-300' : ''
                  }`}
                >
                  <FaShoppingCart className="h-6 w-6 mr-1" /> Cart
                </span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Cart Icon for Large Screens */}
        <div className="navbar-cart flex items-center hidden lg:flex">
          <Link href="/visible/cart">
            <span className="flex items-center">
              <FaShoppingCart className="h-6 w-6 text-white" />
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;