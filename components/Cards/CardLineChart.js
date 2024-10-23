// components/Cards/CardLineChart.js

import React, { useEffect, useRef } from "react";
import Chart from "chart.js";
import PropTypes from "prop-types";

export default function CardLineChart({ title, subtitle, data, labels, borderColor, backgroundColor }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart instance if it exists to prevent duplication
      chartRef.current.destroy();
    }

    const ctx = document.getElementById(`line-chart-${title}`).getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: subtitle,
            data: data,
            fill: false,
            borderColor: borderColor || "#4c51bf",
            backgroundColor: backgroundColor || "#4c51bf",
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "#fff",
            },
            position: "bottom",
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#fff",
            },
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              color: "#fff",
            },
            grid: {
              color: "rgba(255,255,255,0.2)",
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
  }, [data, labels, borderColor, backgroundColor, title, subtitle]);

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
        <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full max-w-full flex-grow flex-1">
              <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
                {subtitle}
              </h6>
              <h2 className="text-blueGray-700 text-xl font-semibold">
                {title}
              </h2>
            </div>
          </div>
        </div>
        <div className="p-4 flex-auto">
          {/* Chart */}
          <div className="relative h-350-px">
            <canvas id={`line-chart-${title}`}></canvas>
          </div>
        </div>
      </div>
    </>
  );
}

CardLineChart.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  borderColor: PropTypes.string,
  backgroundColor: PropTypes.string,
};