import axios from 'axios';

/**
 * Fetch rule mining results for the frontend table.
 * @param {Object} params - Parameters including file_path, objective, trace_name, run_id
 * @returns {Promise<Object>} - The parsed response data
 */
export async function getRuleMining(params = {}) {
  const response = await axios.get('/api/rule-mining/', { params });
  return response.data;
}

/**
 * Fetch a natural-language summary of rule mining results.
 * @param {Object} params - Parameters including objective, trace_name, run_id, and rule mining parameters
 * @returns {Promise<Object>} - The parsed response data with insights and structured_data
 */
export async function getRuleMiningInsights(params = {}) {
  const response = await axios.get('/api/rule-mining-insights/', { params });
  return response.data;
}

/**
 * Fetch distance correlation analytics.
 * @param {Object} params - Parameters including file_path
 * @returns {Promise<Object>} - The parsed response data
 */
export async function getDistanceCorrelation(params = {}) {
  const response = await axios.get('/api/distance-correlation/', { params });
  return response.data;
}

/**
 * Get distance correlation insights from the backend.
 * @param {Object} params - Parameters including objective, trace_name, run_id
 * @returns {Promise<Object>} - The parsed response data with insights and structured_data
 */
export async function getDistanceCorrelationInsights(params = {}) {
  const response = await axios.get('/api/distance-correlation-insights/', { params });
  return response.data;
}

/**
 * Ask follow-up questions about data mining results.
 * @param {Object} data - { question, data_mining_type, structured_data }
 * @returns {Promise<Object>} - The parsed response data
 */
export async function askDataMiningFollowup(data) {
  const response = await axios.post('/api/data-mining-followup/', data);
  return response.data;
}

/**
 * Generate a downloadable optimization report.
 * @param {string} runId - Optional run ID to get specific run parameters
 * @returns {Promise<Object>} - The parsed response data with download link
 */
export async function generateOptimizationReport(runId = null) {
  const params = {};
  if (runId) {
    params.run_id = runId;
  }
  const response = await axios.get('/api/generate-optimization-report/', { params });
  return response.data;
}

/**
 * Generate a comprehensive comparative report for two optimization runs.
 * @param {string} runAId - ID of the first run to compare
 * @param {string} runBId - ID of the second run to compare
 * @returns {Promise<Object>} - The parsed response data with download link
 */
export async function generateComparativeReport(runAId, runBId) {
  const params = {
    run_a_id: runAId,
    run_b_id: runBId
  };
  const response = await axios.get('/api/generate-comparative-report/', { params });
  return response.data;
}

/**
 * Get designs matching specific constraints for highlighting.
 * @param {Object} params - { chiplet_type, constraint_level }
 * @returns {Promise<Object>} - The parsed response data with highlighted points
 */
export async function getDesignsByConstraint(params) {
  const response = await axios.get('/api/get-designs-by-constraint/', { params });
  return response.data;
} 