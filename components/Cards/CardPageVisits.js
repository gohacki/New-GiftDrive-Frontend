// components/Cards/CardPageVisits.js

import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { AuthContext } from "../../contexts/AuthContext";

export default function CardPageVisits({ apiUrl }) {
  const [pageVisits, setPageVisits] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchPageVisits = async () => {
      try {
        if (user && user.org_id) {
          const response = await axios.get(`${apiUrl}/api/analytics/page-visits`, {
            params: {
              org_id: user.org_id,
            },
            withCredentials: true,
          });
          setPageVisits(response.data);
        }
      } catch (error) {
        console.error("Error fetching page visits:", error);
      }
    };

    fetchPageVisits();
  }, [apiUrl, user]);

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
        <div className="rounded-t mb-0 px-4 py-3 border-0">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 className="font-semibold text-base text-blueGray-700">Page Visits</h3>
            </div>
          </div>
        </div>
        <div className="block w-full overflow-x-auto">
          {/* Page Visits table */}
          <table className="items-center w-full bg-transparent border-collapse">
            <thead>
              <tr>
                <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                  Page Name
                </th>
                <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                  Visitors
                </th>
                <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                  Unique Users
                </th>
              </tr>
            </thead>
            <tbody>
              {pageVisits.length > 0 ? (
                pageVisits.map((visit) => (
                  <tr key={visit.pageName}>
                    <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                      {visit.pageName}
                    </th>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                      {visit.visitors}
                    </td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                      {visit.uniqueUsers}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center"
                  >
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

CardPageVisits.propTypes = {
  apiUrl: PropTypes.string.isRequired,
};