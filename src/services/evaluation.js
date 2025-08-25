import axios from 'axios';

/**
 * Evaluate a design using chiplet drag-and-drop (DragDrop.vue)
 * @param {Object} params - { chiplets, trace }
 * @returns {Promise<Object>} - The parsed response data
 */
export async function evaluatePoint(params) {
  const response = await axios.get('/api/evaluate-point/', { params });
  return response.data;
}

/**
 * Evaluate a design using manual/modified input (ChipletMenu.vue, ModifyDesignMenu.vue)
 * @param {Object} params - { GPU, Attention, Sparse, Convolution, trace }
 * @returns {Promise<Object>} - The parsed response data
 */
export async function evaluatePointInputs(params) {
  const response = await axios.get('/api/evaluate-point-inputs/', { params });
  return response.data;
} 

/**
 * Integrate a custom point into the current GA generation
 * @param {Object} params - { run_id, custom_point, current_generation }
 * @returns {Promise<Object>} - The response data
 */
export async function integrateCustomPointToGA(params) {
  const response = await axios.post('/api/integrate-custom-point-to-ga/', params);
  return response.data;
}

/**
 * Permanently save a custom point to the main dataset
 * @param {Object} point - The custom point to save
 * @returns {Promise<Object>} - The response data
 */
export async function saveCustomPointToDataset(point) {
  const response = await axios.post('/api/save-custom-point-to-dataset/', { point });
  return response.data;
} 