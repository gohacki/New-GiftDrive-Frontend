// src/components/Sidebar.js

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaBars, FaTimes, FaEdit, FaBullhorn, FaHistory, FaChartLine, FaQuestionCircle } from "react-icons/fa"; // Importing icons
import Image from 'next/image'; // Import Next.js Image component


const Sidebar = () => {
  const [collapseShow, setCollapseShow] = useState("hidden");
  const router = useRouter();

  // Define your admin sections with corresponding routes and icons
  const adminSections = [
    {
      name: "Drive Statistics",
      href: "/admin/dashboard",
      icon: <FaChartLine className="mr-2 text-sm" />,
    },
    {
      name: "Edit Organization Info",
      href: "/admin/editOrgInfo",
      icon: <FaEdit className="mr-2 text-sm" />,
    },
    {
      name: "Current Drives",
      href: "/admin/currentDrives",
      icon: <FaBullhorn className="mr-2 text-sm" />,
    },
    {
      name: "Future Drives",
      href: "/admin/futureDrives",
      icon: <FaHistory className="mr-2 text-sm" />,
    },
    {
      name: "Past Drives",
      href: "/admin/pastDrives",
      icon: <FaHistory className="mr-2 text-sm" />,
    },
    {
      name: "Help Page",
      href: "/admin/help",
      icon: <FaQuestionCircle className="mr-2 text-sm" />,
    },
  ];

  return (
    <>
      <nav className="md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between relative md:w-64 z-10 py-4 px-6">
        <div className="md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-wrap items-center justify-between w-full mx-auto">

          {/* Toggler */}
          <button
            className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
            type="button"
            onClick={() => setCollapseShow("bg-white m-2 py-3 px-6")}
          >
            <FaBars />
          </button>

          {/* Brand */}
          <Link href="/" className="text-black text-sm font-bold leading-relaxed py-2 whitespace-nowrap uppercase flex items-center">
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

          {/* User Dropdown (Optional) */}
          {/* If you have user-related dropdowns, you can include them here */}
          {/* <ul className="md:hidden items-center flex flex-wrap list-none">
            <li className="inline-block relative">
              <NotificationDropdown />
            </li>
            <li className="inline-block relative">
              <UserDropdown />
            </li>
          </ul> */}

          {/* Collapse */}
          <div
            className={
              "md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded " +
              collapseShow
            }
          >
            {/* Collapse header */}
            <div className="md:min-w-full md:hidden block pb-4 mb-4 border-b border-solid border-slate-200">
              <div className="flex flex-wrap">
                <div className="w-6/12">
                  <Link
                    href="/"
                    className="md:block text-left md:pb-2 text-slate-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
                  >
                    Organization Dashboard
                  </Link>
                </div>
                <div className="w-6/12 flex justify-end">
                  <button
                    type="button"
                    className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
                    onClick={() => setCollapseShow("hidden")}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            </div>

            {/* Form (Optional) */}
            {/* If you need a search form within the sidebar on mobile, include it here */}
            {/* <form className="mt-6 mb-4 md:hidden">
              <div className="mb-3 pt-0">
                <input
                  type="text"
                  placeholder="Search"
                  className="border-0 px-3 py-2 h-12 border border-solid  border-slate-500 placeholder-slate-300 text-slate-600 bg-white rounded text-base leading-snug shadow-none outline-none focus:outline-none w-full font-normal"
                />
              </div>
            </form> */}

            {/* Divider */}
            <hr className="my-4 md:min-w-full" />

            {/* Heading */}
            <h6 className="md:min-w-full text-slate-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline">
              Admin Sections
            </h6>

            {/* Navigation */}
            <ul className="md:flex-col md:min-w-full flex flex-col list-none">
              {adminSections.map((section) => (
                <li className="items-center" key={section.name}>
                  <Link
                    href={section.href}
                    className={
                      "text-xs uppercase py-3 font-bold block " +
                      (router.pathname === section.href
                        ? "text-sky-500 hover:text-sky-600"
                        : "text-slate-700 hover:text-slate-500")
                    }
                  >
                    {section.icon}
                    {section.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Optional: Additional Sections */}
            {/* If you have more sections or nested navigation, include them here */}

          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;