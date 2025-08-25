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
          <option value="HISIM">HISIM</option>
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
        <label>Objectives:</label>
        <div class="checkbox-group">
          <label class="checkbox-option">
            <input 
              type="checkbox" 
              v-model="newRunConfig.objectives" 
              value="Energy"
            />
            <span>Energy</span>
          </label>
          <label class="checkbox-option">
            <input 
              type="checkbox" 
              v-model="newRunConfig.objectives" 
              value="Runtime"
            />
            <span>Runtime</span>
          </label>
          <label class="checkbox-option">
            <input 
              type="checkbox" 
              v-model="newRunConfig.objectives" 
              value="Temperature"
            />
            <span>Temperature</span>
          </label>
          <label class="checkbox-option">
            <input 
              type="checkbox" 
              v-model="newRunConfig.objectives" 
              value="Area"
            />
            <span>Area</span>
          </label>
        </div>
      </div>

      <!-- Traces -->
      <div class="form-group">
        <label>Traces & Weights:</label>
        <div class="trace-list">
          <div 
            v-for="trace in availableTraces" 
            :key="trace.name"
            class="trace-item"
          >
            <label class="checkbox-option">
              <input 
                type="checkbox" 
                v-model="newRunConfig.traces" 
                :value="trace"
              />
              <span>{{ trace.name }}</span>
            </label>
            <input 
              v-if="newRunConfig.traces.includes(trace)"
              type="number" 
              v-model.number="trace.weight" 
              min="0" 
              max="1" 
              step="0.1"
              class="weight-input"
              placeholder="Weight"
            />
          </div>
        </div>
        
        <!-- Weight Sum Validation -->
        <div v-if="newRunConfig.traces.length > 0" class="weight-validation">
          <small :class="['weight-sum', { 'valid': isWeightSumValid, 'invalid': !isWeightSumValid }]">
            Weight sum: {{ traceWeightsSum.toFixed(2) }} / 1.00
            <span v-if="!isWeightSumValid" class="weight-error">(Must equal 1.00)</span>
          </small>
        </div>
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

export default {
  name: 'RunSelector',
  props: {
    runLabel: {
      type: String,
      required: true
    }
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
        grid_size: 10,
        objectives: ['Energy', 'Runtime'],
        traces: []
      },
      availableTraces: [
        { name: 'gpt-j-65536-weighted', weight: 1.0 },
        { name: 'gpt-j-65536-unweighted', weight: 0.0 },
        { name: 'gpt-j-65536-mixed', weight: 0.0 },
        { name: 'gpt-j-1024-weighted', weight: 0.0 },
        { name: 'sd-test', weight: 0.0 },
        { name: 'ogbn-products-test', weight: 0.0 },
        { name: 'resnet50-test', weight: 0.0 }
      ],
      runStatus: null,
      validationErrors: [],
      selectedRunMetadata: null // New property to hold metadata for selected previous run
    };
  },
  computed: {
    selectedRunInfo() {
      if (!this.selectedPreviousRun) return null;
      return this.previousRuns.find(run => run.filename === this.selectedPreviousRun);
    },
    traceWeightsSum() {
      return this.newRunConfig.traces.reduce((sum, trace) => sum + (trace.weight || 0), 0);
    },
    isWeightSumValid() {
      return Math.abs(this.traceWeightsSum - 1.0) < 0.01;
    }
  },
  watch: {
    newRunConfig: {
      handler(newConfig) {
        this.validateNewRunConfig();
        this.emitConfigUpdate();
      },
      deep: true
    }
  },
  mounted() {
    this.fetchBackupFiles();
  },
  methods: {
    async fetchBackupFiles() {
      this.loadingBackupFiles = true;
      try {
        const response = await axios.get('/api/list-backup-files/');
        if (response.data.status === 'success') {
          this.previousRuns = response.data.backup_files.map(backup => ({
            id: backup.filename,
            name: backup.display_name,
            date: backup.timestamp,
            filename: backup.filename
          }));
        } else {
          console.warn('Backup files API returned non-success status:', response.data);
          // Don't show error to user unless they actually try to use previous runs
        }
      } catch (error) {
        console.error('Error fetching backup files:', error);
        // Only show error if user tries to select previous run and there are no runs available
        // Don't add to validationErrors immediately
      } finally {
        this.loadingBackupFiles = false;
      }
    },

    handleTypeChange() {
      this.selectedPreviousRun = '';
      this.newRunConfig = {
        model: 'CASCADE',
        algorithm: 'Genetic Algorithm',
        population_size: 50,
        generations: 100,
        grid_size: 10,
        objectives: ['Energy', 'Runtime'],
        traces: []
      };
      this.validationErrors = [];
      this.selectedRunMetadata = null; // Clear metadata when changing type
      
      // Check if previous runs are available when user selects "Previous Run"
      if (this.selectedType === 'previous') {
        this.checkPreviousRunsAvailability();
      }
      
      this.emitRunSelected(null); // Clear selection when changing type
    },

    handlePreviousRunSelected() {
      if (this.selectedPreviousRun) {
        try {
          const selectedRun = this.previousRuns.find(run => run.filename === this.selectedPreviousRun);
          if (selectedRun) {
            this.loadRunMetadata(selectedRun.filename);
            this.emitRunSelected({
              type: 'previous',
              config: {
                backup_filename: this.selectedPreviousRun,
                display_name: selectedRun.name,
                timestamp: selectedRun.date
              }
            });
          } else {
            console.error('Selected run not found in previousRuns array');
            this.validationErrors.push('Selected run not found. Please try again.');
          }
        } catch (error) {
          console.error('Error handling previous run selection:', error);
          this.validationErrors.push('Error selecting previous run. Please try again.');
        }
      } else {
        this.emitRunSelected(null);
      }
    },

    checkPreviousRunsAvailability() {
      if (this.selectedType === 'previous' && this.previousRuns.length === 0 && !this.loadingBackupFiles) {
        // Don't add this as a validation error, just show a helpful message
        console.log('No previous runs available for selection');
        // You could add a non-error message here if needed
      }
    },

    async loadRunMetadata(filename) {
      try {
        const response = await axios.post('/api/load-previous-run/', {
          backup_filename: filename
        });
        if (response.data.status === 'success') {
          this.selectedRunMetadata = response.data.metadata;
        } else {
          console.warn('Failed to load run metadata:', response.data);
          this.selectedRunMetadata = null;
        }
      } catch (error) {
        console.error('Error loading run metadata:', error);
        this.selectedRunMetadata = null;
      }
    },

    formatObjectives(objectives) {
      if (!objectives || objectives.length === 0) return 'N/A';
      return objectives.join(', ');
    },

    formatTraces(traces) {
      if (!traces || traces.length === 0) return 'N/A';
      return traces.map(trace => trace.name).join(', ');
    },

    formatTimestamp(timestamp) {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },

    validateNewRunConfig() {
      this.validationErrors = [];
      
      if (!this.newRunConfig.model) {
        this.validationErrors.push('Model selection is required.');
      }
      
      if (!this.newRunConfig.algorithm) {
        this.validationErrors.push('Algorithm selection is required.');
      }
      
      if (this.newRunConfig.algorithm === 'Genetic Algorithm') {
        if (!this.newRunConfig.population_size || this.newRunConfig.population_size < 10) {
          this.validationErrors.push('Population size must be at least 10.');
        }
        if (!this.newRunConfig.generations || this.newRunConfig.generations < 10) {
          this.validationErrors.push('Number of generations must be at least 10.');
        }
      }
      
      if (this.newRunConfig.algorithm === 'Full-Factorial') {
        if (!this.newRunConfig.grid_size || this.newRunConfig.grid_size < 5) {
          this.validationErrors.push('Grid size must be at least 5.');
        }
      }
      
      if (!this.newRunConfig.objectives || this.newRunConfig.objectives.length === 0) {
        this.validationErrors.push('At least one objective must be selected.');
      }
      
      // Only validate traces for new runs, not previous runs
      if (this.selectedType === 'new') {
        if (!this.newRunConfig.traces || this.newRunConfig.traces.length === 0) {
          this.validationErrors.push('At least one trace must be selected.');
        } else if (!this.isWeightSumValid) {
          this.validationErrors.push('Sum of trace weights must equal 1.00.');
        }
      }
    },

    emitConfigUpdate() {
      if (this.selectedType === 'new' && this.isValidNewRunConfig()) {
        this.emitRunSelected({
          type: 'new',
          config: { ...this.newRunConfig }
        });
      } else if (this.selectedType === 'previous' && this.selectedPreviousRun) {
        // For previous runs, emit the selected run data
        this.handlePreviousRunSelected();
      } else {
        // Clear the selection if validation fails
        this.emitRunSelected(null);
      }
    },

    emitRunSelected(runData = null) {
      if (runData) {
        this.$emit('run-selected', runData);
      } else {
        this.$emit('run-selected', null);
      }
    },

    isValidNewRunConfig() {
      // For previous runs, only check if a run is selected
      if (this.selectedType === 'previous') {
        return this.selectedPreviousRun !== '';
      }
      
      // For new runs, check all validation criteria
      return (
        this.newRunConfig.model &&
        this.newRunConfig.algorithm &&
        this.newRunConfig.objectives.length > 0 &&
        this.newRunConfig.traces.length > 0 &&
        this.isWeightSumValid &&
        this.validationErrors.length === 0
      );
    },

    getStatusText(status) {
      const statusTexts = {
        'idle': 'Ready',
        'running': 'Running...',
        'completed': 'Completed',
        'failed': 'Failed'
      };
      return statusTexts[status] || status;
    },

    setRunStatus(status) {
      this.runStatus = status;
    }
  }
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