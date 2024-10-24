// components/Navbar.js

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Image from 'next/image'; // Import Next.js Image component
import { FaShoppingCart } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [navbarOpen, setNavbarOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    setNavbarOpen(false); // Close navbar after logout
    router.push('/'); // Redirect to homepage after logout
  };

  return (
    <nav className="top-0 fixed z-50 w-full flex flex-wrap items-center justify-between px-2 py-3 navbar-expand-lg">
      <div className="container px-4 mx-auto flex flex-wrap items-center justify-between">
        {/* Brand and Toggle Button */}
        <div className="w-full relative flex justify-between lg:w-auto lg:static lg:block lg:justify-start">
          {/* Brand Logo */}
          <Link href="/" className="text-white text-sm font-bold leading-relaxed inline-block mr-4 py-2 whitespace-nowrap uppercase flex items-center">
            {/* Next.js Image component for optimization */}
            <Image
              src="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/GiftDriveLogo.png"
              alt="GiftDrive Logo"
              width={24}
              height={24}
              className="inline-block h-6 w-6 mr-2"
            />
            GiftDrive
          </Link>
          {/* Hamburger Menu Button */}
          <button
            className="cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block lg:hidden outline-none focus:outline-none"
            type="button"
            onClick={() => setNavbarOpen(!navbarOpen)}
            aria-expanded={navbarOpen}
            aria-controls="navbar-menu"
          >
            <i className="text-white fas fa-bars"></i>
          </button>
        </div>
        {/* Navbar Links */}
        <div
          className={
            "lg:flex flex-grow items-center bg-blueGray-800 lg:bg-opacity-0 lg:shadow-none" +
            (navbarOpen ? " block rounded shadow-lg" : " hidden")
          }
          id="navbar-menu"
        >
          <ul className="flex flex-col lg:flex-row list-none lg:ml-auto">
            {/* Browse all Organizations */}
            <li className="flex items-center">
              <Link href="/visible/OrganizationList" className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center text-white hover:text-blueGray-200">
                Browse all Organizations
              </Link>
            </li>

            {/* Conditional Links for Authenticated Users */}
            {user ? (
              <>
                {/* Account */}
                <li className="flex items-center">
                  <Link href="/visible/profile" className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center text-white hover:text-blueGray-200">
                    Account
                  </Link>
                </li>

                {/* Organization Dashboard (if org admin) */}
                {user.is_org_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/dashboard" className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center text-white hover:text-blueGray-200">
                      My Organization Dashboard
                    </Link>
                  </li>
                )}

                {/* Super Admin (if super admin) */}
                {user.is_super_admin && (
                  <li className="flex items-center">
                    <Link href="/admin/superAdmin" className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center text-white hover:text-blueGray-200">
                      Super Admin
                    </Link>
                  </li>
                )}

                {/* Logout */}
                <li className="flex items-center">
                  <button
                    onClick={handleLogout}
                    className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center text-white hover:text-blueGray-200 cursor-pointer bg-transparent border-none"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                {/* Login */}
                <li className="flex items-center">
                  <Link href="/auth/login" className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center text-white hover:text-blueGray-200">
                    Login
                  </Link>
                </li>
                {/* Register */}
                <li className="flex items-center">
                  <Link href="/auth/register" className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center text-white hover:text-blueGray-200">
                    Register
                  </Link>
                </li>
              </>
            )}

            {/* Enroll Your Org Now Button */}
            {user && user.is_org_admin && (
              <li className="flex items-center">
                <Link href="/visible/registerorg" className="text-sm font-bold uppercase px-3 py-4 lg:py-2 flex items-center">
                  <button
                    className="bg-white text-blueGray-700 active:bg-blueGray-50 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
                    type="button"
                  >
                    Enroll Your Org Now
                  </button>
                </Link>
              </li>
            )}
          </ul>
        </div>
        {/* Cart Icon */}
        <div className="navbar-cart flex items-center">
          <Link href="/cart" className="flex items-center">
            <FaShoppingCart
              src="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/cart1.png"
              alt="Cart"
              width={24}
              height={24}
              className="h-6 w-6 text-white"
            />
            {/* Optional: Add a badge or item count next to the cart icon */}
            {/* <span className="ml-1 text-white">3</span> */}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;