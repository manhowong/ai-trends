/* ============================================================
   compute-metrics.js - Reusable metric calculations
   ============================================================ */

import { getNodeVolume, getTotalVolumeByLevel } from './extract-data.js';

export function percentChange(startValue, endValue) {
  if (startValue <= 0) return 0;
  return Math.round(((endValue - startValue) / startValue) * 100);
}

export function computeSharePercentChange(rawTimeseries, startTimePoint, endTimePoint, nodeId, level) {
  const startTotal = getTotalVolumeByLevel(rawTimeseries, startTimePoint, level);
  const endTotal = getTotalVolumeByLevel(rawTimeseries, endTimePoint, level);
  if (startTotal <= 0 || endTotal <= 0) return 0;

  const startShare = getNodeVolume(rawTimeseries, startTimePoint, nodeId, level) / startTotal;
  const endShare = getNodeVolume(rawTimeseries, endTimePoint, nodeId, level) / endTotal;
  return percentChange(startShare, endShare);
}

export function getTrendDirection(hotness, volume, trendVolumeThreshold, trendBoundary) {
  const minVolume = Math.max(0, trendVolumeThreshold || 0);
  if (volume < minVolume) return 0;
  const boundary = Math.abs(trendBoundary || 0);
  if (hotness >= boundary) return 1;
  if (hotness <= -boundary) return -1;
  return 0;
}
