import React from 'react';
import './BalanceChecklist.css';

const toneToLabel = (tone) => {
  switch (tone) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    default:
      return 'OK';
  }
};

const directionDescriptor = (direction) => {
  if (direction === 'high') return 'above';
  if (direction === 'low') return 'below';
  return 'on target';
};

const formatDelta = (delta) => {
  if (typeof delta !== 'number' || Number.isNaN(delta)) return '';
  if (delta === 0) return '±0';
  return delta > 0 ? `+${Math.round(delta * 100) / 100}` : `${Math.round(delta * 100) / 100}`;
};

const formatValue = (value) => {
  if (value === null || typeof value === 'undefined') {
    return '—';
  }
  return value;
};

const buildMetricDeltaText = (metric) => {
  if (metric.actual === null || metric.baseline === null) {
    return '';
  }
  const parts = [];
  if (metric.delta !== null) {
    parts.push(formatDelta(metric.delta));
  }
  if (metric.percentDelta !== null && metric.percentDelta !== 0) {
    const rounded = Math.round(metric.percentDelta);
    parts.push(`${rounded > 0 ? '+' : ''}${rounded}%`);
  }
  if (parts.length === 0) {
    return '';
  }
  return ` (${parts.join(', ')})`;
};

const BalanceChecklist = ({ report }) => {
  if (!report) {
    return (
      <section className="balance-checklist">
        <h2>Balance Review</h2>
        <p className="balance-summary status-warning">Balance data is not available yet.</p>
      </section>
    );
  }

  const { metrics, featureCost, attributeSummary, attackCoverage, overall } = report;

  const metricMap = Object.fromEntries(metrics.map((metric) => [metric.id, metric]));
  const coreMetrics = [
    metricMap.hp,
    metricMap.pd,
    metricMap.ad,
    attributeSummary.total,
    attributeSummary.max,
  ].filter(Boolean);

  const secondaryItems = [
    { type: 'featureCost', data: featureCost },
    metricMap.check,
    metricMap.damage,
    metricMap.savedc,
    { type: 'coverage', data: attackCoverage },
  ].filter(Boolean);

  const renderMetricRow = (item) => {
    if (!item) return null;
    const tone = item.tone || 'ok';
    return (
      <div key={item.id || item.label} className={`checklist-row status-${tone}`}>
        <span className={`status-badge status-${tone}`}>{toneToLabel(tone)}</span>
        <div className="checklist-row-details">
          <strong>{item.label}</strong>
          <span>
            {formatValue(item.actual)} vs baseline {formatValue(item.baseline ?? item.expected ?? '—')}
            {buildMetricDeltaText(item)}
            {item.direction !== 'ok' && tone !== 'ok' && ` — ${directionDescriptor(item.direction)} expectations.`}
          </span>
        </div>
      </div>
    );
  };

  const renderSecondaryRow = (entry) => {
    if (!entry) return null;
    if (entry.type === 'featureCost') {
      const data = entry.data;
      const tone = data.tone || 'ok';
      return (
        <div key="feature-cost" className={`checklist-row status-${tone}`}>
          <span className={`status-badge status-${tone}`}>{toneToLabel(tone)}</span>
          <div className="checklist-row-details">
            <strong>Feature Cost</strong>
            <span>
              Expected {data.budget.min}–{data.budget.max}, current {data.total}.
              {data.direction !== 'ok' && ` This is ${directionDescriptor(data.direction)} the recommended range.`}
            </span>
          </div>
        </div>
      );
    }

    if (entry.type === 'coverage') {
      const data = entry.data;
      const tone = data.tone || 'ok';
      return (
        <div key="attack-coverage" className={`checklist-row status-${tone}`}>
          <span className={`status-badge status-${tone}`}>{toneToLabel(tone)}</span>
          <div className="checklist-row-details">
            <strong>PD & AD Coverage</strong>
            <span>{data.message}</span>
          </div>
        </div>
      );
    }

    return renderMetricRow(entry);
  };

  return (
    <section className="balance-checklist">
      <h2>Balance Review</h2>
      <div className={`balance-summary status-${overall.tone}`}>
        <strong>{overall.message}</strong>
        {overall.details?.length > 0 && (
          <ul>
            {overall.details.map((detail, index) => (
              <li key={`summary-detail-${index}`}>{detail}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="balance-checklist-columns">
        <div className="balance-column">
          <h3>Core Stats</h3>
          {coreMetrics.map((metric) => renderMetricRow(metric))}
        </div>
        <div className="balance-column">
          <h3>Offense & Budget</h3>
          {secondaryItems.map((item) => renderSecondaryRow(item))}
        </div>
      </div>
    </section>
  );
};

export default BalanceChecklist;
