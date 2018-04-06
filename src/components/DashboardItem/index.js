import React from 'react';
import PieChart from '../PieChart';
import LineChart from '../LineChart';
import './DashboardItem.scss';

const DashboardItem = props => {
  const { type, title, data, size = 'small', series } = props;

  const renderChart = (type, data) => {
    switch (type.toLowerCase()) {
      case 'text': {
        return <h3 className="responsive-chart__text">{data}</h3>;
      }
      case 'pie': {
        return <PieChart data={data} />;
      }
      case 'line': {
        return <LineChart data={data} series={series} />;
      }
      default: {
        return null;
      }
    }
  };

  const isChart = type !== 'text';

  return (
    <div className={`responsive-chart responsive-chart--${size}`}>
      <h2 className="responsive-chart__title">{title}</h2>
      <div
        className={`responsive-chart__container responsive-chart__container--${size}`}
      >
        <div className={isChart ? 'responsive-chart__absolute' : null}>
          {renderChart(type, data)}
        </div>
      </div>
    </div>
  );
};

export default DashboardItem;
