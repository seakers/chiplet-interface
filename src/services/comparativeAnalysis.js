import axios from 'axios';

/**
 * Convert a run's UI config (from RunSelector) into the API payload shape
 * that the backend's /api/run-optimization/ expects for a comparative branch.
 */
function normalizeRunConfig(run) {
  if (run.type === 'previous') {
    return {
      type: 'previous',
      backup_filename: run.backup_filename,
      display_name: run.display_name,
      timestamp: run.timestamp,
      model: run.model,               // 'CASCADE' or 'PISTIL' from load-previous-run
      objectives: run.objectives || [],
    };
  }
  return {
    type: 'new',
    model: run.model,
    algorithm: run.algorithm,
    objectives: run.objectives,
    population_size: run.population_size,
    generations: run.generations,
    num_slots: run.num_slots,
    selected_chiplet_types: run.selected_chiplet_types,
    pistil_model: run.pistil_model,
    traces: (run.traces || []).map(t => ({ name: t.name, weight: t.weight })),
  };
}

/**
 * Extract a consistent, evaluator-agnostic summary shape from a backend
 * run response OR a previously-loaded run payload.
 *
 * Instead of hardcoded `bestEnergy` / `bestTime` (CASCADE-only), we return
 * `bestObjectives: { <objective_name>: value, ... }` computed from the
 * objectives the run actually used.
 */
function extractRunSummary(prefix, response, previouslyLoaded, runConfig) {
  const src = previouslyLoaded?.data || {};
  const resp = response || {};

  // Prefer a DB run_id from a loaded previous run; otherwise use the
  // backend-provided run_id for the newly-started run.
  const loadedRunId = typeof src.runId === 'string' && src.runId.startsWith('loaded_run_')
    ? src.runId
    : null;
  const runId = loadedRunId || resp[`${prefix}_id`] || resp[`${prefix}_run_id`] || null;

  // Objectives: the config that started the run is authoritative.
  const objectives = runConfig.objectives || src.objectives || [];

  // Best-per-objective values, if the backend supplied them, else fall back
  // to whatever the loaded-run payload had.
  const bestObjectives = {};
  for (const obj of objectives) {
    const key = `${prefix}_best_${obj.toLowerCase().replace(/\s+/g, '_')}`;
    if (resp[key] !== undefined) {
      bestObjectives[obj] = resp[key];
    } else if (src.bestObjectives && src.bestObjectives[obj] !== undefined) {
      bestObjectives[obj] = src.bestObjectives[obj];
    }
  }

  return {
    runId,
    points: resp[`${prefix}_points`] ?? src.points ?? 0,
    pareto: resp[`${prefix}_pareto`] ?? src.pareto ?? 0,
    bestObjectives,
    model: runConfig.model,
    objectives,
    config: runConfig,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run comparative analysis between two runs (each may be 'new' or 'previous').
 * Evaluator-agnostic — model/objectives/traces are driven by each run's config.
 */
export async function runComparativeAnalysis(runAConfig, runBConfig) {
  console.log('[comparative] Run A:', runAConfig);
  console.log('[comparative] Run B:', runBConfig);

  // Load previous-run data up-front (so we have a real run_id for anything
  // we didn't just start).
  let loadedA = null;
  let loadedB = null;
  if (runAConfig.type === 'previous') {
    loadedA = await loadPreviousRunForComparison(runAConfig.backup_filename);
  }
  if (runBConfig.type === 'previous') {
    loadedB = await loadPreviousRunForComparison(runBConfig.backup_filename);
  }

  // Build the backend payload. Whichever run is 'new' contributes its
  // model/objectives/traces. If both are 'new' they can differ (frontend
  // already blocks cross-evaluator pairs [1][7]).
  const normalize = (cfg) => normalizeRunConfig(cfg);
  const payload = {
    comparative_study: true,
    run_a: normalize(runAConfig),
    run_b: normalize(runBConfig),
    timestamp: new Date().toISOString(),
  };

  const response = await axios.post('/api/run-optimization/', payload, {
    timeout: 300000, // 5 min
  });

  if (response.data.status !== 'success') {
    throw new Error(response.data.message || 'Comparative analysis failed');
  }

  const runA = extractRunSummary('run_a', response.data, loadedA, runAConfig);
  const runB = extractRunSummary('run_b', response.data, loadedB, runBConfig);

  return {
    status: 'success',
    runA,
    runB,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Load a previous run and normalize its metadata for the comparative flow.
 * Handles both CASCADE and PISTIL — the backend already returns evaluator +
 * metadata correctly [8].
 */
export async function loadPreviousRunForComparison(backupFilename) {
  const response = await axios.post('/api/load-previous-run/', {
    backup_filename: backupFilename,
  });

  if (response.data.status !== 'success') {
    throw new Error(response.data.message || 'Failed to load previous run');
  }

  const meta = response.data.metadata || {};
  const evaluator =
    meta.model ||
    response.data.evaluator ||
    (backupFilename.startsWith('pistil_run_') ? 'PISTIL' : 'CASCADE');

  return {
    type: 'previous',
    config: {
      backup_filename: backupFilename,
      display_name: meta.display_name || response.data.display_name,
      timestamp: meta.timestamp || response.data.timestamp,
      model: evaluator,
      objectives: meta.objectives || [],
    },
    data: {
      runId: response.data.run_id,
      points: response.data.points_count ?? (response.data.data ? response.data.data.length : 0),
      pareto: response.data.pareto_count ?? 0,
      objectives: meta.objectives || [],
      // Generic per-objective bests, if backend provides them
      bestObjectives: response.data.best_objectives || {},
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Ask the backend to generate a comparative report from two existing run IDs.
 * The report generator is already evaluator-aware [7].
 */
export async function generateComparativeReport(runAResults, runBResults, objectives = []) {
  const runAId = runAResults.runId;
  const runBId = runBResults.runId;
  if (!runAId || !runBId) {
    throw new Error('Both runs must have a run_id before generating a comparative report.');
  }
  const response = await axios.get('/api/generate-comparative-report/', {
    params: {
      run_a_id: runAId,
      run_b_id: runBId,
      objectives: (objectives || []).join(','),   // NEW
    },
  });
  if (response.data.status !== 'success') {
    throw new Error(response.data.message || 'Failed to generate comparative report');
  }
  return {
    status: 'success',
    web_link: response.data.web_link,
    download_link: response.data.download_link,
    report_filename: response.data.report_filename,
    metadata: response.data.metadata,
    timestamp: new Date().toISOString(),
  };
}