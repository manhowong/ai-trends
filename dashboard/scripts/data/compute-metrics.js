/* ============================================================
   compute-metrics.js - Reusable metric calculations
   ============================================================ */

import { getNodeVolume, getTotalVolumeByLevel } from './extract-data.js';

export function percentChange(startValue, endValue) {
  if (startValue === 0) return Math.round(endValue * 100);
  return Math.round(((endValue - startValue) / startValue) * 100);
}

// Hotness score
export function computeSharePercentChange(rawTimeseries, startTimePoint, endTimePoint, nodeId, level, trendVolumeThreshold) {
  
  if (startTimePoint === endTimePoint) return 'n.a.';

  const startVolume = getNodeVolume(rawTimeseries, startTimePoint, nodeId, level);
  const endVolume = getNodeVolume(rawTimeseries, endTimePoint, nodeId, level);
  if (startVolume < trendVolumeThreshold && endVolume < trendVolumeThreshold) 
    return 'n.a.';
  
  const startTotal = getTotalVolumeByLevel(rawTimeseries, startTimePoint, level);
  const endTotal = getTotalVolumeByLevel(rawTimeseries, endTimePoint, level);
  if (startTotal <= 0 || endTotal <= 0) return 'n.a.';

  const startShare = startVolume / startTotal;
  const endShare = endVolume / endTotal;
  return percentChange(startShare, endShare);
}

export function getTrendDirection(hotness, trendBoundary) {
  if (hotness === 'n.a.') return 0; // See computeSharePercentChange
  const boundary = Math.abs(trendBoundary || 0);
  if (hotness >= boundary) return 1;
  if (hotness <= -boundary) return -1;
  return 0;
}
