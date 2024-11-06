import React from "react";
import PropTypes from "prop-types";
import ChartWrapper from "./ChartWrapper";

const CardPieChart = ({ title, data, labels, colors }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor:
          colors || ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
        hoverBackgroundColor:
          colors || ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
      },
    ],
  };

  const chartOptions = {
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
            const total =
              context.chart._metasets[context.datasetIndex].total || 1;
            const percentage = ((value / total) * 100).toFixed(2);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <ChartWrapper
      chartId={`pie-chart-${title}`}
      chartType="pie"
      data={chartData}
      options={chartOptions}
      title={title}
    />
  );
};

CardPieChart.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string),
};

export default CardPieChart;