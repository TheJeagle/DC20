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

      <div className="checklist-section">
        <h3>Feature Budget</h3>
        <div className={`checklist-row status-${featureCost.tone}`}>
          <span className={`status-badge status-${featureCost.tone}`}>{toneToLabel(featureCost.tone)}</span>
          <div className="checklist-row-details">
            <strong>Feature Cost</strong>
            <span>
              Expected {featureCost.budget.min}–{featureCost.budget.max}, current {featureCost.total}.
              {featureCost.direction !== 'ok' && ` This is ${directionDescriptor(featureCost.direction)} the recommended range.`}
            </span>
          </div>
        </div>
      </div>

      <div className="checklist-section">
        <h3>Core Stats</h3>
        {metrics.map((metric) => (
          <div key={metric.id} className={`checklist-row status-${metric.tone}`}>
            <span className={`status-badge status-${metric.tone}`}>{toneToLabel(metric.tone)}</span>
            <div className="checklist-row-details">
              <strong>{metric.label}</strong>
              <span>
                {formatValue(metric.actual)} vs baseline {formatValue(metric.baseline)}
                {buildMetricDeltaText(metric)}
                {metric.direction !== 'ok' && metric.tone !== 'ok' && ` — ${directionDescriptor(metric.direction)} of expectations.`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="checklist-section">
        <h3>Attributes & Saves</h3>
        {[attributeSummary.total, attributeSummary.max].map((summary) => (
          <div key={summary.label} className={`checklist-row status-${summary.tone}`}>
            <span className={`status-badge status-${summary.tone}`}>{toneToLabel(summary.tone)}</span>
            <div className="checklist-row-details">
              <strong>{summary.label}</strong>
              <span>
                {formatValue(summary.actual)} vs expected {formatValue(summary.expected)}
                {` (${formatDelta(summary.delta)})`}
                {summary.direction !== 'ok' && summary.tone !== 'ok' && ` — ${directionDescriptor(summary.direction)} the level guideline.`}
              </span>
            </div>
          </div>
        ))}
        {attributeSummary.saveWarnings.length > 0 ? (
          attributeSummary.saveWarnings.map((warning) => (
            <div key={warning.attribute} className={`checklist-row status-${warning.tone}`}>
              <span className={`status-badge status-${warning.tone}`}>{toneToLabel(warning.tone)}</span>
              <div className="checklist-row-details">
                <strong>{warning.attribute}</strong>
                <span>
                  {formatValue(warning.actual)} vs baseline {formatValue(warning.baseline)}
                  {` (${formatDelta(warning.delta)})`}
                  {warning.direction !== 'ok' && ` — ${directionDescriptor(warning.direction)} proficiency.`}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="checklist-row status-ok">
            <span className="status-badge status-ok">OK</span>
            <div className="checklist-row-details">
              <strong>Saves</strong>
              <span>All tracked saves are within the expected range.</span>
            </div>
          </div>
        )}
      </div>

      <div className="checklist-section">
        <h3>Attack Coverage</h3>
        <div className={`checklist-row status-${attackCoverage.tone}`}>
          <span className={`status-badge status-${attackCoverage.tone}`}>{toneToLabel(attackCoverage.tone)}</span>
          <div className="checklist-row-details">
            <strong>PD & AD Coverage</strong>
            <span>{attackCoverage.message}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BalanceChecklist;
