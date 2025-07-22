import axios from 'axios';

/**
 * Send a chat message to the backend LLM.
 * @param {Object} params - { content, role }
 * @returns {Promise<Object>} - The parsed response data
 */
export async function sendChat(params) {
  const response = await axios.get('/api/chat-response/', { params });
  return response.data;
}

/**
 * Clear the chat history in the backend.
 * @returns {Promise<Object>} - The parsed response data
 */
export async function clearChat() {
  const response = await axios.post('/api/clear-chat/');
  return response.data;
}

/**
 * Add information/context to the backend chatbot (for design context).
 * @param {Object} params - { exe, energy, gpu, attn, sparse, conv }
 * @returns {Promise<Object>} - The parsed response data
 */
export async function addInfo(params) {
  const response = await axios.get('/api/add-info/', { params });
  return response.data;
} 