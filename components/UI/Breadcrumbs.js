// src/components/UI/Breadcrumbs.js

import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

const Breadcrumbs = ({ links }) => {
  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {links.map((link, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-6 h-6 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <Link href={link.href} passHref
            className={`text-sm font-medium ${
                index === links.length - 1
                  ? 'text-gray-500'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
              aria-current={index === links.length - 1 ? 'page' : undefined}>
                {link.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
};

Breadcrumbs.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default Breadcrumbs;