<template>
  <div class="run-manager dock-window">
    <div class="dock-header">
      <span class="drag-handle">≡</span>
      <h3 class="dock-title">Run Manager</h3>
      <button v-if="closable" class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <div class="run-manager-content">
      <!-- Statistics Section -->
      <div class="stats-section">
        <h4>Overview</h4>
        <div class="stats-grid" v-if="statistics">
          <div class="stat-item">
            <div class="stat-number">{{ statistics.total_runs }}</div>
            <div class="stat-label">Total Runs</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ statistics.completed_runs }}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ statistics.total_design_points }}</div>
            <div class="stat-label">Design Points</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ statistics.total_pareto_points }}</div>
            <div class="stat-label">Pareto Points</div>
          </div>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <div class="search-section">
        <div class="search-row">
          <input 
            v-model="searchQuery" 
            placeholder="Search runs..." 
            class="search-input"
            @input="searchRuns"
          />
          <select v-model="statusFilter" class="filter-select" @change="searchRuns">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
          <select v-model="algorithmFilter" class="filter-select" @change="searchRuns">
            <option value="">All Algorithms</option>
            <option value="GA">Genetic Algorithm</option>
            <option value="NSGA2">NSGA-II</option>
            <option value="MOEA">Multi-Objective EA</option>
          </select>
        </div>
      </div>

      <!-- Runs List -->
      <div class="runs-section">
        <div class="runs-header">
          <h4>Optimization Runs</h4>
          <button @click="refreshRuns" class="refresh-btn">🔄 Refresh</button>
        </div>
        
        <div class="runs-list" v-if="runs.length > 0">
          <div 
            v-for="run in runs" 
            :key="run.run_id" 
            class="run-item"
            :class="{ 'selected': selectedRuns.includes(run.run_id) }"
            @click="toggleRunSelection(run.run_id)"
          >
            <div class="run-info">
              <div class="run-name">{{ run.name || run.run_id }}</div>
              <div class="run-details">
                <span class="run-algorithm">{{ run.algorithm }}</span>
                <span class="run-status" :class="run.status">{{ run.status }}</span>
                <span class="run-date">{{ formatDate(run.created_at) }}</span>
              </div>
              <div class="run-stats">
                <span>{{ run.total_designs_evaluated }} designs</span>
                <span>{{ run.pareto_front_size }} Pareto</span>
              </div>
            </div>
            <div class="run-actions">
              <button @click.stop="viewRunDetails(run)" class="action-btn">👁️</button>
              <button @click.stop="exportRun(run)" class="action-btn">📦</button>
              <button @click.stop="plotRun(run)" class="action-btn">📊</button>
            </div>
          </div>
        </div>
        
        <div v-else class="no-runs">
          <p>No runs found. Run an optimization to see results here.</p>
        </div>
      </div>

      <!-- Bulk Actions -->
      <div class="bulk-actions" v-if="selectedRuns.length > 0">
        <h4>Bulk Actions ({{ selectedRuns.length }} selected)</h4>
        <div class="bulk-buttons">
          <button @click="exportSelectedRuns" class="bulk-btn">📦 Export Selected</button>
          <button @click="compareSelectedRuns" class="bulk-btn" :disabled="selectedRuns.length !== 2">📊 Compare (2 runs)</button>
          <button @click="plotSelectedRuns" class="bulk-btn">📈 Plot Selected</button>
          <button @click="clearSelection" class="bulk-btn secondary">Clear Selection</button>
        </div>
      </div>

      <!-- Export Status -->
      <div v-if="exportStatus" class="export-status" :class="exportStatus.type">
        <span>{{ exportStatus.message }}</span>
        <a v-if="exportStatus.downloadUrl" :href="exportStatus.downloadUrl" target="_blank" class="download-link">
          Download
        </a>
        <button @click="exportStatus = null" class="close-status">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RunManager',
  props: {
    closable: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      runs: [],
      selectedRuns: [],
      statistics: null,
      searchQuery: '',
      statusFilter: '',
      algorithmFilter: '',
      exportStatus: null,
      loading: false
    };
  },
  async mounted() {
    await this.loadStatistics();
    await this.loadRuns();
  },
  methods: {
    async loadStatistics() {
      try {
        const response = await axios.get('/api/runs/statistics/');
        this.statistics = response.data.statistics;
      } catch (error) {
        console.error('Failed to load statistics:', error);
      }
    },

    async loadRuns() {
      try {
        this.loading = true;
        const response = await axios.get('/api/runs/');
        this.runs = response.data.runs;
      } catch (error) {
        console.error('Failed to load runs:', error);
      } finally {
        this.loading = false;
      }
    },

    async searchRuns() {
      try {
        const params = new URLSearchParams();
        if (this.searchQuery) params.append('q', this.searchQuery);
        if (this.statusFilter) params.append('status', this.statusFilter);
        if (this.algorithmFilter) params.append('algorithm', this.algorithmFilter);
        
        const response = await axios.get(`/api/runs/search/?${params.toString()}`);
        this.runs = response.data.runs;
      } catch (error) {
        console.error('Failed to search runs:', error);
      }
    },

    async refreshRuns() {
      await this.loadStatistics();
      await this.loadRuns();
    },

    toggleRunSelection(runId) {
      const index = this.selectedRuns.indexOf(runId);
      if (index > -1) {
        this.selectedRuns.splice(index, 1);
      } else {
        this.selectedRuns.push(runId);
      }
    },

    clearSelection() {
      this.selectedRuns = [];
    },

    async exportRun(run) {
      try {
        this.exportStatus = { type: 'info', message: 'Exporting run...' };
        
        const response = await axios.post(`/api/runs/${run.run_id}/export/`, {
          base_name: run.name || run.run_id
        });
        
        this.exportStatus = {
          type: 'success',
          message: response.data.message,
          downloadUrl: response.data.download_url
        };
      } catch (error) {
        this.exportStatus = {
          type: 'error',
          message: 'Export failed: ' + (error.response?.data?.message || error.message)
        };
      }
    },

    async exportSelectedRuns() {
      try {
        this.exportStatus = { type: 'info', message: 'Exporting selected runs...' };
        
        const response = await axios.post('/api/exports/multiple-runs/', {
          run_ids: this.selectedRuns,
          base_name: 'batch_export'
        });
        
        this.exportStatus = {
          type: 'success',
          message: response.data.message,
          downloadUrl: response.data.download_url
        };
      } catch (error) {
        this.exportStatus = {
          type: 'error',
          message: 'Export failed: ' + (error.response?.data?.message || error.message)
        };
      }
    },

    async compareSelectedRuns() {
      if (this.selectedRuns.length !== 2) return;
      
      try {
        const response = await axios.get('/api/runs/compare/', {
          params: {
            run_a_id: this.selectedRuns[0],
            run_b_id: this.selectedRuns[1]
          }
        });
        
        // Emit event to parent to handle comparison
        this.$emit('show-comparison', response.data.comparison);
      } catch (error) {
        console.error('Failed to compare runs:', error);
      }
    },

    async plotRun(run) {
      try {
        const response = await axios.get(`/api/runs/${run.run_id}/plot/`);
        this.$emit('plot-run', response.data.data);
      } catch (error) {
        console.error('Failed to get run data for plotting:', error);
      }
    },

    async plotSelectedRuns() {
      try {
        const response = await axios.get('/api/runs/plot/', {
          params: { run_ids: this.selectedRuns }
        });
        this.$emit('plot-runs', response.data.runs);
      } catch (error) {
        console.error('Failed to get runs data for plotting:', error);
      }
    },

    viewRunDetails(run) {
      // Emit event to show run details in a modal or separate view
      this.$emit('show-run-details', run);
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }
};
</script>

<style scoped>
.run-manager {
  min-width: 400px;
  max-width: 600px;
  height: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.run-manager-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.stats-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.search-section {
  margin-bottom: 20px;
}

.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 120px;
}

.runs-section {
  flex: 1;
}

.runs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.refresh-btn {
  padding: 6px 12px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.runs-list {
  max-height: 300px;
  overflow-y: auto;
}

.run-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.run-item:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

.run-item.selected {
  background: #e3f2fd;
  border-color: #2196f3;
}

.run-info {
  flex: 1;
}

.run-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.run-details {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.run-status {
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  text-transform: uppercase;
}

.run-status.completed {
  background: #d4edda;
  color: #155724;
}

.run-status.running {
  background: #fff3cd;
  color: #856404;
}

.run-status.failed {
  background: #f8d7da;
  color: #721c24;
}

.run-stats {
  font-size: 11px;
  color: #6c757d;
}

.run-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 4px 8px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.action-btn:hover {
  background: #f8f9fa;
}

.no-runs {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.bulk-actions {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.bulk-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.bulk-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.bulk-btn.secondary {
  background: #6c757d;
}

.export-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 6px;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  max-width: 300px;
}

.export-status.success {
  background: #28a745;
}

.export-status.error {
  background: #dc3545;
}

.export-status.info {
  background: #17a2b8;
}

.download-link {
  color: white;
  text-decoration: underline;
}

.close-status {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  margin-left: auto;
}
</style> 