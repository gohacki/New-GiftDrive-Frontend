// components/Cards/CardPieChart.js

import React, { useEffect, useRef } from "react";
import Chart from "chart.js";
import PropTypes from "prop-types";

export default function CardPieChart({ title, data, labels, colors }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart instance if it exists to prevent duplication
      chartRef.current.destroy();
    }

    const ctx = document.getElementById(`pie-chart-${title}`).getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors || ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
            hoverBackgroundColor: colors || ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#4a5568",
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed;
                const total = context.chart._metasets[context.datasetIndex].total;
                const percentage = ((value / total) * 100).toFixed(2);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, labels, colors, title]);

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
        <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full max-w-full flex-grow flex-1">
              <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
                {title}
              </h6>
              {/* Add more headers if needed */}
            </div>
          </div>
        </div>
        <div className="p-4 flex-auto">
          {/* Chart */}
          <div className="relative h-350-px">
            <canvas id={`pie-chart-${title}`}></canvas>
          </div>
        </div>
      </div>
    </>
  );
}

CardPieChart.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string),
};