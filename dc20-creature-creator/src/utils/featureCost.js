export const normalizeFeatureBalanceCost = (feature) => {
  if (!feature || typeof feature !== 'object') {
    return 1;
  }

  const rawValue = feature.balanceCost ?? feature.balance_cost ?? feature.balance_cost_value;

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue >= 0 ? rawValue : 0;
  }

  if (typeof rawValue === 'string') {
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed >= 0 ? parsed : 0;
    }
  }

  return 1;
};

export const sumFeatureBalanceCost = (features = []) => {
  if (!Array.isArray(features)) {
    return 0;
  }

  return features.reduce((total, feature) => total + normalizeFeatureBalanceCost(feature), 0);
};
