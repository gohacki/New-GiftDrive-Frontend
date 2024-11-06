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
        backgroundColor: backgroundColor || "#ed64a6",
        borderColor: backgroundColor || "#ed64a6",
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