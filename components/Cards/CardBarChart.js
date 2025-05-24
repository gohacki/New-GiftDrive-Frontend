import React from "react";
import PropTypes from "prop-types";
import ChartWrapper from "./ChartWrapper";

const CardBarChart = ({ title, subtitle, data, labels, backgroundColor }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: subtitle || "",
        data: data,
        backgroundColor: backgroundColor || "#059669", // Default to ggreen
        borderColor: backgroundColor || "#059669", // Default to ggreen
        borderWidth: 1,
        barThickness: 8,
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
          color: "#64748B", // text-slate-500
        },
        grid: {
          borderDash: [2],
          borderDashOffset: [2],
          color: "#E2E8F0", // text-slate-200
          zeroLineColor: "#E2E8F0", // text-slate-200
          zeroLineBorderDash: [2],
          zeroLineBorderDashOffset: [2],
        },
      },
    },
  };

  return (
    <ChartWrapper
      chartId={`bar-chart-${title}`}
      chartType="bar"
      data={chartData}
      options={chartOptions}
      title={title}
      subtitle={subtitle}
    />
  );
};

CardBarChart.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  backgroundColor: PropTypes.string,
};

export default CardBarChart;