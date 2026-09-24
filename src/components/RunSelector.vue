<template>
  <div class="run-selector">
    <!-- Run Type Selection -->
    <div class="run-type-selection">
      <label class="run-type-label">Run Type:</label>
      <div class="radio-group">
        <label class="radio-option">
          <input 
            type="radio" 
            v-model="selectedType" 
            value="previous"
            @change="handleTypeChange"
          />
          <span class="radio-text">Previous Run</span>
        </label>
        <label class="radio-option">
          <input 
            type="radio" 
            v-model="selectedType" 
            value="new"
            @change="handleTypeChange"
          />
          <span class="radio-text">New Run</span>
        </label>
      </div>
    </div>

    <!-- Previous Run Selection -->
    <div v-if="selectedType === 'previous'" class="previous-run-section">
      <label class="section-label">Select Previous Run:</label>
      <select 
        v-model="selectedPreviousRun" 
        @change="handlePreviousRunSelected"
        class="run-dropdown"
        :disabled="loadingBackupFiles"
      >
        <option value="">Choose a previous run...</option>
        <option 
          v-for="run in previousRuns" 
          :key="run.id" 
          :value="run.filename"
        >
          {{ run.name }} ({{ run.date }})
        </option>
      </select>
      
      <div v-if="loadingBackupFiles" class="loading-message">
        <div class="loading-spinner"></div>
        Loading previous runs...
      </div>
      
      <div v-if="!loadingBackupFiles && previousRuns.length === 0" class="no-runs-message">
        No previous optimization runs found.
      </div>

      <!-- Selected Run Info -->
      <div v-if="selectedPreviousRun && selectedRunInfo" class="selected-run-info">
        <h4>Selected Run Details:</h4>
        <div class="run-details">
          <p><strong>Name:</strong> {{ selectedRunInfo.name }}</p>
          <p><strong>Date:</strong> {{ selectedRunInfo.date }}</p>
          <p><strong>Status:</strong> <span class="status-badge completed">Completed</span></p>
        </div>
        
        <!-- Loaded Run Configuration Display -->
        <div v-if="selectedRunMetadata" class="loaded-run-config">
          <h5 class="config-title">Run Configuration</h5>
          <div class="config-grid">
            <div class="config-item">
              <span class="config-label">Model:</span>
              <span class="config-value">{{ selectedRunMetadata.model || 'N/A' }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Algorithm:</span>
              <span class="config-value">{{ selectedRunMetadata.algorithm || 'N/A' }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Objectives:</span>
              <span class="config-value">{{ formatObjectives(selectedRunMetadata.objectives) }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Traces:</span>
              <span class="config-value">{{ formatTraces(selectedRunMetadata.traces) }}</span>
            </div>
            <div v-if="selectedRunMetadata.population_size" class="config-item">
              <span class="config-label">Population Size:</span>
              <span class="config-value">{{ selectedRunMetadata.population_size }}</span>
            </div>
            <div v-if="selectedRunMetadata.generations" class="config-item">
              <span class="config-label">Generations:</span>
              <span class="config-value">{{ selectedRunMetadata.generations }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Timestamp:</span>
              <span class="config-value">{{ formatTimestamp(selectedRunMetadata.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Run Form -->
    <div v-if="selectedType === 'new'" class="new-run-section">
      <label class="section-label">Configure New Run:</label>
      
      <!-- Model Selection -->
      <div class="form-group">
        <label>Model:</label>
        <select v-model="newRunConfig.model" class="form-select">
          <option value="CASCADE">CASCADE</option>
          <option value="PISTIL">PISTIL</option>
        </select>
      </div>

      <!-- Algorithm Selection -->
      <div class="form-group">
        <label>Algorithm:</label>
        <select v-model="newRunConfig.algorithm" class="form-select">
          <option value="Genetic Algorithm">Genetic Algorithm</option>
          <option value="Full-Factorial">Full-Factorial</option>
        </select>
      </div>

      <!-- Population Size (for Genetic Algorithm) -->
      <div v-if="newRunConfig.algorithm === 'Genetic Algorithm'" class="form-group">
        <label>Population Size:</label>
        <input 
          type="number" 
          v-model.number="newRunConfig.population_size" 
          min="10" 
          max="200" 
          class="form-input"
        />
        <small class="form-help">Recommended: 50-100</small>
      </div>

      <!-- Generations (for Genetic Algorithm) -->
      <div v-if="newRunConfig.algorithm === 'Genetic Algorithm'" class="form-group">
        <label>Generations:</label>
        <input 
          type="number" 
          v-model.number="newRunConfig.generations" 
          min="10" 
          max="500" 
          class="form-input"
        />
        <small class="form-help">Recommended: 100-200</small>
      </div>

      <!-- Grid Size (for Full-Factorial) -->
      <div v-if="newRunConfig.algorithm === 'Full-Factorial'" class="form-group">
        <label>Grid Size:</label>
        <input 
          type="number" 
          v-model.number="newRunConfig.grid_size" 
          min="5" 
          max="50" 
          class="form-input"
        />
        <small class="form-help">Recommended: 10-20</small>
      </div>

      <!-- Objectives -->
      <div class="form-group">
        <label>Objectives ({{ newRunConfig.model }}):</label>
        <small class="form-help">Select 1–3 objectives</small>
        <div class="checkbox-group">
          <label
            v-for="obj in availableObjectives"
            :key="obj"
            class="checkbox-option"
          >
            <input
              type="checkbox"
              :value="obj"
              v-model="newRunConfig.objectives"
              :disabled="!newRunConfig.objectives.includes(obj) && newRunConfig.objectives.length >= 3"
            />
            <span>{{ obj }}</span>
          </label>
        </div>
      </div>

      <!-- CASCADE: Traces + Weights -->
      <div v-if="newRunConfig.model === 'CASCADE'" class="form-group">
        <label>Traces & Weights:</label>
        <div class="trace-list">
          <div v-for="(t, idx) in newRunConfig.traces" :key="idx" class="trace-item">
            <select v-model="t.name" class="form-select">
              <option v-for="name in availableTraceNames" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
            <input
              type="number"
              v-model.number="t.weight"
              min="0"
              max="1"
              step="0.05"
              class="weight-input"
              placeholder="Weight"
            />
            <button type="button" class="remove-trace-btn" @click="removeTrace(idx)">✕</button>
          </div>
          <button type="button" class="add-trace-btn" @click="addTrace">+ Add Trace</button>
        </div>
        <div v-if="newRunConfig.traces.length > 0" class="weight-validation">
          <small :class="['weight-sum', { valid: isWeightSumValid, invalid: !isWeightSumValid }]">
            Weight sum: {{ traceWeightsSum.toFixed(2) }} / 1.00
            <span v-if="!isWeightSumValid" class="weight-error">(must equal 1.00)</span>
          </small>
        </div>
      </div>

      <!-- PISTIL: Model selection -->
      <div v-if="newRunConfig.model === 'PISTIL'" class="form-group">
        <label>PISTIL Model:</label>
        <select v-model="newRunConfig.pistil_model" class="form-select">
          <option v-for="m in availablePistilModels" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <!-- Full-Factorial (CASCADE only) -->
      <div v-if="newRunConfig.algorithm === 'Full-Factorial' && newRunConfig.model === 'CASCADE'" class="form-group">
        <label>Total chiplet slots:</label>
        <input type="number" v-model.number="newRunConfig.num_slots" min="1" max="20" class="form-input" />
      </div>

      <!-- Configuration Summary -->
      <div v-if="isValidNewRunConfig()" class="config-summary">
        <h4>Configuration Summary:</h4>
        <div class="summary-details">
          <p><strong>Model:</strong> {{ newRunConfig.model }}</p>
          <p><strong>Algorithm:</strong> {{ newRunConfig.algorithm }}</p>
          <p v-if="newRunConfig.algorithm === 'Genetic Algorithm'">
            <strong>Parameters:</strong> Population {{ newRunConfig.population_size }}, {{ newRunConfig.generations }} generations
          </p>
          <p v-if="newRunConfig.algorithm === 'Full-Factorial'">
            <strong>Parameters:</strong> Grid size {{ newRunConfig.grid_size }}
          </p>
          <p><strong>Objectives:</strong> {{ newRunConfig.objectives.join(', ') }}</p>
          <p><strong>Traces:</strong> {{ newRunConfig.traces.length }} selected</p>
        </div>
      </div>
    </div>

    <!-- Status Display -->
    <div v-if="runStatus" class="status-display">
      <div :class="['status-indicator', runStatus]">
        {{ getStatusText(runStatus) }}
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="validationErrors.length > 0" class="validation-errors">
      <div v-for="(error, index) in validationErrors" :key="index" class="validation-error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

const CASCADE_OBJECTIVES = ['Energy', 'Runtime', 'DRAM', 'Memory', 'FLOPS'];
const PISTIL_OBJECTIVES = [
  'Latency per Token', 'Energy per Inference', 'Energy per Token',
  'Average Power', 'System Power', 'System Cost',
  'Avg Compute Util', 'Avg Memory Util', 'Prefill Tokens/sec',
  'System Compute', 'System Bandwidth', 'System Capacity',
];
const CASCADE_TRACES = [
  'gpt-j-65536-weighted', 'gpt-j-1024-weighted',
  'sd-test', 'ogbn-products-test', 'resnet50-test',
];
const PISTIL_MODELS = ['llama3-8b'];

export default {
  name: 'RunSelector',
  props: {
    runLabel: { type: String, required: true },
  },
  data() {
    return {
      selectedType: null,
      selectedPreviousRun: '',
      previousRuns: [],
      loadingBackupFiles: false,
      newRunConfig: {
        model: 'CASCADE',
        algorithm: 'Genetic Algorithm',
        population_size: 50,
        generations: 100,
        num_slots: 12,               // CASCADE full-factorial
        selected_chiplet_types: ['GPU', 'Attention', 'Sparse', 'Convolution'],
        objectives: [],
        traces: [{ name: 'gpt-j-65536-weighted', weight: 1.0 }],
        pistil_model: 'llama3-8b',
      },
      runStatus: null,
      validationErrors: [],
      selectedRunMetadata: null,
    };
  },
  computed: {
    availableObjectives() {
      return this.newRunConfig.model === 'PISTIL' ? PISTIL_OBJECTIVES : CASCADE_OBJECTIVES;
    },
    availableTraceNames() {
      return CASCADE_TRACES;
    },
    availablePistilModels() {
      return PISTIL_MODELS;
    },
    selectedRunInfo() {
      if (!this.selectedPreviousRun) return null;
      return this.previousRuns.find(r => r.filename === this.selectedPreviousRun);
    },
    traceWeightsSum() {
      return this.newRunConfig.traces.reduce((s, t) => s + (Number(t.weight) || 0), 0);
    },
    isWeightSumValid() {
      return Math.abs(this.traceWeightsSum - 1.0) < 0.01;
    },
  },
  watch: {
    newRunConfig: {
      handler() {
        this.validateNewRunConfig();
        this.emitConfigUpdate();
      },
      deep: true,
    },
    'newRunConfig.model'(newModel, oldModel) {
      if (newModel !== oldModel) {
        // Reset objectives since they differ per model
        this.newRunConfig.objectives = [];
      }
    },
  },
  mounted() {
    this.fetchBackupFiles();
  },
  methods: {
    async fetchBackupFiles() {
      this.loadingBackupFiles = true;
      try {
        const resp = await axios.get('/api/list-backup-files/');
        if (resp.data.status === 'success') {
          this.previousRuns = resp.data.backup_files.map(b => ({
            id: b.filename,
            name: b.display_name,
            date: b.timestamp,
            filename: b.filename,
            evaluator: b.evaluator,          // 'CASCADE' or 'PISTIL'
          }));
        }
      } catch (e) {
        console.error('Error fetching backup files:', e);
      } finally {
        this.loadingBackupFiles = false;
      }
    },

    handleTypeChange() {
      this.selectedPreviousRun = '';
      this.selectedRunMetadata = null;
      this.validationErrors = [];
      this.emitRunSelected(null);
    },

    async handlePreviousRunSelected() {
      if (!this.selectedPreviousRun) {
        this.emitRunSelected(null);
        return;
      }
      const run = this.previousRuns.find(r => r.filename === this.selectedPreviousRun);
      if (!run) return;

      try {
        const resp = await axios.post('/api/load-previous-run/', {
          backup_filename: this.selectedPreviousRun,
        });
        if (resp.data.status === 'success') {
          this.selectedRunMetadata = resp.data.metadata || {};
          // Infer evaluator from metadata OR filename
          const evaluator =
            this.selectedRunMetadata.model ||
            resp.data.evaluator ||
            (this.selectedPreviousRun.startsWith('pistil_run_') ? 'PISTIL' : 'CASCADE');

          this.emitRunSelected({
            type: 'previous',
            config: {
              backup_filename: this.selectedPreviousRun,
              display_name: run.name,
              timestamp: run.date,
              model: evaluator,
              objectives: this.selectedRunMetadata.objectives || [],
            },
          });
        }
      } catch (e) {
        console.error('Error loading previous run metadata:', e);
        this.selectedRunMetadata = null;
      }
    },

    validateNewRunConfig() {
      this.validationErrors = [];
      const c = this.newRunConfig;

      if (!c.model) this.validationErrors.push('Model is required.');
      if (!c.algorithm) this.validationErrors.push('Algorithm is required.');
      if (!c.objectives || c.objectives.length === 0) {
        this.validationErrors.push('At least one objective is required.');
      } else if (c.objectives.length > 3) {
        this.validationErrors.push('At most 3 objectives are supported.');
      }

      if (c.algorithm === 'Genetic Algorithm') {
        if (!c.population_size || c.population_size < 10)
          this.validationErrors.push('Population size must be ≥ 10.');
        if (!c.generations || c.generations < 10)
          this.validationErrors.push('Generations must be ≥ 10.');
      }
      if (c.algorithm === 'Full-Factorial' && c.model === 'CASCADE') {
        if (!c.num_slots || c.num_slots < 1)
          this.validationErrors.push('Number of chiplet slots must be ≥ 1.');
        if (!c.selected_chiplet_types || c.selected_chiplet_types.length === 0)
          this.validationErrors.push('Select at least one chiplet type.');
      }

      // Traces only apply to CASCADE
      if (c.model === 'CASCADE') {
        if (!c.traces || c.traces.length === 0) {
          this.validationErrors.push('At least one trace is required.');
        } else if (!this.isWeightSumValid) {
          this.validationErrors.push(
            `Trace weights must sum to 1.00 (currently ${this.traceWeightsSum.toFixed(2)}).`
          );
        }
      }
    },

    isValidNewRunConfig() {
      if (this.selectedType === 'previous') return !!this.selectedPreviousRun;
      return this.validationErrors.length === 0
        && this.newRunConfig.objectives.length > 0
        && this.newRunConfig.model
        && this.newRunConfig.algorithm;
    },

    emitConfigUpdate() {
      if (this.selectedType === 'new' && this.isValidNewRunConfig()) {
        this.emitRunSelected({
          type: 'new',
          config: JSON.parse(JSON.stringify(this.newRunConfig)),
        });
      } else if (this.selectedType === 'previous' && this.selectedPreviousRun) {
        // Already emitted in handlePreviousRunSelected
      } else {
        this.emitRunSelected(null);
      }
    },

    emitRunSelected(runData) {
      this.$emit('run-selected', runData);
    },

    addTrace() {
      this.newRunConfig.traces.push({ name: CASCADE_TRACES[0], weight: 0.0 });
    },
    removeTrace(idx) {
      this.newRunConfig.traces.splice(idx, 1);
    },

    formatObjectives(objs) {
      return (objs && objs.length) ? objs.join(', ') : 'N/A';
    },

    formatTraces(traces) {
      if (!traces || traces.length === 0) return 'N/A';
      return traces.map(t => (typeof t === 'string' ? t : t.name)).join(', ');
    },

    formatTimestamp(ts) {
      if (!ts) return 'N/A';
      const d = new Date(ts);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    },

    getStatusText(status) {
      return { idle: 'Ready', running: 'Running...', completed: 'Completed', failed: 'Failed' }[status] || status;
    },

    setRunStatus(status) {
      this.runStatus = status;
    },
  },
};
</script>

<style scoped>
.run-selector {
  width: 100%;
}

.run-type-selection {
  margin-bottom: 1.5rem;
}

.run-type-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  margin: 0;
}

.radio-text {
  font-size: 0.9rem;
  color: #4b5563;
}

.section-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.run-dropdown {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
}

.run-dropdown:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.loading-message {
  font-size: 0.9rem;
  color: #6b7280;
  margin-top: 0.5rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #337aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-runs-message {
  font-size: 0.9rem;
  color: #6b7280;
  margin-top: 0.5rem;
  text-align: center;
}

.selected-run-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
}

.selected-run-info h4 {
  margin: 0 0 0.5rem 0;
  color: #0369a1;
  font-size: 0.9rem;
}

.run-details p {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: #374151;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.loaded-run-config {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.loaded-run-config .config-title {
  font-size: 0.9rem;
  color: #374151;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.loaded-run-config .config-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loaded-run-config .config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #4b5563;
  padding: 0.25rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.loaded-run-config .config-item:last-child {
  border-bottom: none;
}

.loaded-run-config .config-label {
  font-weight: 500;
  color: #374151;
}

.loaded-run-config .config-value {
  font-weight: 600;
  color: #1d4ed8;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.form-select, .form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-help {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.checkbox-option input[type="checkbox"] {
  margin: 0;
}

.trace-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.trace-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.weight-input {
  width: 80px;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
}

.weight-validation {
  margin-top: 0.5rem;
}

.weight-sum {
  font-size: 0.8rem;
  font-weight: 500;
}

.weight-sum.valid {
  color: #059669;
}

.weight-sum.invalid {
  color: #dc2626;
}

.weight-error {
  font-weight: 600;
}

.config-summary {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.config-summary h4 {
  margin: 0 0 0.75rem 0;
  color: #374151;
  font-size: 0.9rem;
}

.summary-details p {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: #4b5563;
}

.status-display {
  margin-top: 1rem;
}

.status-indicator {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
}

.status-indicator.idle {
  background: #f3f4f6;
  color: #6b7280;
}

.status-indicator.running {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-indicator.completed {
  background: #dcfce7;
  color: #166534;
}

.status-indicator.failed {
  background: #fee2e2;
  color: #dc2626;
}

.validation-errors {
  margin-top: 1rem;
}

.validation-error {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  border: 1px solid #fecaca;
}
</style> 