// components/Cards/CardBarChart.js

import React, { useEffect, useRef } from "react";
import Chart from "chart.js";
import PropTypes from "prop-types";

export default function CardBarChart({ title, subtitle, data, labels, backgroundColor }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart instance if it exists to prevent duplication
      chartRef.current.destroy();
    }

    const ctx = document.getElementById(`bar-chart-${title}`).getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: subtitle,
            data: data,
            backgroundColor: backgroundColor || "#ed64a6",
            borderColor: backgroundColor || "#ed64a6",
            borderWidth: 1,
            barThickness: 8,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "rgba(0,0,0,.4)",
            },
            align: "end",
            position: "bottom",
          },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: function (context) {
                return `$${context.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            display: false,
            grid: {
              display: false,
            },
          },
          y: {
            display: true,
            ticks: {
              color: "rgba(0,0,0,.4)",
            },
            grid: {
              borderDash: [2],
              borderDashOffset: [2],
              color: "rgba(33, 37, 41, 0.3)",
              zeroLineColor: "rgba(33, 37, 41, 0.3)",
              zeroLineBorderDash: [2],
              zeroLineBorderDashOffset: [2],
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
  }, [data, labels, backgroundColor, title, subtitle]);

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
            <canvas id={`bar-chart-${title}`}></canvas>
          </div>
        </div>
      </div>
    </>
  );
}

CardBarChart.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  backgroundColor: PropTypes.string,
};