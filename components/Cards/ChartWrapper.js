import React, { useEffect, useRef } from "react";
import Chart from "chart.js";
import PropTypes from "prop-types";

const ChartWrapper = ({
  chartId,
  chartType,
  data,
  options,
  title,
  subtitle,
  children,
}) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = document.getElementById(chartId);
    if (canvas) {
      const ctx = canvas.getContext("2d");

      // Destroy existing chart instance if it exists to prevent duplication
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Initialize new Chart instance
      chartRef.current = new Chart(ctx, {
        type: chartType,
        data: data,
        options: options,
      });
    }

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartId, chartType, data, options]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center">
          <div className="relative w-full max-w-full flex-grow flex-1">
            {subtitle && (
              <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
                {subtitle}
              </h6>
            )}
            {title && (
              <h2 className="text-blueGray-700 text-xl font-semibold">
                {title}
              </h2>
            )}
          </div>
          {children}
        </div>
      </div>
      <div className="p-4 flex-auto">
        {/* Chart */}
        <div className="relative h-350-px">
          <canvas id={chartId}></canvas>
        </div>
      </div>
    </div>
  );
};

ChartWrapper.propTypes = {
  chartId: PropTypes.string.isRequired,
  chartType: PropTypes.oneOf(["bar", "line", "pie", "doughnut", "radar", "polarArea"]).isRequired,
  data: PropTypes.object.isRequired,
  options: PropTypes.object,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node,
};

ChartWrapper.defaultProps = {
  options: {},
  title: "",
  subtitle: "",
  children: null,
};

export default ChartWrapper;