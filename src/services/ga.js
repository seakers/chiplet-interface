import axios from 'axios';

/**
 * Run the Genetic Algorithm and fetch results.
 * @param {Object} params - { pop_size, n_gen, trace, model, pistil_model, etc. }
 * @returns {Promise<Object>} - The parsed response data
 */
export async function runGA(params) {
  // For PISTIL, add run_ga=true to trigger GA start
  if (params.model === 'PISTIL') {
    params.run_ga = 'true';
  }
  const response = await axios.get('/api/chart-data/', { params });
  return response.data;
} 