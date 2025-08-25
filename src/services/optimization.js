import axios from 'axios';

export async function runOptimization(params) {
  console.log('Frontend: runOptimization called with params:', params);
  console.log('Frontend: Making POST request to /api/run-optimization/');
  
  try {
    const response = await axios.post('/api/run-optimization/', params);
    console.log('Frontend: Optimization response received:', response);
    console.log('Frontend: Response status:', response.status);
    console.log('Frontend: Response data:', response.data);
    return response;
  } catch (error) {
    console.error('Frontend: Optimization request failed:', error);
    console.error('Frontend: Error response:', error.response);
    throw error;
  }
} 