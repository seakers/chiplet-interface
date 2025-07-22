import axios from 'axios';

/**
 * Run the Genetic Algorithm and fetch results.
 * @param {Object} params - { pop_size, n_gen, trace }
 * @returns {Promise<Object>} - The parsed response data
 */
export async function runGA(params) {
  const response = await axios.get('/api/chart-data/', { params });
  return response.data;
} 