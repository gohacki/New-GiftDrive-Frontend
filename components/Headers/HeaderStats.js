// components/Headers/HeaderStats.js

import React, { useContext } from "react";
import CardStats from "components/Cards/CardStats.js";
import { StatisticsContext } from "../../contexts/StatisticsContext";

export default function HeaderStats() {
  const { statistics } = useContext(StatisticsContext);

  // Helper function to safely get a value or default to 0
  const getStatValue = (value) => (value !== undefined && value !== null ? Number(value) : 0);

  // Calculate percentage changes
  const calculatePercentageChange = (current, previous) => {
    const currentVal = getStatValue(current);
    const previousVal = getStatValue(previous);

    if (previousVal === 0) {
      return currentVal > 0 ? 100 : 0; // From 0 to positive is 100% increase, 0 to 0 is 0%
    }
    return ((currentVal - previousVal) / previousVal) * 100;
  };

  // Loading state: Render placeholders if statistics are not yet available
  if (!statistics) {
    const placeholderStats = [
      { subtitle: "Total Donees", icon: "fas fa-users", color: "bg-red-500" },
      { subtitle: "Fully Gifted", icon: "fas fa-check-circle", color: "bg-emerald-500" },
      { subtitle: "Partially Gifted", icon: "fas fa-exclamation-triangle", color: "bg-yellow-500" },
      { subtitle: "Not Gifted", icon: "fas fa-times-circle", color: "bg-red-500" },
    ];
    return (
      <div className="relative bg-blueGray-800 md:pt-32 pb-32 pt-12">
        <div className="px-4 md:px-10 mx-auto w-full">
          <div className="flex flex-wrap">
            {placeholderStats.map((stat, index) => (
              <div key={index} className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle={stat.subtitle}
                  statTitle="Loading..."
                  statArrow="up"
                  statPercent="0.00"
                  statPercentColor="text-blueGray-400"
                  statDescripiron="Fetching data..."
                  statIconName={stat.icon}
                  statIconColor={stat.color}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Safely access statistics values, defaulting to 0 if undefined
  // Note: The dashboard.js now provides `totalKidsInActiveDrives`, `kidsFullyGifted` etc.
  // The `...LastMonth` fields are not yet provided by the backend, so they will default to 0.
  const totalKidsCurrent = getStatValue(statistics.totalKidsInActiveDrives);
  const totalKidsPrev = getStatValue(statistics.totalKidsLastMonth);

  const fullyGiftedCurrent = getStatValue(statistics.kidsFullyGifted);
  const fullyGiftedPrev = getStatValue(statistics.kidsFullyGiftedLastMonth);

  const partiallyGiftedCurrent = getStatValue(statistics.kidsPartiallyGifted);
  const partiallyGiftedPrev = getStatValue(statistics.kidsPartiallyGiftedLastMonth);

  const ungiftedCurrent = getStatValue(statistics.kidsUngifted);
  const ungiftedPrev = getStatValue(statistics.kidsUngiftedLastMonth);

  const totalKidsChange = calculatePercentageChange(totalKidsCurrent, totalKidsPrev);
  const kidsFullyGiftedChange = calculatePercentageChange(fullyGiftedCurrent, fullyGiftedPrev);
  const kidsPartiallyGiftedChange = calculatePercentageChange(partiallyGiftedCurrent, partiallyGiftedPrev);
  const kidsUngiftedChange = calculatePercentageChange(ungiftedCurrent, ungiftedPrev);

  const getStatDescription = (current, previous) => {
    if (getStatValue(previous) !== 0) return "Since last month";
    if (getStatValue(current) === 0 && getStatValue(previous) === 0) return "No activity";
    return "Compared to 0 last month";
  };

  const getStatPercentDisplay = (current, previous, change) => {
    if (getStatValue(previous) === 0 && getStatValue(current) === 0) return "0.00";
    return Math.abs(change).toFixed(2);
  }

  return (
    <>
      {/* Header */}
      <div className="relative bg-blueGray-800 md:pt-32 pb-32 pt-12">
        <div className="px-4 md:px-10 mx-auto w-full">
          <div>
            <div className="flex flex-wrap">
              {/* Total Donees */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Total Donees (Active Drives)"
                  statTitle={totalKidsCurrent.toString()}
                  statArrow={totalKidsChange >= 0 ? "up" : "down"}
                  statPercent={getStatPercentDisplay(totalKidsCurrent, totalKidsPrev, totalKidsChange)}
                  statPercentColor={
                    totalKidsChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron={getStatDescription(totalKidsCurrent, totalKidsPrev)}
                  statIconName="fas fa-users"
                  statIconColor="bg-red-500"
                />
              </div>
              {/* Fully Gifted */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Fully Gifted (Active Drives)"
                  statTitle={fullyGiftedCurrent.toString()}
                  statArrow={kidsFullyGiftedChange >= 0 ? "up" : "down"}
                  statPercent={getStatPercentDisplay(fullyGiftedCurrent, fullyGiftedPrev, kidsFullyGiftedChange)}
                  statPercentColor={
                    kidsFullyGiftedChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron={getStatDescription(fullyGiftedCurrent, fullyGiftedPrev)}
                  statIconName="fas fa-check-circle"
                  statIconColor="bg-emerald-500"
                />
              </div>
              {/* Partially Gifted */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Partially Gifted (Active Drives)"
                  statTitle={partiallyGiftedCurrent.toString()}
                  statArrow={kidsPartiallyGiftedChange >= 0 ? "up" : "down"}
                  statPercent={getStatPercentDisplay(partiallyGiftedCurrent, partiallyGiftedPrev, kidsPartiallyGiftedChange)}
                  statPercentColor={
                    kidsPartiallyGiftedChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron={getStatDescription(partiallyGiftedCurrent, partiallyGiftedPrev)}
                  statIconName="fas fa-exclamation-triangle"
                  statIconColor="bg-yellow-500"
                />
              </div>
              {/* Not Gifted */}
              <div className="w-full sm:w-6/12 lg:w-3/12 px-4">
                <CardStats
                  statSubtitle="Not Gifted (Active Drives)"
                  statTitle={ungiftedCurrent.toString()}
                  statArrow={kidsUngiftedChange >= 0 ? "up" : "down"}
                  statPercent={getStatPercentDisplay(ungiftedCurrent, ungiftedPrev, kidsUngiftedChange)}
                  statPercentColor={
                    kidsUngiftedChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }
                  statDescripiron={getStatDescription(ungiftedCurrent, ungiftedPrev)}
                  statIconName="fas fa-times-circle"
                  statIconColor="bg-orange-500" // Changed color for better distinction
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}