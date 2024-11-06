// components/Headers/HeaderStats.js

import React, { useContext } from "react";
import CardStats from "components/Cards/CardStats.js";
import { StatisticsContext } from "../../contexts/StatisticsContext";

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
                    statSubtitle="Total Donees"
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
                    statSubtitle="Fully Gifted"
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
                    statSubtitle="Partially Gifted"
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
                    statSubtitle="Ungifted"
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

  // Calculate percentage changes (ensure previous month data is available)
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const totalKidsChange = calculatePercentageChange(
    statistics.totalKids,
    statistics.totalKidsLastMonth
  );
  const kidsFullyGiftedChange = calculatePercentageChange(
    statistics.kidsFullyGifted,
    statistics.kidsFullyGiftedLastMonth
  );
  const kidsPartiallyGiftedChange = calculatePercentageChange(
    statistics.kidsPartiallyGifted,
    statistics.kidsPartiallyGiftedLastMonth
  );
  const kidsUngiftedChange = calculatePercentageChange(
    statistics.kidsUngifted,
    statistics.kidsUngiftedLastMonth
  );

  return (
    <>
      {/* Header */}
      <div className="relative bg-blueGray-800 md:pt-32 pb-32 pt-12">
        <div className="px-4 md:px-10 mx-auto w-full">
          <div>
            <div className="flex flex-wrap">
              {/* Total Kids */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Total Donees"
                  statTitle={statistics.totalKids.toString()}
                  statArrow={totalKidsChange >= 0 ? "up" : "down"}
                  statPercent={Math.abs(totalKidsChange).toFixed(2)}
                  statPercentColor={
                    totalKidsChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron="Since last month"
                  statIconName="fas fa-users"
                  statIconColor="bg-red-500"
                />
              </div>
              {/* Kids Fully Gifted */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Fully Gifted"
                  statTitle={statistics.kidsFullyGifted.toString()}
                  statArrow={kidsFullyGiftedChange >= 0 ? "up" : "down"}
                  statPercent={Math.abs(kidsFullyGiftedChange).toFixed(2)}
                  statPercentColor={
                    kidsFullyGiftedChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron="Since last month"
                  statIconName="fas fa-check-circle"
                  statIconColor="bg-emerald-500"
                />
              </div>
              {/* Kids Partially Gifted */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Partially Gifted"
                  statTitle={statistics.kidsPartiallyGifted.toString()}
                  statArrow={kidsPartiallyGiftedChange >= 0 ? "up" : "down"}
                  statPercent={Math.abs(kidsPartiallyGiftedChange).toFixed(2)}
                  statPercentColor={
                    kidsPartiallyGiftedChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron="Since last month"
                  statIconName="fas fa-exclamation-triangle"
                  statIconColor="bg-yellow-500"
                />
              </div>
              {/* Kids Ungifted */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Ungifted"
                  statTitle={statistics.kidsUngifted.toString()}
                  statArrow={kidsUngiftedChange >= 0 ? "up" : "down"}
                  statPercent={Math.abs(kidsUngiftedChange).toFixed(2)}
                  statPercentColor={
                    kidsUngiftedChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron="Since last month"
                  statIconName="fas fa-times-circle"
                  statIconColor="bg-red-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}