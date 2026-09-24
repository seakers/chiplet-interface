<template>
  <div class="comparative-study">
    <div class="comparative-header">
      <h2>Comparative Study</h2>
      <p class="comparative-subtitle">Choose 2 optimization runs to compare and analyze:</p>
    </div>

    <!-- Error Display -->
    <div v-if="errors.length > 0" class="error-container">
      <div v-for="(error, index) in errors" :key="index" class="error-message">
        {{ error }}
      </div>
    </div>

    <!-- Run Selection Area -->
    <div class="run-selection-area">
      <div class="run-column">
        <h3>Run A</h3>
        <RunSelector 
          ref="runSelectorA"
          :runLabel="'A'"
          @run-selected="handleRunASelected"
        />
      </div>
      
      <div class="run-column">
        <h3>Run B</h3>
        <RunSelector 
          ref="runSelectorB"
          :runLabel="'B'"
          @run-selected="handleRunBSelected"
        />
      </div>
    </div>

    <div v-if="hasResults" class="objective-selection">
      <label>Objectives for Comparison (select 1–3):</label>
      <div class="checkbox-group">
        <label v-for="obj in availableObjectives" :key="obj" class="checkbox-option">
          <input type="checkbox" :value="obj" v-model="selectedObjectives"
                :disabled="!selectedObjectives.includes(obj) && selectedObjectives.length >= 3" />
          <span>{{ obj }}</span>
        </label>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button 
        class="btn btn-primary" 
        @click="runComparativeAnalysis"
        :disabled="!canRunAnalysis || isLoading"
      >
        {{ isLoading ? 'Running...' : 'Run Comparative Analysis' }}
      </button>
      
      <!-- Temporarily hidden data mining button
      <button 
        class="btn btn-secondary" 
        @click="openDataMining"
        :disabled="!hasResults"
      >
        Data Mining
      </button>
      -->
      
      <button 
        class="btn btn-secondary" 
        @click="generateComparativeReport"
        :disabled="!hasResults"
      >
        Generate Comparative Report
      </button>
    </div>

    <!-- Progress Display -->
    <div v-if="isLoading || progressMessage" class="progress-display">
      <div class="progress-content">
        <div v-if="isLoading" class="progress-spinner"></div>
        <div class="progress-message">{{ progressMessage }}</div>
        <div v-if="analysisDuration" class="progress-duration">
          Duration: {{ analysisDuration }} seconds
        </div>
      </div>
    </div>

    <!-- Results Display -->
    <div v-if="hasResults" class="results-area">
      <ComparativeResults 
        :runAData="runA.data"
        :runBData="runB.data"
      />
    </div>

    <!-- Back Button -->
    <div class="back-button-container">
      <button class="btn btn-outline" @click="$emit('back')">
        ← Back to Main Menu
      </button>
    </div>
  </div>
</template>

<script>
import RunSelector from './RunSelector.vue';
import ComparativeResults from './ComparativeResults.vue';
import { runComparativeAnalysis, generateComparativeReport } from '../services/comparativeAnalysis.js';

export default {
  name: 'ComparativeStudy',
  components: { RunSelector, ComparativeResults },
  emits: ['back', 'report-generated'],
  data() {
    return {
      runA: { type: null, config: null, data: null, status: 'idle' },
      runB: { type: null, config: null, data: null, status: 'idle' },
      isLoading: false,
      errors: [],
      progressMessage: '',
      analysisStartTime: null,
      selectedObjectives: [],
    };
  },
  computed: {
    canRunAnalysis() {
      return this.runA.config && this.runB.config && this.errors.length === 0 && !this.isLoading;
    },
    hasResults() {
      return this.runA.data && this.runB.data;
    },
    analysisDuration() {
      return this.analysisStartTime
        ? Math.round((Date.now() - this.analysisStartTime) / 1000)
        : null;
    },
    availableObjectives() {
      const model = this.runA.config?.model || this.runB.config?.model;
      if (model === 'PISTIL') {
        return ['Latency per Token','Energy per Inference','Energy per Token',
                'Average Power','System Power','System Cost','Avg Compute Util',
                'Avg Memory Util','Prefill Tokens/sec','System Compute',
                'System Bandwidth','System Capacity'];
      }
      return ['Energy','Runtime','DRAM','Memory','FLOPS'];
    },
  },
  methods: {
    handleRunASelected(runData) {
      Object.assign(this.runA, runData
        ? { type: runData.type, config: runData.config, status: 'idle' }
        : { type: null, config: null, status: 'idle' });
      this.validateRuns();
    },
    handleRunBSelected(runData) {
      Object.assign(this.runB, runData
        ? { type: runData.type, config: runData.config, status: 'idle' }
        : { type: null, config: null, status: 'idle' });
      this.validateRuns();
    },

    validateRuns() {
      this.errors = [];
      if (!this.runA.config || !this.runB.config) return;

      // Same-file check for previous runs
      if (this.runA.type === 'previous' && this.runB.type === 'previous'
          && this.runA.config.backup_filename === this.runB.config.backup_filename) {
        this.errors.push("Please select two different runs.");
        return;
      }

      // Identical new-run configs
      if (this.runA.type === 'new' && this.runB.type === 'new'
          && JSON.stringify(this.runA.config) === JSON.stringify(this.runB.config)) {
        this.errors.push("Both runs have identical configurations. Vary at least one setting.");
        return;
      }

      // Cross-evaluator comparison disallowed (report generator warns about this) [7]
      const modelA = this.runA.config.model;
      const modelB = this.runB.config.model;
      if (modelA && modelB && modelA !== modelB) {
        this.errors.push(
          `Cannot compare runs across different evaluators (Run A: ${modelA}, Run B: ${modelB}). ` +
          `Please select two runs using the same evaluator.`
        );
      }
    },

    async runComparativeAnalysis() {
      if (!this.canRunAnalysis) return;

      this.isLoading = true;
      this.analysisStartTime = Date.now();
      this.errors = [];
      this.runA.status = this.runB.status = 'running';
      this.progressMessage = 'Running comparative analysis...';

      this.$refs.runSelectorA?.setRunStatus('running');
      this.$refs.runSelectorB?.setRunStatus('running');

      try {
        const results = await runComparativeAnalysis(
          { type: this.runA.type, ...this.runA.config },
          { type: this.runB.type, ...this.runB.config }
        );

        this.runA.data = results.runA;
        this.runB.data = results.runB;
        this.runA.status = this.runB.status = 'completed';
        this.$refs.runSelectorA?.setRunStatus('completed');
        this.$refs.runSelectorB?.setRunStatus('completed');
        this.progressMessage = `Analysis completed in ${this.analysisDuration}s.`;
      } catch (err) {
        console.error('Comparative analysis failed:', err);
        this.errors.push(err.message || 'Analysis failed.');
        this.runA.status = this.runB.status = 'failed';
        this.$refs.runSelectorA?.setRunStatus('failed');
        this.$refs.runSelectorB?.setRunStatus('failed');
        this.progressMessage = 'Analysis failed. See errors above.';
      } finally {
        this.isLoading = false;
      }
    },

    async generateComparativeReport() {
      if (!this.hasResults) return;
      if (this.selectedObjectives.length < 1 || this.selectedObjectives.length > 3) {
        this.errors.push('Please select 1–3 objectives for the comparison report.');
        return;
      }
      try {
        this.progressMessage = 'Generating comparative report...';
        const report = await generateComparativeReport(
          this.runA.data, this.runB.data, this.selectedObjectives   // NEW
        );
        this.$emit('report-generated', report);
        this.progressMessage = 'Report generated.';
      } catch (err) {
        this.errors.push(`Failed to generate report: ${err.message}`);
        this.progressMessage = 'Report generation failed.';
      }
    },
  },
};
</script>

<style scoped>
.comparative-study {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 2rem 2.5rem 2.5rem 2.5rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.comparative-header {
  text-align: center;
  margin-bottom: 2rem;
}

.comparative-header h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.comparative-subtitle {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0;
}

.error-container {
  margin-bottom: 1.5rem;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  border: 1px solid #fecaca;
}

.run-selection-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.run-column {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.run-column h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1rem;
  text-align: center;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 180px;
}

.btn-primary {
  background: #337aff;
  color: white;
  box-shadow: 0 2px 8px rgba(51, 122, 255, 0.15);
}

.btn-primary:hover:not(:disabled) {
  background: #2866cc;
  box-shadow: 0 4px 16px rgba(51, 122, 255, 0.25);
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
  color: #1f2937;
}

.btn-outline {
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-outline:hover {
  background: #f9fafb;
  color: #374151;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-display {
  background: #f0f9eb;
  border: 1px solid #a7d7c5;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

.progress-message {
  font-size: 1rem;
  color: #276749;
  font-weight: 600;
}

.progress-duration {
  font-size: 0.9rem;
  color: #4a5568;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.results-area {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.back-button-container {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .run-selection-area {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 100%;
    max-width: 300px;
  }
}
</style> 