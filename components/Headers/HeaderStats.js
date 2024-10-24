// components/Headers/HeaderStats.js

import React, { useContext } from "react";
import CardStats from "components/Cards/CardStats.js";
import { StatisticsContext } from "../../contexts/StatisticsContext"; // Adjust the path as necessary

export default function HeaderStats() {
  const { statistics } = useContext(StatisticsContext);

  if (!statistics) {
    // Optionally, you can return a loading indicator or placeholders
    return (
      <div className="relative bg-blueGray-800 md:pt-32 pb-32 pt-12">
        <div className="px-4 md:px-10 mx-auto w-full">
          <div className="flex flex-wrap">
            <div className="w-full px-4">
              <div className="flex flex-wrap">
                {/* Total Kids */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Total Kids"
                    statTitle="Loading..."
                    statArrow="up"
                    statPercent="0.00"
                    statPercentColor="text-emerald-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-users"
                    statIconColor="bg-red-500"
                  />
                </div>
                {/* Kids Fully Gifted */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Kids Fully Gifted"
                    statTitle="Loading..."
                    statArrow="up"
                    statPercent="0.00"
                    statPercentColor="text-emerald-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-check-circle"
                    statIconColor="bg-emerald-500"
                  />
                </div>
                {/* Kids Partially Gifted */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Kids Partially Gifted"
                    statTitle="Loading..."
                    statArrow="down"
                    statPercent="0.00"
                    statPercentColor="text-red-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-exclamation-triangle"
                    statIconColor="bg-yellow-500"
                  />
                </div>
                {/* Kids Ungifted */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Kids Ungifted"
                    statTitle="Loading..."
                    statArrow="down"
                    statPercent="0.00"
                    statPercentColor="text-red-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-times-circle"
                    statIconColor="bg-red-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="relative bg-blueGray-800 md:pt-32 pb-32 pt-12">
        <div className="px-4 md:px-10 mx-auto w-full">
          <div className="flex flex-wrap">
            {/* Statistical Overview */}
            <div className="w-full px-4">
              <div className="flex flex-wrap">
                {/* Total Kids */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Total Kids"
                    statTitle={statistics.totalKids}
                    statArrow="up"
                    statPercent="3.48"
                    statPercentColor="text-emerald-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-users"
                    statIconColor="bg-red-500"
                  />
                </div>
                {/* Kids Fully Gifted */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Kids Fully Gifted"
                    statTitle={statistics.kidsFullyGifted}
                    statArrow="up"
                    statPercent="1.10"
                    statPercentColor="text-emerald-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-check-circle"
                    statIconColor="bg-emerald-500"
                  />
                </div>
                {/* Kids Partially Gifted */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Kids Partially Gifted"
                    statTitle={statistics.kidsPartiallyGifted}
                    statArrow="down"
                    statPercent="0.80"
                    statPercentColor="text-red-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-exclamation-triangle"
                    statIconColor="bg-yellow-500"
                  />
                </div>
                {/* Kids Ungifted */}
                <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                  <CardStats
                    statSubtitle="Kids Ungifted"
                    statTitle={statistics.kidsUngifted}
                    statArrow="down"
                    statPercent="2.34"
                    statPercentColor="text-red-500"
                    statDescripiron="Since last month"
                    statIconName="fas fa-times-circle"
                    statIconColor="bg-red-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}