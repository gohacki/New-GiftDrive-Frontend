// components/Cards/CardSocialTraffic.js

import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { AuthContext } from "../../contexts/AuthContext";

export default function CardSocialTraffic({ apiUrl }) {
  const [socialTraffic, setSocialTraffic] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchSocialTraffic = async () => {
      try {
        if (user && user.org_id) {
          const response = await axios.get(`${apiUrl}/api/analytics/social-traffic`, {
            params: {
              org_id: user.org_id,
            },
            withCredentials: true,
          });
          setSocialTraffic(response.data);
        }
      } catch (error) {
        console.error("Error fetching social traffic:", error);
      }
    };

    fetchSocialTraffic();
  }, [apiUrl, user]);

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
        <div className="rounded-t mb-0 px-4 py-3 border-0">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 className="font-semibold text-base text-blueGray-700">Social Traffic</h3>
            </div>
          </div>
        </div>
        <div className="block w-full overflow-x-auto">
          {/* Social Traffic table */}
          <table className="items-center w-full bg-transparent border-collapse">
            <thead>
              <tr>
                <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                  Source
                </th>
                <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                  Visitors
                </th>
                <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              {socialTraffic.length > 0 ? (
                socialTraffic.map((source) => (
                  <tr key={source.platform}>
                    <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                      {source.platform}
                    </th>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                      {source.visitors}
                    </td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                      <div className="flex items-center">
                        <span className="mr-2">{source.percentage}%</span>
                        <div className="relative w-full">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div
                              style={{ width: `${source.percentage}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                            ></div>
                          </div>
                        </div>
                      </div>
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

CardSocialTraffic.propTypes = {
  apiUrl: PropTypes.string.isRequired,
};