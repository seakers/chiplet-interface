<template>
  <div class="problem-formulation">
    <!-- Welcome Screen -->
    <div v-if="currentView === 'welcome'" class="welcome-screen">
      <div class="welcome-header">
        <h1 class="problem-formulation-title">Problem Formulation</h1>
        <h2 class="welcome-title">Welcome! What would you like to do today?</h2>
      </div>
      <div class="welcome-options">
        <button class="welcome-btn primary-btn" @click="setView('new-optimization')">
          <span class="btn-title">Start New Optimization</span>
          <span class="btn-description">Create and run a new chiplet optimization with custom parameters</span>
        </button>
        <button class="welcome-btn secondary-btn" @click="setView('load-previous')">
          <span class="btn-title">Load Previous Run</span>
          <span class="btn-description">Continue working with results from a previous optimization session</span>
        </button>
        <button class="welcome-btn secondary-btn" @click="setView('comparative')">
          <span class="btn-title">Compare two runs</span>
          <span class="btn-description">Compare two different optimization runs side-by-side</span>
        </button>
      </div>
    </div>

    <!-- New Optimization View -->
    <div v-else-if="currentView === 'new-optimization'" class="optimization-view">
      <div class="view-header">
        <button class="back-btn" @click="setView('welcome')">← Back</button>
        <h3 class="view-title">New Optimization</h3>
      </div>
      <form class="formulation-content" @submit.prevent="submitForm">
        <div class="form-grid">
          <div class="form-col">
            <div class="form-group">
              <label class="form-label" for="model">Select Model</label>
              <select id="model" v-model="selectedModel" class="form-select" :class="{ 'error': validationErrors.model }">
                <option value="CASCADE">CASCADE</option>
                <option value="PISTIL">PISTIL</option>
              </select>
              <div v-if="validationErrors.model" class="field-error">{{ validationErrors.model }}</div>
            </div>
            <div class="form-group" style="position: relative;">
              <label class="form-label">Select Objectives</label>
              <div class="custom-multiselect" @click="dropdownOpen = !dropdownOpen" :class="{ 'error': validationErrors.objectives }">
                <div class="selected-summary">
                  {{ selectedObjectives.length ? selectedObjectives.join(', ') : 'Select objectives...' }}
                </div>
                <div v-if="dropdownOpen" class="dropdown-list" @click.stop>
                  <div v-for="obj in objectivesOptions" :key="obj" class="dropdown-item">
                    <label>
                      <input type="checkbox" :value="obj" v-model="selectedObjectives" />
                      {{ obj }}
                    </label>
                  </div>
                </div>
              </div>
              <div v-if="validationErrors.objectives" class="field-error">{{ validationErrors.objectives }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">Traces & Weights</label>
              <div v-if="selectedModel === 'CASCADE'">
                <div v-for="(tw, idx) in traceWeights" :key="idx" class="trace-weight-row">
                  <select v-model="tw.name" class="form-select trace-select">
                    <option v-for="trace in traceOptions" :key="trace" :value="trace">{{ trace }}</option>
                  </select>
                  <input type="number" v-model.number="tw.weight" min="0" max="1" step="0.01" class="form-input trace-weight-input" placeholder="Weight (0-1)" />
                  <button type="button" class="remove-trace-btn" @click="removeTrace(idx)">❌</button>
                </div>
                <button type="button" class="add-trace-btn" @click="addTrace">+ Add Trace</button>
                <div v-if="validationErrors.traces" class="field-error">{{ validationErrors.traces }}</div>
              </div>
              <div v-else>
                <!-- Pistil Model Selection - integrated into Traces & Weights section -->
                <div class="trace-weight-row">
                  <select v-model="pistilModel" class="form-select trace-select">
                    <option v-for="m in pistilModelOptions" :key="m" :value="m">
                      {{ m }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="form-col">
            <div class="form-group">
              <label class="form-label" for="algorithm">Select Algorithm</label>
              <select id="algorithm" v-model="selectedAlgorithm" class="form-select" :class="{ 'error': validationErrors.algorithm }">
                <option value="Genetic Algorithm">Genetic Algorithm</option>
                <option value="Full-Factorial">Full-Factorial</option>
              </select>
              <div v-if="validationErrors.algorithm" class="field-error">{{ validationErrors.algorithm }}</div>
            </div>
            <div v-if="selectedAlgorithm === 'Genetic Algorithm'" class="form-group">
              <label class="form-label" for="population">Population Size</label>
              <input id="population" type="number" v-model.number="populationSize" class="form-input" min="1" :class="{ 'error': validationErrors.populationSize }" />
              <div v-if="validationErrors.populationSize" class="field-error">{{ validationErrors.populationSize }}</div>
            </div>
            <div v-if="selectedAlgorithm === 'Genetic Algorithm'" class="form-group">
              <label class="form-label" for="generations">Generations</label>
              <input id="generations" type="number" v-model.number="generations" class="form-input" min="1" :class="{ 'error': validationErrors.generations }" />
              <div v-if="validationErrors.generations" class="field-error">{{ validationErrors.generations }}</div>
            </div>
          <div v-if="selectedAlgorithm === 'Full-Factorial'" class="form-group">
            <label class="form-label">Total number of chiplets</label>
            <input type="number" v-model.number="fullFactorialNumSlots" class="form-input" min="1" max="20" />
            <small class="form-hint">Select up to 20</small>
          </div>
          <div v-if="selectedAlgorithm === 'Full-Factorial'" class="form-group" style="position: relative;">
            <label class="form-label">Select chiplet types</label>
            <div class="custom-multiselect" @click="chipletTypesDropdownOpen = !chipletTypesDropdownOpen">
              <div class="selected-summary">
                {{ selectedChipletTypes.length ? selectedChipletTypes.join(', ') : 'Select chiplet types...' }}
              </div>
              <div v-if="chipletTypesDropdownOpen" class="dropdown-list" @click.stop>
                <div v-for="t in chipletTypeOptions" :key="t" class="dropdown-item">
                  <label>
                    <input type="checkbox" :value="t" v-model="selectedChipletTypes" />
                    {{ t }}
                  </label>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        <div v-if="!isWeightSumValid" class="error-message">
          The sum of all weights must be exactly 1.0. Current sum: {{ traceWeightsSum.toFixed(4) }}
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary run-btn" :disabled="loading || isEstimating || isRunning || !isFormValid">
            <span v-if="isEstimating">Estimating time...</span>
            <span v-else-if="loading || isRunning">Running...</span>
            <span v-else>Run</span>
          </button>
          <button
            v-if="(loading || isRunning) && !isEstimating"
            type="button"
            class="btn btn-warning pause-btn"
            @click="pauseRun"
            :disabled="!(loading || isRunning)"
          >Pause</button>
          <button
            v-if="(loading || isRunning) && !isEstimating"
            type="button"
            class="btn btn-danger stop-btn"
            @click="stopRun"
            :disabled="!(loading || isRunning)"
          >Stop</button>
          <button 
            type="button" 
            class="btn btn-secondary data-mining-btn" 
            :disabled="!hasOptimizationData && !loading"
            @click="runDataMining"
          >
            Data Mining
          </button>
          <button 
            type="button" 
            class="btn btn-secondary generate-report-btn" 
            :disabled="!hasOptimizationData || loading"
            @click="generateReport"
          >
            Generate Report
          </button>
        </div>
      </form>
    </div>

    <!-- Estimation Modal -->
    <div v-if="showEstimationModal" class="modal-overlay" @click.self="cancelFullFactorialRun">
      <div class="modal-content">
        <h3 class="modal-title">Full-Factorial Runtime Estimate</h3>
        <div class="modal-body">
          <p><strong>Designs:</strong> {{ estimationInfo.design_space_size }}</p>
          <p><strong>Average evaluation time per design:</strong> {{ formatDuration(estimationInfo.avg_eval_ms) }}</p>
          <p><strong>Total Estimated time:</strong> {{ formatDuration(estimationInfo.estimated_runtime_ms) }}</p>
          <div class="form-group" style="margin-top: 0.5rem;">
            <label class="form-label">Run mode</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" value="online" v-model="fullFactorialMode" />
                <span>Online (plot as points arrive)</span>
              </label>
              <label class="radio-option">
                <input type="radio" value="offline" v-model="fullFactorialMode" />
                <span>Offline (plot when finished)</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelFullFactorialRun">Cancel</button>
          <button class="btn btn-primary" @click="confirmFullFactorialRun">Proceed</button>
        </div>
      </div>
    </div>

    <!-- Load Previous Run View -->
    <div v-else-if="currentView === 'load-previous'" class="load-previous-view">
      <div class="view-header">
        <button class="back-btn" @click="setView('welcome')">← Back</button>
        <h3 class="view-title">Load Previous Run</h3>
      </div>
      <div class="load-previous-content">
        <p class="load-previous-description">Select a previous optimization run to load and analyze:</p>
        <div class="form-group">
          <label class="form-label" for="previous-run">Select Run</label>
          <select id="previous-run" v-model="selectedPreviousRun" class="form-select" :disabled="loadingBackupFiles">
            <option value="">
              {{ loadingBackupFiles ? 'Loading previous runs...' : 'Choose a run...' }}
            </option>
            <option v-for="run in previousRuns" :key="run.id" :value="run.filename">
              {{ run.name }}
            </option>
          </select>
          <div v-if="loadingBackupFiles" class="loading-indicator">
            Loading previous optimization runs...
          </div>
          <div v-else-if="previousRuns.length === 0" class="no-runs-message">
            No previous optimization runs found.
          </div>
        </div>
        
        <!-- Restart From Previous Run Controls -->
        <div v-if="loadedRunMetadata" class="form-group">
          <label class="form-label" for="restart-generations">Generations for Restarted Run</label>
          <input id="restart-generations" type="number" v-model.number="restartGenerations" min="1" class="form-input" />
          <small class="form-hint">Starts a new GA run seeded with the loaded designs as the initial population.</small>
        </div>

        <!-- Loaded Run Configuration Display -->
        <div v-if="loadedRunMetadata" class="loaded-run-config">
          <h4 class="config-title">Loaded Run Configuration</h4>
          <div class="config-grid">
            <div class="config-item">
              <span class="config-label">Model:</span>
              <span class="config-value">{{ loadedRunMetadata.model || 'N/A' }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Algorithm:</span>
              <span class="config-value">{{ loadedRunMetadata.algorithm || 'N/A' }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Objectives:</span>
              <span class="config-value">{{ formatObjectives(loadedRunMetadata.objectives) }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Traces:</span>
              <span class="config-value">{{ formatTraces(loadedRunMetadata.traces) }}</span>
            </div>
            <div v-if="loadedRunMetadata.population_size" class="config-item">
              <span class="config-label">Population Size:</span>
              <span class="config-value">{{ loadedRunMetadata.population_size }}</span>
            </div>
            <div v-if="loadedRunMetadata.generations" class="config-item">
              <span class="config-label">Generations:</span>
              <span class="config-value">{{ loadedRunMetadata.generations }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Timestamp:</span>
              <span class="config-value">{{ formatTimestamp(loadedRunMetadata.timestamp) }}</span>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-primary" :disabled="!selectedPreviousRun" @click="loadPreviousRun">
            Load Run
          </button>

          <button 
            class="btn btn-secondary" 
            :disabled="!loadedRunMetadata || !selectedPreviousRun || loading"
            @click="restartFromPreviousRun"
          >
            Restart From This Run
          </button>

          <button 
            type="button" 
            class="btn btn-secondary data-mining-btn" 
            :disabled="!hasOptimizationData"
            @click="runDataMining"
          >
            Data Mining
          </button>
          <button 
            type="button" 
            class="btn btn-secondary generate-report-btn" 
            :disabled="!hasOptimizationData || loading"
            @click="generateReport"
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>

    <!-- Comparative Study View -->
    <div v-else-if="currentView === 'comparative'" class="comparative-view">
      <ComparativeStudy 
        @back="setView('welcome')"
        @open-data-mining="handleOpenDataMining"
        @report-generated="handleComparativeReportGenerated"
      />
    </div>
  </div>
</template>

<script>
import { runOptimization } from '../services/optimization.js';
import { runGA } from '../services/ga.js';
import { ref, defineComponent, watch } from 'vue';
import { getRuleMining, getDistanceCorrelation } from '../services/analytics.js';
import { generateOptimizationReport } from '../services/analytics.js';
import axios from 'axios';
import ComparativeStudy from './ComparativeStudy.vue';

// Extracted run form as a subcomponent for reuse
const RunForm = defineComponent({
  name: 'RunForm',
  props: {
    model: String,
    algorithm: String,
    traceWeights: Array,
    selectedObjectives: Array,
    populationSize: Number,
    generations: Number,
    gridSize: Number,
    traceOptions: Array,
    objectivesOptions: Array,
    loading: Boolean,
    errorMessage: String,
  },
  emits: [
    'update:model', 'update:algorithm', 'update:traceWeights', 'update:selectedObjectives',
    'update:populationSize', 'update:generations', 'update:gridSize'
  ],
  setup(props, { emit }) {
    // ... (implement v-model bindings for each prop)
    // For brevity, this is a placeholder. In real code, use computed setters/getters for v-model.
    return {};
  },
  template: `
    <div class="form-grid">
      <div class="form-col">
        <div class="form-group">
          <label class="form-label">Select Model</label>
          <select v-model="$props.model" class="form-select">
            <option value="CASCADE">CASCADE</option>
            <option value="PISTIL">PISTIL</option>
          </select>
        </div>
        <div class="form-group" style="position: relative;">
          <label class="form-label">Select Objectives</label>
          <div class="custom-multiselect">
            <div class="selected-summary">
              {{$props.selectedObjectives.length ? $props.selectedObjectives.join(', ') : 'Select objectives...'}}
            </div>
            <!-- For brevity, not implementing dropdown here -->
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Traces & Weights</label>
          <div v-for="(tw, idx) in $props.traceWeights" :key="idx" class="trace-weight-row">
            <select v-model="tw.name" class="form-select trace-select">
              <option v-for="trace in $props.traceOptions" :key="trace" :value="trace">{{ trace }}</option>
            </select>
            <input type="number" v-model.number="tw.weight" min="0" max="1" step="0.01" class="form-input trace-weight-input" placeholder="Weight (0-1)" />
            <button type="button" class="remove-trace-btn" @click="$props.traceWeights.splice(idx, 1)">❌</button>
          </div>
          <button type="button" class="add-trace-btn" @click="$props.traceWeights.push({ name: $props.traceOptions[0], weight: 1.0 })">+ Add Trace</button>
        </div>
      </div>
      <div class="form-col">
        <div class="form-group">
          <label class="form-label">Select Algorithm</label>
          <select v-model="$props.algorithm" class="form-select">
            <option value="Genetic Algorithm">Genetic Algorithm</option>
            <option value="Full-Factorial">Full-Factorial</option>
          </select>
        </div>
        <div v-if="$props.algorithm === 'Genetic Algorithm'" class="form-group">
          <label class="form-label">Population Size</label>
          <input type="number" v-model.number="$props.populationSize" class="form-input" min="1" />
        </div>
        <div v-if="$props.algorithm === 'Genetic Algorithm'" class="form-group">
          <label class="form-label">Generations</label>
          <input type="number" v-model.number="$props.generations" class="form-input" min="1" />
        </div>
        <div v-if="$props.algorithm === 'Full-Factorial'" class="form-group">
          <label class="form-label">Grid Size</label>
          <input type="number" v-model.number="$props.gridSize" class="form-input" min="1" />
        </div>
      </div>
    </div>
  `
});

export default {
  name: 'ProblemFormulation',
  components: {
    RunForm,
    ComparativeStudy
  },
  emits: ['optimization-success', 'data-mining-complete', 'report-generated', 'run-id-updated', 'view-changed', 'model-selected'],
  data() {
    return {
      currentView: 'welcome', // 'welcome', 'new-optimization', 'load-previous', 'comparative'
      runAForm: {
        model: 'CASCADE',
        algorithm: 'Genetic Algorithm',
        traceWeights: [{ name: 'gpt-j-65536-weighted', weight: 1.0 }],
        selectedObjectives: [],
        populationSize: 50,
        generations: 100,
        gridSize: 10,
        dropdownOpen: false,
      },
      runBForm: {
        model: 'CASCADE',
        algorithm: 'Genetic Algorithm',
        traceWeights: [{ name: 'gpt-j-65536-weighted', weight: 1.0 }],
        selectedObjectives: [],
        populationSize: 50,
        generations: 100,
        gridSize: 10,
        dropdownOpen: false,
      },
      sharedConfig: {
        model: 'CASCADE',
        algorithm: 'Genetic Algorithm',
        selectedObjectives: [],
        populationSize: 50,
        generations: 100,
        gridSize: 10,
        dropdownOpen: false,
      },
      selectedModel: 'CASCADE',
      selectedAlgorithm: 'Genetic Algorithm',
      populationSize: 50,
      generations: 100,
      gridSize: 10,
      // Full-Factorial specific inputs
      fullFactorialNumSlots: 12,
      chipletTypeOptions: ["GPU", "Attention", "Sparse", "Convolution"],
      selectedChipletTypes: ["GPU", "Attention", "Sparse", "Convolution"],
      chipletTypesDropdownOpen: false,
      // Estimation modal state
      showEstimationModal: false,
      estimationInfo: { design_space_size: 0, avg_eval_ms: 0, estimated_runtime_ms: 0 },
      fullFactorialMode: 'online',
      isEstimating: false,
      isRunning: false,
      dropdownOpen: false,
      selectedObjectives: [],
      // Objectives will be computed based on selectedModel
      traceOptions: [
        "gpt-j-65536-weighted",
        "gpt-j-1024-weighted",
        "sd-test",
        "ogbn-products-test",
        "resnet50-test"
      ],
      pistilModelOptions: [
        "llama3-8b"
      ],
      pistilModel: "llama3-8b",
      traceWeights: [
        { name: 'gpt-j-65536-weighted', weight: 1.0 }
      ],
      loading: false,
      errorMessage: '',
      hasOptimizationData: false, // Track if optimization has completed and data is available
      currentRunId: '', // Track the current run ID for polling
      validationErrors: {}, // Track validation errors for each field
      previousRuns: [], // Will be populated dynamically from backup files
      selectedPreviousRun: '',
      loadingBackupFiles: false, // Track loading state for backup files
      loadedRunMetadata: null, // Will store metadata of the loaded run
      restartGenerations: 20,
      statusPollingInterval: null, // Interval for polling run status
      expectedPistilPoints: 0, // Expected number of points for current Pistil GA run
      pistilRunId: null, // Current Pistil run ID being tracked
      pistilStatusCheckInterval: null, // Interval for checking Pistil GA completion
    };
  },
  computed: {
    // Model-specific objectives
    objectivesOptions() {
      if (this.selectedModel === 'PISTIL') {
        return [
          'Latency per Token',
          'Energy per Inference',
          'Energy per Token',
          'Average Power',
          'System Power',
          'System Cost',
          'Avg Compute Util',
          'Avg Memory Util',
          'Prefill Tokens/sec',
          'System Compute',
          'System Bandwidth',
          'System Capacity'
        ];
      } else {
        // CASCADE objectives
        return [
          'Energy',
          'Runtime',
          'Temperature',
          'Area',
          'Latency',
          'Throughput',
        ];
      }
    },
    canRunComparative() {
      return (
        this.sharedConfig.selectedObjectives.length > 0 &&
        this.runAForm.traceWeights.length > 0 &&
        this.runBForm.traceWeights.length > 0
      );
    },
    traceWeightsSum() {
      return this.traceWeights.reduce((sum, tw) => sum + Number(tw.weight || 0), 0);
    },
    isWeightSumValid() {
      return Math.abs(this.traceWeightsSum - 1.0) < 1e-6;
    },
    // New validation computed properties
    isFormValid() {
      return this.validateForm().isValid;
    },
    validationSummary() {
      return this.validateForm().errors;
    },
    
  },
  methods: {
    validateForm() {
      const errors = {};
      let isValid = true;

      // Check model selection
      if (!this.selectedModel) {
        errors.model = 'Model selection is required';
        isValid = false;
      }

      // Check algorithm selection
      if (!this.selectedAlgorithm) {
        errors.algorithm = 'Algorithm selection is required';
        isValid = false;
      }

      // Check objectives selection
      if (!this.selectedObjectives || this.selectedObjectives.length === 0) {
        errors.objectives = 'At least one objective must be selected';
        isValid = false;
      }

      // Check traces and weights
      if (!this.traceWeights || this.traceWeights.length === 0) {
        errors.traces = 'At least one trace must be added';
        isValid = false;
      } else {
        // Check if all traces have names
        const invalidTraces = this.traceWeights.filter(tw => !tw.name);
        if (invalidTraces.length > 0) {
          errors.traces = 'All traces must have names';
          isValid = false;
        }

        // Check weight sum
        if (!this.isWeightSumValid) {
          errors.traces = `Sum of weights must be exactly 1.0. Current sum: ${this.traceWeightsSum.toFixed(4)}`;
          isValid = false;
        }
      }

      // Check algorithm-specific parameters
      if (this.selectedAlgorithm === 'Genetic Algorithm') {
        if (!this.populationSize || this.populationSize < 1) {
          errors.populationSize = 'Population size must be at least 1';
          isValid = false;
        }
        if (!this.generations || this.generations < 1) {
          errors.generations = 'Number of generations must be at least 1';
          isValid = false;
        }
      } else if (this.selectedAlgorithm === 'Full-Factorial') {
        // no extra params for v1 (unconstrained, total fixed at 12)
      }

      return { isValid, errors };
    },
    setView(view) {
      this.currentView = view;
      this.errorMessage = ''; // Clear error message when changing views
      this.loading = false; // Reset loading state
      
      // Emit view change event to parent component
      this.$emit('view-changed', view);
    },
    addTrace() {
      this.traceWeights.push({ name: this.traceOptions[0], weight: 1.0 });
    },
    removeTrace(idx) {
      this.traceWeights.splice(idx, 1);
    },
    async submitForm() {
      // Clear previous errors
      this.errorMessage = '';
      this.validationErrors = {};
      
      // Validate form
      const validation = this.validateForm();
      if (!validation.isValid) {
        this.validationErrors = validation.errors;
        this.errorMessage = 'Please fix the validation errors below.';
        return;
      }
      
      this.loading = true;
      this.hasOptimizationData = false; // Reset data availability when starting new optimization
      this.currentRunId = ''; // Reset run ID
      
      // Stop any existing Pistil GA status check if starting a new run
      if (this.selectedModel === 'PISTIL' && this.selectedAlgorithm === 'Genetic Algorithm') {
        this.stopPistilGAStatusCheck();
      }
      
      // CRITICAL: Ensure algorithm is explicitly set based on user selection
      const selectedAlgorithm = this.selectedAlgorithm || 'Genetic Algorithm';
      console.log('ProblemFormulation: User selected algorithm:', selectedAlgorithm);
      
      const payload = {
        model: this.selectedModel,
        algorithm: selectedAlgorithm,  // Explicitly use selected algorithm
        objectives: this.selectedObjectives,
        traces: this.traceWeights.map(tw => ({ name: tw.name, weight: tw.weight })),
        population_size: this.populationSize,
        generations: this.generations,
      };
      
      console.log('ProblemFormulation: Payload algorithm:', payload.algorithm);
      console.log('ProblemFormulation: Full payload:', JSON.stringify(payload, null, 2));

      // Full-Factorial: call estimator first, then confirm via modal, then run
      if (this.selectedAlgorithm === 'Full-Factorial') {
        const ffParams = {
          ...payload,
          selected_types: this.selectedChipletTypes,
          num_slots: this.fullFactorialNumSlots || this.gridSize || 12,
          trace_mode: this.traceWeights.length > 1 ? 'weighted' : 'single',
          estimation_only: true,
        };
        try {
          this.isEstimating = true;
          const estimateResp = await runOptimization(ffParams);
          const est = estimateResp?.data || {};
          this.estimationInfo = {
            design_space_size: est.design_space_size ?? 0,
            avg_eval_ms: est.avg_eval_ms ?? 0,
            estimated_runtime_ms: est.estimated_runtime_ms ?? 0,
          };
          this._ffParamsCached = { ...ffParams }; // cache for confirm
          this.showEstimationModal = true;
          return; // wait for modal action
        } catch (e) {
          this.loading = false;
          this.isEstimating = false;
          this.errorMessage = e.response?.data?.error || e.response?.data?.message || 'Failed to estimate or run Full-Factorial.';
          return;
        }
      }

      // Pistil + GA: call chart-data directly via runGA (bypass /run-optimization for now)
      if (this.selectedAlgorithm === 'Genetic Algorithm' && this.selectedModel === 'PISTIL') {
        try {
          const primaryTrace = this.traceWeights[0]?.name || 'pistil-default';
          const gaParams = {
            model: 'PISTIL',
            algorithm: selectedAlgorithm,
            population_size: this.populationSize,
            generations: this.generations,
            pistil_model: this.pistilModel || 'llama3-8b',
            trace: primaryTrace,
          };
          console.log('ProblemFormulation: Calling runGA for Pistil with params:', gaParams);
          
          // Keep loading = true while GA runs in background
          // The GA runs asynchronously, so we keep the button disabled/running state
          // We'll track the expected number of points and clear loading when complete
          const expectedPoints = this.populationSize * this.generations;
          this.expectedPistilPoints = expectedPoints;
          this.pistilRunId = null; // Will be set from response
          
          const responseData = await runGA(gaParams);
          console.log('ProblemFormulation: Pistil GA response:', responseData);

          // Track Pistil run_id for polling
          const pistilRunId = responseData.pistil_run_id || '';
          this.pistilRunId = pistilRunId;
          
          // Clear old points when starting a new Pistil run
          // The parent (App.vue) will handle clearing via the run-id-updated event
          // But we can also emit a signal to clear points
          console.log('ProblemFormulation: Starting new Pistil run:', pistilRunId);
          console.log('ProblemFormulation: Previous run_id was:', this.currentRunId);
          console.log('ProblemFormulation: Expected points:', expectedPoints);
          
          this.currentRunId = pistilRunId;
          console.log('ProblemFormulation: Set Pistil run_id for polling:', pistilRunId);

          // Emit for plot components with run_id
          // The run-id-updated event will trigger point clearing in App.vue
          this.$emit('optimization-success', {
            ...responseData,
            run_directory: pistilRunId,
            pistil_run_id: pistilRunId
          });
          this.$emit('run-id-updated', pistilRunId);
          
          // Start polling to check when GA completes
          // Keep loading = true until all expected points are evaluated
          this.startPistilGAStatusCheck(pistilRunId, expectedPoints);
          
          return;
        } catch (error) {
          console.error('ProblemFormulation: Pistil GA run failed:', error);
          this.loading = false;
          this.errorMessage = error.response?.data?.error || 'Failed to run Pistil GA optimization.';
          return;
        }
      }
      
      try {
        // CRITICAL: Set lastAlgorithm BEFORE running optimization so polling uses correct algorithm
        // This must happen for BOTH GA and Full-Factorial
        try {
          if (typeof window !== 'undefined') {
            // Use the explicitly selected algorithm (should be 'Genetic Algorithm' or 'Full-Factorial')
            const algorithm = selectedAlgorithm; // Use the variable we set earlier
            window.__lastAlgorithm = algorithm;
            if (window.localStorage) {
              window.localStorage.setItem('lastAlgorithm', algorithm);
            }
            console.log('✅ ProblemFormulation: Set lastAlgorithm to:', algorithm, 'before running optimization');
            console.log('✅ ProblemFormulation: selectedAlgorithm is:', this.selectedAlgorithm);
            console.log('✅ ProblemFormulation: payload.algorithm is:', payload.algorithm);
            
            // Verify algorithm is correctly set
            if (algorithm !== 'Genetic Algorithm' && algorithm !== 'Full-Factorial') {
              console.warn('⚠️ WARNING: Algorithm is not Genetic Algorithm or Full-Factorial:', algorithm);
            }
          }
        } catch (e) {
          console.error('Error setting lastAlgorithm:', e);
        }
        
        console.log('✅ ProblemFormulation: About to call runOptimization with algorithm:', payload.algorithm);
        const response = await runOptimization(payload);
        console.log('ProblemFormulation: Raw response:', response);
        console.log('ProblemFormulation: Response type:', typeof response);
        console.log('ProblemFormulation: Response keys:', Object.keys(response));
        console.log('ProblemFormulation: Response.data:', response.data);
        console.log('ProblemFormulation: Response.data type:', typeof response.data);
        console.log('ProblemFormulation: Response.data keys:', response.data ? Object.keys(response.data) : 'no data');
        
        this.loading = false;
        this.hasOptimizationData = true; // Set data availability
        
        // CRITICAL: Use run_id from database (not run_directory) for status polling
        // run_id is the database identifier (e.g., "run_20251103_005130_abc12345")
        // run_directory is the filesystem directory (e.g., "myrun_2025Nov03_005130")
        const databaseRunId = response.data.run_id;
        const runDirectory = response.data.run_directory;
        
        // Store run_directory for plot polling, but use run_id for status checking
        this.currentRunId = runDirectory;
        
        console.log('ProblemFormulation: Optimization successful');
        console.log('ProblemFormulation: Response data:', response.data);
        console.log('ProblemFormulation: Database run_id:', databaseRunId);
        console.log('ProblemFormulation: Run directory:', runDirectory);
        console.log('ProblemFormulation: Using database run_id for status polling');
        
        // For Full-Factorial, start polling status in both online and offline modes
        // Use database run_id for status polling (not run_directory)
        if (this.selectedAlgorithm === 'Full-Factorial') {
          // Always poll for Full-Factorial runs (both online and offline can be async)
          if (databaseRunId) {
            this.startStatusPolling(databaseRunId);
          } else {
            console.warn('⚠️ No database run_id provided, using run_directory:', runDirectory);
            this.startStatusPolling(runDirectory);
          }
        } else if (this.selectedAlgorithm === 'Genetic Algorithm') {
          // GA runs complete synchronously, but check status after a delay
          const runIdToCheck = databaseRunId || runDirectory;
          setTimeout(() => this.checkRunStatus(runIdToCheck), 2000);
        }
        
        // Emit event for parent/plot update if needed
        this.$emit('optimization-success', response.data);
        console.log('ProblemFormulation: Emitting run-id-updated with:', this.currentRunId);
        this.$emit('run-id-updated', this.currentRunId); // Emit run-id-updated
      } catch (error) {
        this.loading = false;
        this.errorMessage = error.response?.data?.error || 'Failed to run optimization.';
      }
    },
    formatNumber(val) {
      if (val === null || val === undefined) return 'n/a';
      const num = Number(val);
      if (Number.isNaN(num)) return String(val);
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    },
    formatDuration(ms) {
      if (ms == null || isNaN(ms)) return 'n/a';
      if (ms < 1000) {
        return `${Math.round(ms)} ms`;
      }
      let seconds = Math.floor(ms / 1000);
      const hours = Math.floor(seconds / 3600);
      seconds = seconds % 3600;
      const minutes = Math.floor(seconds / 60);
      seconds = seconds % 60;
      const pad = n => n.toString().padStart(2, '0');
      if (hours > 0) {
        return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${pad(seconds)}s`;
      } else {
        return `${seconds}s`;
      }
    },
    cancelFullFactorialRun() {
      this.showEstimationModal = false;
      this._ffParamsCached = null;
      this.isEstimating = false;
      this.loading = false;
    },
    async confirmFullFactorialRun() {
      this.loading = true;            
      const params = this._ffParamsCached;
      if (!params) {
        this.cancelFullFactorialRun();
        return;
  }
      try {
        this.isEstimating = false;
        this.showEstimationModal = false;
        
        // Ensure algorithm is set in params
        const runParams = { 
          ...params, 
          mode: this.fullFactorialMode,
          algorithm: params.algorithm || this.selectedAlgorithm || 'Full-Factorial'  // Ensure algorithm is set
        };
        delete runParams.estimation_only;
        
        console.log('Full-Factorial: runParams.algorithm:', runParams.algorithm);
        console.log('Full-Factorial: selectedAlgorithm:', this.selectedAlgorithm);
        console.log('Full-Factorial: _ffParamsCached.algorithm:', params.algorithm);
        
        // Hint plot to label points correctly ASAP
        try {
          const algorithmToSet = runParams.algorithm || this.selectedAlgorithm || 'Full-Factorial';
          if (typeof window !== 'undefined') {
            window.__lastAlgorithm = algorithmToSet;
            if (window.localStorage) {
              window.localStorage.setItem('lastAlgorithm', algorithmToSet);
            }
            console.log('Full-Factorial: Set lastAlgorithm to:', algorithmToSet);
          }
        } catch (e) {
          console.error('Error setting lastAlgorithm for Full-Factorial:', e);
        }
        const runResp = await runOptimization(runParams);
        this.loading = false;
        this.hasOptimizationData = true;
        
        // CRITICAL: Use run_id from database (not run_directory) for status polling
        const databaseRunId = runResp.data.run_id;
        const runDirectory = runResp.data.run_directory;
        this.currentRunId = runDirectory; // Store for plot polling
        
        console.log('Full-Factorial: Database run_id:', databaseRunId);
        console.log('Full-Factorial: Run directory:', runDirectory);
        
        // If running in online mode, keep UI in "Running" state until user stops or completion is detected
        if (this.fullFactorialMode === 'online') {
          this.isRunning = true;
          // Start polling for run status using database run_id
          if (databaseRunId) {
            this.startStatusPolling(databaseRunId);
          } else {
            console.warn('⚠️ Full-Factorial: No database run_id, using run_directory');
            this.startStatusPolling(runDirectory);
          }
        } else {
          // Offline mode - also poll status (might complete async)
          if (databaseRunId) {
            this.startStatusPolling(databaseRunId);
          }
        }
        
        this.$emit('optimization-success', runResp.data);
        this.$emit('run-id-updated', this.currentRunId);
      } catch (e) {
        this.loading = false;
        this.errorMessage = e.response?.data?.error || e.response?.data?.message || 'Failed to run Full-Factorial.';
      } finally {
        this._ffParamsCached = null;
      }
    },
    async loadPreviousRun() {
      if (!this.selectedPreviousRun) return;
      this.loading = true;
      this.hasOptimizationData = false; // Reset data availability when loading previous run
      this.currentRunId = ''; // Reset current run ID
      this.loadedRunMetadata = null; // Clear previous metadata
      
      try {
        // Call the new load_previous_run endpoint
        const response = await axios.post('/api/load-previous-run/', {
          backup_filename: this.selectedPreviousRun
        });
        
        if (response.data.status === 'success') {
          this.loading = false;
          this.hasOptimizationData = true; // Set data availability
          this.currentRunId = response.data.run_id; // Set current run ID
          this.loadedRunMetadata = response.data.metadata; // Store metadata
          
          // Emit the loaded data to parent component
          this.$emit('optimization-success', {
            data: response.data.points,
            plot_data: response.data.points,
            run_directory: response.data.run_id,
            loaded_from_backup: true,
            backup_filename: response.data.backup_filename,
            has_zip_file: response.data.has_zip_file
          });
          
          // Emit run ID update
          this.$emit('run-id-updated', response.data.run_id);
          
          console.log('Successfully loaded previous run:', response.data);
        } else {
          throw new Error(response.data.message || 'Failed to load previous run');
        }
      } catch (error) {
        this.loading = false;
        this.errorMessage = error.response?.data?.message || error.message || 'Failed to load previous run.';
        console.error('Error loading previous run:', error);
      }
    },
    async restartFromPreviousRun() {
      if (!this.loadedRunMetadata || !this.selectedPreviousRun) return;
      try {
        this.loading = true;
        // Build traces payload from loaded metadata if available
        const traces = Array.isArray(this.loadedRunMetadata.traces)
          ? this.loadedRunMetadata.traces
          : [];
        const response = await axios.post('/api/restart-run/', {
          backup_filename: this.selectedPreviousRun,
          generations: this.restartGenerations,
          traces
        });
          if (response.data && response.data.status === 'success') {
            this.loading = false;
            this.hasOptimizationData = true;
            this.currentRunId = response.data.run_id; // e.g., restarted_run_*
            
            // Use initial points data directly from backend response
            const initialPoints = response.data.initial_points || [];
            console.log('Backend returned initial points:', initialPoints.length);
            
            // Emit to parent so plot shows original points immediately
            this.$emit('optimization-success', {
              data: initialPoints,
              plot_data: initialPoints,
              run_directory: response.data.run_id,
              restarted_from_backup: true,
              backup_filename: this.selectedPreviousRun
            });
            this.$emit('run-id-updated', response.data.run_id);
          } else {
          throw new Error(response.data?.message || 'Failed to restart run');
        }
      } catch (error) {
        console.error('Error restarting from previous run:', error);
        this.errorMessage = error.response?.data?.message || error.message || 'Failed to restart from previous run.';
        this.loading = false;
      }
    },
    async fetchBackupFiles() {
      // Only fetch if we haven't already loaded the files (avoid redundant API calls)
      if (this.previousRuns.length > 0 && !this.loadingBackupFiles) {
        console.log('[ProblemFormulation] Backup files already loaded, skipping fetch');
        return;
      }
      
      this.loadingBackupFiles = true;
      console.log('[ProblemFormulation] Fetching backup files from API...');
      try {
        const response = await axios.get('/api/list-backup-files/');
        if (response.data.status === 'success') {
          this.previousRuns = response.data.backup_files.map(backup => ({
            id: backup.filename,
            name: backup.display_name,
            date: backup.timestamp,
            filename: backup.filename
          }));
          console.log('[ProblemFormulation] Loaded backup files:', this.previousRuns.length, 'runs found');
        } else {
          throw new Error(response.data.message || 'Failed to fetch backup files');
        }
      } catch (error) {
        console.error('[ProblemFormulation] Error fetching backup files:', error);
        this.errorMessage = 'Failed to load previous optimization runs.';
      } finally {
        this.loadingBackupFiles = false;
      }
    },
    submitComparative() {
      console.log('Comparative Study button clicked');
      const payload = {
        comparative_study: true,
        model: this.sharedConfig.model,
        algorithm: this.sharedConfig.algorithm,
        population_size: this.sharedConfig.populationSize,
        generations: this.sharedConfig.generations,
        objectives: this.sharedConfig.selectedObjectives,
        trace_sets: {
          A: {
            traces: this.runAForm.traceWeights.map(tw => tw.name),
            weights: this.runAForm.traceWeights.map(tw => tw.weight)
          },
          B: {
            traces: this.runBForm.traceWeights.map(tw => tw.name),
            weights: this.runBForm.traceWeights.map(tw => tw.weight)
          }
        }
      };
      console.log('Comparative payload:', payload);
      this.loading = true;
      this.hasOptimizationData = false; // Reset data availability when starting new optimization
      runOptimization(payload)
        .then(response => {
          this.loading = false;
          this.hasOptimizationData = true; // Set data availability
          this.$emit('optimization-success', response.data); // ✅ Add this line
          this.$emit('run-id-updated', response.data.run_directory); // Emit run-id-updated
        })
        .catch(error => {
          this.loading = false;
          this.errorMessage = error.response?.data?.error || 'Failed to run comparative study.';
        });
    },
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.dropdownOpen = false;
      }
    },
    async runDataMining() {
      if (!this.hasOptimizationData) return;
      
      try {
        this.loading = true;
        console.log('Running Data Mining...');
        
        // Prepare parameters for data mining
        let miningParams = {
          evaluator: this.selectedModel
        };
        
        // Check if this is a loaded run and pass the correct file path
        if (this.currentRunId && this.currentRunId.startsWith('loaded_run_')) {
          // For loaded runs, use the temporary file path
          const tempFilePath = `/Users/ramyagotika/research-work/chiplet/chiplet-server/api/Evaluator/cascade/chiplet_model/dse/results/temp_points_${this.currentRunId}.csv`;
          miningParams.file_path = tempFilePath;
          console.log('Using loaded run file for data mining:', tempFilePath);
        }
        
        // Run rule mining
        const ruleMiningResponse = await getRuleMining(miningParams);
        console.log('Rule Mining Results:', ruleMiningResponse);
        
        // Run distance correlation
        const distanceCorrResponse = await getDistanceCorrelation(miningParams);
        console.log('Distance Correlation Results:', distanceCorrResponse);
        
        // Emit the results to parent component for display
        this.$emit('data-mining-complete', {
          ruleMining: ruleMiningResponse,
          distanceCorrelation: distanceCorrResponse
        });
        
        this.loading = false;
      } catch (error) {
        console.error('Data Mining Error:', error);
        this.errorMessage = 'Failed to run data mining analysis.';
        this.loading = false;
      }
    },
    async generateReport() {
      if (!this.hasOptimizationData) return;
      
      try {
        this.loading = true;
        console.log('Generating Report...');
        
        let reportResponse;
        
        // Check if this is a loaded run (has backup_filename)
        if (this.currentRunId && this.currentRunId.startsWith('loaded_run_')) {
          // For loaded runs, get the report from the zip file
          const backupFilename = this.selectedPreviousRun;
          if (backupFilename) {
            console.log('Getting report for loaded run:', backupFilename);
            const response = await axios.get('/api/get-previous-run-report/', {
              params: { backup_filename: backupFilename }
            });
            
            if (response.data.status === 'success') {
              reportResponse = {
                status: 'success',
                report_content: response.data.report_content,
                metadata: response.data.metadata,
                web_link: response.data.web_link,
                download_link: response.data.download_link,
                loaded_from_backup: true
              };
            } else {
              throw new Error(response.data.message || 'Failed to get report for loaded run');
            }
          } else {
            throw new Error('No backup filename available for loaded run');
          }
        } else {
          // For current runs, generate a new report
          reportResponse = await generateOptimizationReport(this.currentRunId);
        }
        
        console.log('Report Generated:', reportResponse);
        
        // Emit the report result to parent component
        this.$emit('report-generated', reportResponse);
        
        this.loading = false;
      } catch (error) {
        console.error('Report Generation Error:', error);
        this.errorMessage = 'Failed to generate report.';
        this.loading = false;
      }
    },
    handleOpenDataMining() {
      this.runDataMining();
    },
    handleComparativeReportGenerated(report) {
      this.$emit('report-generated', report);
    },
    formatObjectives(objectives) {
      if (!objectives || objectives.length === 0) {
        return 'N/A';
      }
      return objectives.join(', ');
    },
    formatTraces(traces) {
      if (!traces || traces.length === 0) {
        return 'N/A';
      }
      return traces.map(t => t.name).join(', ');
    },
    formatTimestamp(timestamp) {
      if (!timestamp) {
        return 'N/A';
      }
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },
    async pauseRun() {
      if (!this.currentRunId) return;
      try {
        await axios.post(`/api/runs/${this.currentRunId}/pause/`);
        // Optionally update state/UI
        this.loading = false;
        // Keep isRunning true if paused can be resumed; adjust if needed
        this.errorMessage = 'Run paused.';
      } catch (e) {
        this.errorMessage = e.response?.data?.message || 'Failed to pause run.';
      }
    },
    async stopRun() {
      if (!this.currentRunId) return;
      try {
        await axios.post(`/api/runs/${this.currentRunId}/stop/`);
        // Optionally update state/UI
        this.stopStatusPolling();
        this.loading = false;
        this.isRunning = false;
        this.errorMessage = 'Run stopped.';
      } catch (e) {
        this.errorMessage = e.response?.data?.message || 'Failed to stop run.';
      }
    },
    async checkRunStatus(runId) {
      if (!runId) return;
      
      // Try database run_id first, then fall back to run_directory
      let actualRunId = runId;
      
      try {
        // First try with the provided runId (could be run_id or run_directory)
        let response = await axios.get(`/api/runs/${runId}/`);
        
        // If that fails with 404, try to find the run by searching
        if (response.status === 404 || (response.data && !response.data.run)) {
          console.log(`⚠️ Run ${runId} not found, trying search...`);
          try {
            const searchResponse = await axios.get(`/api/runs/search/?q=${runId}`);
            if (searchResponse.data && searchResponse.data.runs && searchResponse.data.runs.length > 0) {
              // Found a match - use the first result's run_id
              actualRunId = searchResponse.data.runs[0].run_id;
              console.log(`✅ Found run with directory ${runId}, using database run_id: ${actualRunId}`);
              response = await axios.get(`/api/runs/${actualRunId}/`);
            }
          } catch (searchError) {
            console.error('Error searching for run:', searchError);
          }
        }
        
        if (response.data && response.data.run) {
          const runStatus = response.data.run.status;
          console.log(`✅ ProblemFormulation: Run ${actualRunId} status: ${runStatus}`);
          
          if (runStatus === 'completed') {
            this.isRunning = false;
            this.loading = false;
            this.stopStatusPolling();
            console.log('✅ ProblemFormulation: Run completed!');
            
            // Update hasOptimizationData to enable buttons
            this.hasOptimizationData = true;
          } else if (runStatus === 'failed' || runStatus === 'cancelled') {
            this.isRunning = false;
            this.loading = false;
            this.stopStatusPolling();
            this.errorMessage = `Run ${runStatus}.`;
          }
          // If status is 'running', keep polling
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.warn(`⚠️ Run ${runId} not found in database. It may still be processing...`);
          // Don't stop polling on 404 - run might not be saved yet
        } else {
          console.error('Error checking run status:', error);
        }
        // Don't stop polling on error - might be transient
      }
    },
    startStatusPolling(runId = null) {
      // Stop any existing polling
      this.stopStatusPolling();
      
      const idToPoll = runId || this.currentRunId;
      if (!idToPoll) {
        console.warn('No run ID available for status polling');
        return;
      }
      
      console.log(`✅ ProblemFormulation: Starting status polling for run ${idToPoll}`);
      
      // Poll immediately, then every 3 seconds
      this.checkRunStatus(idToPoll);
      this.statusPollingInterval = setInterval(() => {
        this.checkRunStatus(idToPoll);
      }, 3000); // Poll every 3 seconds
    },
    stopStatusPolling() {
      if (this.statusPollingInterval) {
        clearInterval(this.statusPollingInterval);
        this.statusPollingInterval = null;
        console.log('✅ ProblemFormulation: Stopped status polling');
      }
    },
    startPistilGAStatusCheck(runId, expectedPoints) {
      // Stop any existing status check
      if (this.pistilStatusCheckInterval) {
        clearInterval(this.pistilStatusCheckInterval);
      }
      
      console.log(`[ProblemFormulation] Starting Pistil GA status check for run ${runId}, expecting ${expectedPoints} points`);
      
          // Poll every 5 seconds to check if GA has completed
      this.pistilStatusCheckInterval = setInterval(async () => {
        try {
          // Check the points.csv file to see how many points have been evaluated
          const response = await axios.get('/api/chart-data/', {
            params: {
              model: 'PISTIL',
              run_id: runId,
              algorithm: 'Genetic Algorithm'
            }
          });
          
          const currentPoints = response.data?.data || [];
          const pointsCount = currentPoints.length;
          
          console.log(`[ProblemFormulation] Pistil GA status: ${pointsCount}/${expectedPoints} points evaluated`);
          
          // If we've reached the expected number of points, GA is complete
          if (pointsCount >= expectedPoints) {
            console.log(`[ProblemFormulation] Pistil GA completed! All ${expectedPoints} points evaluated.`);
            this.loading = false;
            this.hasOptimizationData = true;
            this.stopPistilGAStatusCheck();
          }
        } catch (error) {
          console.error('[ProblemFormulation] Error checking Pistil GA status:', error);
          // Don't stop checking on error - might be temporary
        }
      }, 5000); // Check every 5 seconds
    },
    stopPistilGAStatusCheck() {
      if (this.pistilStatusCheckInterval) {
        clearInterval(this.pistilStatusCheckInterval);
        this.pistilStatusCheckInterval = null;
        console.log('✅ ProblemFormulation: Stopped Pistil GA status check');
      }
    },

  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
    // Don't fetch backup files on mount - only fetch when user selects "Load previous Run"
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
    this.stopStatusPolling(); // Clean up polling on component destroy
    this.stopPistilGAStatusCheck(); // Clean up Pistil GA status check
  },
  watch: {
    // Clear selected objectives when model changes and notify parent
    selectedModel(newModel, oldModel) {
      if (newModel !== oldModel) {
        // Clear selected objectives when switching models
        if (oldModel) {
          this.selectedObjectives = [];
          console.log(`[ProblemFormulation] Model changed from ${oldModel} to ${newModel}, cleared objectives`);
        } else {
          console.log(`[ProblemFormulation] Model selected: ${newModel}`);
        }
        // Emit model change to parent so Plot can start polling
        this.$emit('model-selected', newModel);
      }
    },
    currentView(newView, oldView) {
      // Emit view change event to parent component
      this.$emit('view-changed', newView);
      
      // Fetch backup files only when user selects "Load previous Run" view
      if (newView === 'load-previous' && oldView !== 'load-previous') {
        console.log('[ProblemFormulation] Load previous Run view selected, fetching backup files...');
        this.fetchBackupFiles();
      }
    },
    fullFactorialMode(newVal) {
      // Mode changed - no action needed
    }
  }
};
</script>

<style scoped>
.problem-formulation {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}
.welcome-screen {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 300px;
}
.optimization-view, .load-previous-view, .comparative-view {
  width: 100%;
}
.welcome-header {
  margin-bottom: 2.5rem;
}
.problem-formulation-title {
  margin: 0 0 1rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.3;
}
.welcome-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 400;
  color: #2c3e50;
  line-height: 1.3;
}
.welcome-options {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  width: 100%;
  max-width: 900px;
}
.primary-action {
  width: 100%;
}
.secondary-actions {
  display: flex;
  gap: 1.5rem;
  width: 100%;
}
.welcome-btn {
  flex: 1;
  padding: 1.5rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  min-height: 140px;
  justify-content: center;
}
.primary-btn {
  background: #337aff;
  color: #fff;
  box-shadow: 0 4px 12px rgba(51, 122, 255, 0.25);
  font-size: 1.1rem;
  font-weight: 700;
  padding: 2rem;
}
.primary-btn:hover {
  background: #2356b8;
  box-shadow: 0 6px 20px rgba(51, 122, 255, 0.35);
  transform: translateY(-2px);
}
.secondary-btn {
  background: #fff;
  color: #337aff;
  border: 2px solid #337aff;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
}
.secondary-btn:hover {
  background: #f8f9ff;
  border-color: #2356b8;
  color: #2356b8;
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.12);
  transform: translateY(-1px);
}
.btn-title {
  font-weight: 700;
  font-size: 1.1rem;
}
.btn-description {
  font-size: 0.9rem;
  opacity: 0.8;
  line-height: 1.4;
  max-width: 200px;
}
.primary-btn .btn-description {
  color: rgba(255, 255, 255, 0.9);
}
.secondary-btn .btn-description {
  color: #6b7280;
}
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}
.view-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #2c3e50;
}
.back-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.back-btn:hover {
  background: #e0e6ed;
}
.load-previous-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 600px;
}
.load-previous-description {
  font-size: 1.1rem;
  color: #34495e;
  margin-bottom: 1rem;
}
.formulation-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.form-grid {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  width: 100%;
}
.form-col {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.form-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.2rem;
}
.form-select, .form-input {
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  background: #f9fafb;
  color: #2d3748;
  outline: none;
  transition: border 0.2s;
}
.form-select:focus, .form-input:focus {
  border-color: #337aff;
}
.form-select.error, .form-input.error, .custom-multiselect.error {
  border-color: #dc2626;
  background-color: #fef2f2;
}
.field-error {
  font-size: 0.8rem;
  color: #dc2626;
  margin-top: 0.2rem;
  font-weight: 500;
}
.btn {
  display: inline-block;
  font-weight: 600;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1rem;
  transition: background 0.2s, box-shadow 0.2s;
  border: none;
  outline: none;
}
.btn-primary {
  background: #337aff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.10);
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  background: #2356b8;
}
.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}
.btn-secondary {
  background: transparent;
  color: #337aff;
  border: 1.5px solid #337aff;
  box-shadow: none;
}
.btn-secondary:hover:not(:disabled) {
  background: #eaf1ff;
  color: #2356b8;
  border-color: #2356b8;
}
.btn-secondary:disabled {
  background: #f5f5f5;
  color: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}
.run-btn {
  min-width: 80px;
}
.data-mining-btn {
  min-width: 120px;
}
.generate-report-btn {
  min-width: 140px;
}

/* Estimation Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(44, 62, 80, 0.2);
  width: 100%;
  max-width: 520px;
  padding: 1.25rem 1.25rem 1rem 1.25rem;
}
.modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2c3e50;
}
.modal-body {
  color: #374151;
  font-size: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e6ed;
}
.custom-multiselect {
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  background: #f9fafb;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  position: relative;
  min-height: 2.5rem;
}
.selected-summary {
  color: #2d3748;
  font-size: 1rem;
}
.dropdown-list {
  position: absolute;
  left: 0;
  top: 110%;
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.10);
  z-index: 10;
  min-width: 200px;
  padding: 0.5rem 0;
}
.dropdown-item {
  padding: 0.25rem 1rem;
  font-size: 1rem;
}
.dropdown-item label {
  cursor: pointer;
  user-select: none;
}
.error-message {
  color: #dc2626;
  background: #fee2e2;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin: 1rem 0 0.5rem 0;
  font-weight: 600;
  text-align: center;
}
.trace-weight-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.trace-select {
  min-width: 180px;
}
.trace-weight-input {
  width: 90px;
}
.remove-trace-btn {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 1.2rem;
  cursor: pointer;
  margin-left: 0.2rem;
}
.add-trace-btn {
  margin-top: 0.3rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e0e6ed;
  border-radius: 5px;
  padding: 0.3rem 0.9rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.add-trace-btn:hover {
  background: #e0e6ed;
}
.comparative-grid {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  width: 100%;
  margin-bottom: 2rem;
}
.comparative-col {
  flex: 1 1 0;
  min-width: 320px;
  max-width: 500px;
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem 1.2rem;
  box-shadow: 0 1px 4px rgba(44, 62, 80, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.comparative-label {
  font-size: 1.15rem;
  font-weight: 700;
  color: #337aff;
  margin-bottom: 1rem;
}
.comparative-actions {
  margin-top: 1.5rem;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.comparative-shared-config {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem 1.2rem;
  box-shadow: 0 1px 4px rgba(44, 62, 80, 0.06);
  margin-bottom: 2rem;
}
.comparative-runs-row {
  display: flex;
  gap: 2.5rem;
  width: 100%;
}
.flex-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.comparative-toggle-row {
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}
.comparative-toggle {
  font-size: 1.1rem;
  color: #337aff;
  cursor: pointer;
  user-select: none;
}
.comparative-toggle input {
  margin-right: 0.5rem;
}
.loading-indicator {
  font-size: 0.9rem;
  color: #6b7280;
  margin-top: 0.5rem;
  text-align: center;
}
.no-runs-message {
  font-size: 0.9rem;
  color: #6b7280;
  margin-top: 0.5rem;
  text-align: center;
}
.loaded-run-config {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem 1.2rem;
  box-shadow: 0 1px 4px rgba(44, 62, 80, 0.06);
  margin-top: 1.5rem;
}
.config-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #337aff;
  margin-bottom: 1rem;
}
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.config-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.config-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}
.config-value {
  font-size: 0.9rem;
  color: #2d3748;
  font-weight: 500;
}

@media (max-width: 900px) {
  .form-grid {
    flex-direction: column;
    gap: 1.5rem;
  }
  .form-actions {
    justify-content: center;
  }
  .comparative-runs-row {
    flex-direction: column;
    gap: 1.5rem;
  }
  .welcome-title {
    font-size: 1.4rem;
  }
  .welcome-options {
    flex-direction: column;
    gap: 1rem;
    max-width: 500px;
  }
  .welcome-btn {
    padding: 1.2rem 1.5rem;
    min-height: auto;
  }
  .primary-btn {
    padding: 1.5rem;
  }
  .btn-title {
    font-size: 1rem;
  }
  .btn-description {
    font-size: 0.85rem;
    max-width: 100%;
  }
}
@media (max-width: 1000px) {
  .problem-formulation {
    max-width: 100%;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .welcome-title {
    font-size: 1.5rem;
  }
  .welcome-options {
    max-width: 500px;
  }
}
@media (max-width: 1100px) {
  .comparative-runs-row {
    flex-direction: column;
    gap: 1.5rem;
  }
  .comparative-col {
    max-width: 100%;
    min-width: 0;
  }
}
</style> 