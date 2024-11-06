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
        borderColor: borderColor || "#4c51bf",
        backgroundColor: backgroundColor || "#4c51bf",
      },
    ],
  };

  const chartOptions = {
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