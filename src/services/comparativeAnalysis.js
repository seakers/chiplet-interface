import axios from 'axios';
import { getRuleMining, getDistanceCorrelation } from './analytics.js';

/**
 * Run comparative analysis with two optimization configurations
 * @param {Object} runAConfig - Configuration for Run A
 * @param {Object} runBConfig - Configuration for Run B
 * @returns {Promise<Object>} Comparative analysis results
 */
export async function runComparativeAnalysis(runAConfig, runBConfig) {
  try {
    console.log('Starting comparative analysis...');
    console.log('Run A config:', runAConfig);
    console.log('Run B config:', runBConfig);

    // Handle previous runs by loading their data
    let runAData = null;
    let runBData = null;

    if (runAConfig.type === 'previous') {
      runAData = await loadPreviousRunForComparison(runAConfig.backup_filename);
    }

    if (runBConfig.type === 'previous') {
      runBData = await loadPreviousRunForComparison(runBConfig.backup_filename);
    }

    // Prepare the comparative study payload
    const payload = {
      comparative_study: true,
      run_a: runAConfig,
      run_b: runBConfig,
      model: 'CASCADE', // Default model for comparative studies
      algorithm: 'Genetic Algorithm', // Default algorithm
      objectives: ['Energy', 'Runtime'], // Default objectives
      population_size: 50, // Default population size
      generations: 100, // Default generations
      trace_sets: {
        A: {
          traces: ['gpt-j-65536-weighted'], // Default trace for previous runs
          weights: [1.0]
        },
        B: {
          traces: ['gpt-j-65536-weighted'], // Default trace for previous runs
          weights: [1.0]
        }
      },
      timestamp: new Date().toISOString()
    };

    // If we have new run configurations, use their settings
    if (runAConfig.type === 'new') {
      payload.model = runAConfig.model;
      payload.algorithm = runAConfig.algorithm;
      payload.objectives = runAConfig.objectives;
      payload.population_size = runAConfig.population_size;
      payload.generations = runAConfig.generations;
      payload.trace_sets.A = {
        traces: runAConfig.traces.map(t => t.name),
        weights: runAConfig.traces.map(t => t.weight)
      };
    }

    if (runBConfig.type === 'new') {
      // Use Run B settings if Run A is previous, otherwise keep Run A settings
      if (runAConfig.type === 'previous') {
        payload.model = runBConfig.model;
        payload.algorithm = runBConfig.algorithm;
        payload.objectives = runBConfig.objectives;
        payload.population_size = runBConfig.population_size;
        payload.generations = runBConfig.generations;
      }
      payload.trace_sets.B = {
        traces: runBConfig.traces.map(t => t.name),
        weights: runBConfig.traces.map(t => t.weight)
      };
    }

    // Call the optimization API for comparative study
    const response = await axios.post('/api/run-optimization/', payload, {
      timeout: 300000 // 5 minutes timeout for comparative analysis
    });

    console.log('Comparative analysis API response:', response.data);

    if (response.data.status === 'success') {
      // Extract run results
      const runAResults = {
        runId: response.data.run_a_id || 'runA',
        points: response.data.run_a_points || (runAData ? runAData.data.points : 0),
        pareto: response.data.run_a_pareto || (runAData ? runAData.data.pareto : 0),
        bestEnergy: response.data.run_a_best_energy || (runAData ? runAData.data.bestEnergy : 0),
        bestTime: response.data.run_a_best_time || (runAData ? runAData.data.bestTime : 0),
        config: runAConfig,
        timestamp: new Date().toISOString()
      };

      const runBResults = {
        runId: response.data.run_b_id || 'runB',
        points: response.data.run_b_points || (runBData ? runBData.data.points : 0),
        pareto: response.data.run_b_pareto || (runBData ? runBData.data.pareto : 0),
        bestEnergy: response.data.run_b_best_energy || (runBData ? runBData.data.bestEnergy : 0),
        bestTime: response.data.run_b_best_time || (runBData ? runBData.data.bestTime : 0),
        config: runBConfig,
        timestamp: new Date().toISOString()
      };

      // Run data mining for both runs
      const miningResults = await runComparativeDataMining(runAResults, runBResults);

      return {
        status: 'success',
        runA: runAResults,
        runB: runBResults,
        mining: miningResults,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(response.data.message || 'Comparative analysis failed');
    }
  } catch (error) {
    console.error('Comparative analysis error:', error);
    throw new Error(`Comparative analysis failed: ${error.message}`);
  }
}

/**
 * Run data mining for comparative analysis
 * @param {Object} runAResults - Results from Run A
 * @param {Object} runBResults - Results from Run B
 * @returns {Promise<Object>} Data mining results for both runs
 */
async function runComparativeDataMining(runAResults, runBResults) {
  try {
    console.log('Running comparative data mining...');

    // Prepare mining parameters for both runs
    const miningParamsA = {
      run_id: runAResults.runId,
      run_label: 'A'
    };

    const miningParamsB = {
      run_id: runBResults.runId,
      run_label: 'B'
    };

    // Run data mining for both runs in parallel
    const [miningA, miningB] = await Promise.all([
      runDataMiningForRun(miningParamsA),
      runDataMiningForRun(miningParamsB)
    ]);

    return {
      runA: miningA,
      runB: miningB,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Comparative data mining error:', error);
    // Return fallback results if mining fails
    return {
      runA: { rules: 0, correlations: 0, error: error.message },
      runB: { rules: 0, correlations: 0, error: error.message },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run data mining for a specific run
 * @param {Object} params - Mining parameters
 * @returns {Promise<Object>} Data mining results
 */
async function runDataMiningForRun(params) {
  try {
    // Run rule mining
    const ruleMiningResponse = await getRuleMining(params);
    
    // Run distance correlation
    const distanceCorrResponse = await getDistanceCorrelation(params);

    return {
      rules: ruleMiningResponse.rules_count || 0,
      correlations: distanceCorrResponse.correlations_count || 0,
      rule_details: ruleMiningResponse.rules || [],
      correlation_details: distanceCorrResponse.correlations || [],
      status: 'success'
    };
  } catch (error) {
    console.error(`Data mining error for run ${params.run_label}:`, error);
    return {
      rules: 0,
      correlations: 0,
      error: error.message,
      status: 'failed'
    };
  }
}

/**
 * Load previous run for comparative analysis
 * @param {string} backupFilename - Backup filename to load
 * @returns {Promise<Object>} Loaded run data
 */
export async function loadPreviousRunForComparison(backupFilename) {
  try {
    const response = await axios.post('/api/load-previous-run/', {
      backup_filename: backupFilename
    });

    if (response.data.status === 'success') {
      return {
        type: 'previous',
        config: {
          backup_filename: backupFilename,
          display_name: response.data.display_name,
          timestamp: response.data.timestamp
        },
        data: {
          points: response.data.points_count || 0,
          pareto: response.data.pareto_count || 0,
          bestEnergy: response.data.best_energy || 0,
          bestTime: response.data.best_time || 0,
          runId: response.data.run_id,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      throw new Error(response.data.message || 'Failed to load previous run');
    }
  } catch (error) {
    console.error('Error loading previous run for comparison:', error);
    throw new Error(`Failed to load previous run: ${error.message}`);
  }
}

/**
 * Generate comparative report
 * @param {Object} runAResults - Results from Run A
 * @param {Object} runBResults - Results from Run B
 * @param {Object} miningResults - Data mining results
 * @returns {Promise<Object>} Comparative report
 */
export async function generateComparativeReport(runAResults, runBResults, miningResults) {
  try {
    console.log('=== generateComparativeReport START ===');
    console.log('runAResults:', runAResults);
    console.log('runBResults:', runBResults);
    
    // Extract run IDs from the results
    const runAId = runAResults.runId || 'runA';
    const runBId = runBResults.runId || 'runB';
    
    console.log('Extracted run IDs:', { runAId, runBId });
    
    // Call the new GET endpoint for comparative report generation
    const response = await axios.get('/api/generate-comparative-report/', {
      params: {
        run_a_id: runAId,
        run_b_id: runBId
      }
    });

    console.log('Backend response:', response.data);

    if (response.data.status === 'success') {
      return {
        status: 'success',
        web_link: response.data.web_link,
        download_link: response.data.download_link,
        report_filename: response.data.report_filename,
        metadata: response.data.metadata,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(response.data.message || 'Failed to generate comparative report');
    }
  } catch (error) {
    console.error('Error generating comparative report:', error);
    throw new Error(`Failed to generate comparative report: ${error.message}`);
  }
}

/**
 * Generate comparison summary
 * @param {Object} runA - Run A results
 * @param {Object} runB - Run B results
 * @returns {Object} Comparison summary
 */
function generateComparisonSummary(runA, runB) {
  const summary = {
    total_points: {
      run_a: runA.points,
      run_b: runB.points,
      difference: runA.points - runB.points,
      winner: runA.points > runB.points ? 'A' : runA.points < runB.points ? 'B' : 'tie'
    },
    pareto_optimal: {
      run_a: runA.pareto,
      run_b: runB.pareto,
      difference: runA.pareto - runB.pareto,
      winner: runA.pareto > runB.pareto ? 'A' : runA.pareto < runB.pareto ? 'B' : 'tie'
    },
    energy_efficiency: {
      run_a: runA.bestEnergy,
      run_b: runB.bestEnergy,
      difference: runA.bestEnergy - runB.bestEnergy,
      winner: runA.bestEnergy < runB.bestEnergy ? 'A' : runA.bestEnergy > runB.bestEnergy ? 'B' : 'tie'
    },
    performance: {
      run_a: runA.bestTime,
      run_b: runB.bestTime,
      difference: runA.bestTime - runB.bestTime,
      winner: runA.bestTime < runB.bestTime ? 'A' : runA.bestTime > runB.bestTime ? 'B' : 'tie'
    }
  };

  // Calculate overall winner
  const wins = {
    A: 0,
    B: 0,
    tie: 0
  };

  Object.values(summary).forEach(metric => {
    wins[metric.winner]++;
  });

  summary.overall_winner = wins.A > wins.B ? 'A' : wins.B > wins.A ? 'B' : 'tie';
  summary.wins_count = wins;

  return summary;
} 