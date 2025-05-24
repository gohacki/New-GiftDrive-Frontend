import React from "react";
import PropTypes from "prop-types";
import ChartWrapper from "./ChartWrapper";

const CardLineChart = ({
  title,
  subtitle,
  data,
  labels,
  borderColor,
  backgroundColor,
}) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: subtitle || "",
        data: data,
        fill: false,
        borderColor: borderColor || "#059669", // Default to ggreen
        backgroundColor: backgroundColor || "#059669", // Default to ggreen for points
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#4A5568", // text-slate-600
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
          color: "#64748B", // text-slate-500
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: "#64748B", // text-slate-500
        },
        grid: {
          color: "#E2E8F0", // text-slate-200
        },
      },
    },
  };

  return (
    <ChartWrapper
      chartId={`line-chart-${title}`}
      chartType="line"
      data={chartData}
      options={chartOptions}
      title={title}
      subtitle={subtitle}
    />
  );
};

CardLineChart.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  borderColor: PropTypes.string,
  backgroundColor: PropTypes.string,
};

export default CardLineChart;