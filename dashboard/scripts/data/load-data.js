/* ============================================================
   load-data.js - Load raw dashboard files
   ============================================================ */

import { state } from '../state.js';

export async function loadDataFiles() {
  const [metaRes, tsRes, settingsRes] = await Promise.all([
    fetch('./data/metadata.json'),
    fetch('./data/timeseries.json'),
    fetch('./config/settings.yml'),
  ]);

  if (!metaRes.ok) throw new Error(`Failed to load metadata.json (${metaRes.status})`);
  if (!tsRes.ok) throw new Error(`Failed to load timeseries.json (${tsRes.status})`);
  if (!settingsRes.ok) throw new Error(`Failed to load settings.yml (${settingsRes.status})`);

  return {
    rawMetadata: await metaRes.json(),
    rawTimeseries: await tsRes.json(),
    settingsText: await settingsRes.text(),
  };
}

function applySettings(yamlText) {
  const boundaryMatch = yamlText.match(/trend_boundary:\s*([0-9.]+)/);
  const volumeMatch = yamlText.match(/trend_volume_threshold:\s*([0-9.]+)/);

  if (boundaryMatch) state.trendBoundary = parseFloat(boundaryMatch[1]);
  if (volumeMatch) state.trendVolumeThreshold = parseFloat(volumeMatch[1]);
}

export async function loadDataset() {
  const { rawMetadata, rawTimeseries, settingsText } = await loadDataFiles();

  state.rawMetadata = rawMetadata;
  state.rawTimeseries = rawTimeseries;
  applySettings(settingsText);

  state.timePoints = Object.keys(state.rawTimeseries).sort();
  if (!state.timePoints.length) throw new Error('timeseries.json has no time points');

  state.selectedStartTimePoint = state.timePoints[0];
  state.selectedEndTimePoint = state.timePoints[state.timePoints.length - 1];
}
