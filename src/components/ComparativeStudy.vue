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
          @run-config-updated="handleRunAConfigUpdated"
        />
      </div>
      
      <div class="run-column">
        <h3>Run B</h3>
        <RunSelector 
          ref="runSelectorB"
          :runLabel="'B'"
          @run-selected="handleRunBSelected"
          @run-config-updated="handleRunBConfigUpdated"
        />
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
        :miningResults="miningResults"
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
import { runComparativeAnalysis, loadPreviousRunForComparison, generateComparativeReport } from '../services/comparativeAnalysis.js';

export default {
  name: 'ComparativeStudy',
  components: {
    RunSelector,
    ComparativeResults
  },
  data() {
    return {
      runA: {
        type: null,        // 'previous' or 'new'
        config: null,      // selected run or form data
        data: null,        // optimization results
        status: 'idle'     // 'idle', 'running', 'completed', 'failed'
      },
      runB: {
        type: null,
        config: null,
        data: null,
        status: 'idle'
      },
      isLoading: false,
      errors: [],
      miningResults: null,
      progressMessage: '',
      analysisStartTime: null
    };
  },
  computed: {
    canRunAnalysis() {
      return this.runA.config && this.runB.config && this.errors.length === 0;
    },
    hasResults() {
      return this.runA.data && this.runB.data;
    },
    analysisDuration() {
      if (!this.analysisStartTime) return null;
      const duration = Date.now() - this.analysisStartTime;
      return Math.round(duration / 1000);
    }
  },
  methods: {
    handleRunASelected(runData) {
      if (!runData) {
        // Clear the run data when null is passed
        this.runA.type = null;
        this.runA.config = null;
        this.runA.status = 'idle';
        this.validateRuns();
        return;
      }
      
      this.runA.type = runData.type;
      this.runA.config = runData.config;
      this.runA.status = 'idle';
      this.validateRuns();
    },
    
    handleRunBSelected(runData) {
      if (!runData) {
        // Clear the run data when null is passed
        this.runB.type = null;
        this.runB.config = null;
        this.runB.status = 'idle';
        this.validateRuns();
        return;
      }
      
      this.runB.type = runData.type;
      this.runB.config = runData.config;
      this.runB.status = 'idle';
      this.validateRuns();
    },
    
    handleRunAConfigUpdated(config) {
      if (!config) {
        this.runA.config = null;
      } else {
        this.runA.config = config;
      }
      this.validateRuns();
    },
    
    handleRunBConfigUpdated(config) {
      if (!config) {
        this.runB.config = null;
      } else {
        this.runB.config = config;
      }
      this.validateRuns();
    },
    
    validateRuns() {
      this.errors = [];
      
      // Check if both runs are selected
      if (!this.runA.config || !this.runB.config) {
        return; // Don't show error until both are configured
      }
      
      // Check for same run selection (only for previous runs)
      if (this.runA.type === 'previous' && this.runB.type === 'previous') {
        if (this.runA.config.backup_filename === this.runB.config.backup_filename) {
          this.errors.push("You can't choose same runs for comparison. Please select different runs.");
          return;
        }
      }
      
      // Check for identical configurations (only for new runs)
      if (this.runA.type === 'new' && this.runB.type === 'new') {
        if (JSON.stringify(this.runA.config) === JSON.stringify(this.runB.config)) {
          this.errors.push("Both runs have identical configurations. Please modify one of the runs for meaningful comparison.");
          return;
        }
      }
      
      // Additional validation for new runs
      if (this.runA.type === 'new' && this.runA.config) {
        this.validateNewRunConfig(this.runA.config, 'Run A');
      }
      if (this.runB.type === 'new' && this.runB.config) {
        this.validateNewRunConfig(this.runB.config, 'Run B');
      }
    },
    
    validateNewRunConfig(config, runLabel) {
      if (!config) {
        this.errors.push(`${runLabel}: Configuration is required.`);
        return;
      }
      
      if (!config.model) {
        this.errors.push(`${runLabel}: Model selection is required.`);
      }
      
      if (!config.algorithm) {
        this.errors.push(`${runLabel}: Algorithm selection is required.`);
      }
      
      if (!config.objectives || config.objectives.length === 0) {
        this.errors.push(`${runLabel}: At least one objective must be selected.`);
      }
      
      // Only validate traces for new runs, not previous runs
      if (config.type === 'new') {
        if (!config.traces || config.traces.length === 0) {
          this.errors.push(`${runLabel}: At least one trace must be selected.`);
        } else {
          // Check trace weights sum
          const weightSum = config.traces.reduce((sum, trace) => sum + (trace.weight || 0), 0);
          if (Math.abs(weightSum - 1.0) > 0.01) {
            this.errors.push(`${runLabel}: Sum of trace weights must equal 1.00 (current: ${weightSum.toFixed(2)}).`);
          }
        }
      }
      
      if (config.algorithm === 'Genetic Algorithm') {
        if (!config.population_size || config.population_size < 10) {
          this.errors.push(`${runLabel}: Population size must be at least 10.`);
        }
        if (!config.generations || config.generations < 10) {
          this.errors.push(`${runLabel}: Number of generations must be at least 10.`);
        }
      }
      
      if (config.algorithm === 'Full-Factorial') {
        if (!config.grid_size || config.grid_size < 5) {
          this.errors.push(`${runLabel}: Grid size must be at least 5.`);
        }
      }
    },
    
    async runComparativeAnalysis() {
      if (!this.canRunAnalysis) return;
      
      this.isLoading = true;
      this.analysisStartTime = Date.now();
      this.runA.status = 'running';
      this.runB.status = 'running';
      this.errors = []; // Clear previous errors
      this.progressMessage = 'Initializing comparative analysis...';
      
      // Update RunSelector status
      if (this.$refs.runSelectorA) {
        this.$refs.runSelectorA.setRunStatus('running');
      }
      if (this.$refs.runSelectorB) {
        this.$refs.runSelectorB.setRunStatus('running');
      }
      
      try {
        // Prepare configurations for API
        const runAConfig = this.prepareRunConfig(this.runA);
        const runBConfig = this.prepareRunConfig(this.runB);
        
        this.progressMessage = 'Running parallel optimization...';
        
        // Run comparative analysis
        const results = await runComparativeAnalysis(runAConfig, runBConfig);
        
        // Update results
        this.runA.data = results.runA;
        this.runB.data = results.runB;
        this.miningResults = results.mining;
        
        this.runA.status = 'completed';
        this.runB.status = 'completed';
        
        // Update RunSelector status
        if (this.$refs.runSelectorA) {
          this.$refs.runSelectorA.setRunStatus('completed');
        }
        if (this.$refs.runSelectorB) {
          this.$refs.runSelectorB.setRunStatus('completed');
        }
        
        this.progressMessage = `Analysis completed successfully in ${this.analysisDuration} seconds!`;
        
        console.log('Comparative analysis completed successfully!', results);
        
      } catch (error) {
        console.error('Comparative analysis failed:', error);
        this.errors.push(`Comparative analysis failed: ${error.message}`);
        this.runA.status = 'failed';
        this.runB.status = 'failed';
        
        // Update RunSelector status
        if (this.$refs.runSelectorA) {
          this.$refs.runSelectorA.setRunStatus('failed');
        }
        if (this.$refs.runSelectorB) {
          this.$refs.runSelectorB.setRunStatus('failed');
        }
        
        this.progressMessage = 'Analysis failed. Please check the error messages above.';
      } finally {
        this.isLoading = false;
      }
    },
    
    prepareRunConfig(run) {
      if (run.type === 'previous') {
        return {
          type: 'previous',
          backup_filename: run.config.backup_filename,
          display_name: run.config.display_name,
          timestamp: run.config.timestamp
        };
      } else {
        return {
          type: 'new',
          model: run.config.model,
          algorithm: run.config.algorithm,
          population_size: run.config.population_size,
          generations: run.config.generations,
          grid_size: run.config.grid_size,
          objectives: run.config.objectives,
          traces: run.config.traces.map(trace => ({
            name: trace.name,
            weight: trace.weight
          }))
        };
      }
    },
    
    async openDataMining() {
      if (!this.hasResults) return;
      
      try {
        // Emit event to parent for data mining display
        this.$emit('open-data-mining', this.miningResults);
      } catch (error) {
        console.error('Error opening data mining:', error);
        this.errors.push(`Failed to open data mining: ${error.message}`);
      }
    },
    
    async generateComparativeReport() {
      if (!this.hasResults) return;
      
      try {
        this.progressMessage = 'Generating comparative report...';
        
        const report = await generateComparativeReport(
          this.runA.data,
          this.runB.data,
          this.miningResults
        );
        
        // Emit report to parent
        this.$emit('report-generated', report);
        
        this.progressMessage = 'Report generated successfully!';
        
      } catch (error) {
        console.error('Error generating comparative report:', error);
        this.errors.push(`Failed to generate report: ${error.message}`);
        this.progressMessage = 'Report generation failed.';
      }
    }
  }
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