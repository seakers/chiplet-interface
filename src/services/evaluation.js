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