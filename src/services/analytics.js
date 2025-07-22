import axios from 'axios';

/**
 * Fetch rule mining results for the frontend table.
 * @param {Object} params - (not used, but for consistency)
 * @returns {Promise<Object>} - The parsed response data
 */
export async function getRuleMining(params = {}) {
  const response = await axios.get('/api/rule-mining/', { params });
  return response.data;
}

/**
 * Fetch a natural-language summary of rule mining results.
 * @param {Object} params - (not used, but for consistency)
 * @returns {Promise<Object>} - The parsed response data
 */
export async function getRuleMiningInsights(params = {}) {
  const response = await axios.get('/api/rule-mining-insights/', { params });
  return response.data;
}

/**
 * Fetch distance correlation analytics.
 * @param {Object} params - (not used, but for consistency)
 * @returns {Promise<Object>} - The parsed response data
 */
export async function getDistanceCorrelation(params = {}) {
  const response = await axios.get('/api/distance-correlation/', { params });
  return response.data;
} 