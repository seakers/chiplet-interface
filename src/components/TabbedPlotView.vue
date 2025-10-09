<template>
  <div class="tabbed-plot-view">
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { 'active': activeTab === tab.id }]"
        @click="setActiveTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Run A Tab -->
      <div v-if="activeTab === 'runA'" class="tab-panel">
        <div class="run-header">
          <h3>Run A Results</h3>
          <div class="run-stats">
            <span class="stat-item">
              <strong>Points:</strong> {{ runAData.points }}
            </span>
            <span class="stat-item">
              <strong>Pareto:</strong> {{ runAData.pareto }}
            </span>
            <span class="stat-item">
              <strong>Best Energy:</strong> {{ formatEnergy(runAData.bestEnergy) }}
            </span>
            <span class="stat-item">
              <strong>Best Time:</strong> {{ formatTime(runAData.bestTime) }}
            </span>
          </div>
        </div>
        <div class="plot-container">
          <Plot 
            :isComparative="false"
            :currentRunId="runAData.runId || 'runA'"
            :runLabel="'A'"
            ref="plotA"
          />
        </div>
      </div>

      <!-- Run B Tab -->
      <div v-if="activeTab === 'runB'" class="tab-panel">
        <div class="run-header">
          <h3>Run B Results</h3>
          <div class="run-stats">
            <span class="stat-item">
              <strong>Points:</strong> {{ runBData.points }}
            </span>
            <span class="stat-item">
              <strong>Pareto:</strong> {{ runBData.pareto }}
            </span>
            <span class="stat-item">
              <strong>Best Energy:</strong> {{ formatEnergy(runBData.bestEnergy) }}
            </span>
            <span class="stat-item">
              <strong>Best Time:</strong> {{ formatTime(runBData.bestTime) }}
            </span>
          </div>
        </div>
        <div class="plot-container">
          <Plot 
            :isComparative="false"
            :currentRunId="runBData.runId || 'runB'"
            :runLabel="'B'"
            ref="plotB"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Plot from './Plot.vue';
import axios from 'axios';

export default {
  name: 'TabbedPlotView',
  components: {
    Plot
  },
  props: {
    runAData: {
      type: Object,
      required: true
    },
    runBData: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      activeTab: 'runA',
      tabs: [
        { id: 'runA', label: 'Run A' },
        { id: 'runB', label: 'Run B' }
      ]
    };
  },
  methods: {
    setActiveTab(tabId) {
      this.activeTab = tabId;
      // Refresh the plot for the newly active tab
      this.$nextTick(() => {
        if (tabId === 'runA') {
          this.updatePlotA();
        } else if (tabId === 'runB') {
          this.updatePlotB();
        }
      });
    },
    formatEnergy(energy) {
      if (!energy) return 'N/A';
      return `${(energy / 1000).toFixed(1)} kJ`;
    },
    formatTime(time) {
      if (!time) return 'N/A';
      return `${time} ms`;
    },
    async fetchComparativeData() {
      // Prefer run-scoped comparison using selected run IDs; fallback to legacy CSV-based endpoint
      const runAId = this.runAData && this.runAData.runId ? this.runAData.runId : null;
      const runBId = this.runBData && this.runBData.runId ? this.runBData.runId : null;
      if (runAId && runBId) {
        try {
          const resp = await axios.get('/api/runs/compare/', {
            params: { run_a_id: runAId, run_b_id: runBId }
          });
          if (resp.data && resp.data.status === 'success' && resp.data.comparison) {
            const runA = (resp.data.comparison.run_a && resp.data.comparison.run_a.design_points) || [];
            const runB = (resp.data.comparison.run_b && resp.data.comparison.run_b.design_points) || [];
            // Attach run labels so existing filtering works
            const combined = [
              ...runA.map(pt => ({ ...pt, run: 'A' })),
              ...runB.map(pt => ({ ...pt, run: 'B' }))
            ];
            return combined;
          }
        } catch (error) {
          console.error('Error fetching comparison by run IDs, falling back:', error);
        }
      }
      // Fallback: legacy endpoint reading default CSVs
      try {
        const response = await fetch('http://127.0.0.1:8000/api/chart-data/?comparative=true');
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error('Error fetching comparative data (legacy):', error);
        return [];
      }
    },
    filterDataForRun(allData, runLabel) {
      return allData.filter(point => point.run === runLabel);
    },
    async updatePlotA() {
      if (this.$refs.plotA) {
        console.log('Updating Plot A');
        const allData = await this.fetchComparativeData();
        const runAData = this.filterDataForRun(allData, 'A');
        console.log('Run A filtered data:', runAData);
        if (runAData.length > 0) {
          this.$refs.plotA.updateChartData(runAData);
        } else {
          console.log('No Run A data available');
        }
      } else {
        console.log('Plot A ref not available');
      }
    },
    async updatePlotB() {
      if (this.$refs.plotB) {
        console.log('Updating Plot B');
        const allData = await this.fetchComparativeData();
        const runBData = this.filterDataForRun(allData, 'B');
        console.log('Run B filtered data:', runBData);
        if (runBData.length > 0) {
          this.$refs.plotB.updateChartData(runBData);
        } else {
          console.log('No Run B data available');
        }
      } else {
        console.log('Plot B ref not available');
      }
    },
    async updateBothPlots() {
      console.log('Updating both plots');
      await this.updatePlotA();
      await this.updatePlotB();
    },
    async forceRefreshPlots() {
      console.log('Force refreshing both plots');
      // Clear any cached data and refetch
      const allData = await this.fetchComparativeData();
      console.log('Fetched comparative data:', allData.length, 'points');
      
      if (this.$refs.plotA) {
        const runAData = this.filterDataForRun(allData, 'A');
        console.log('Run A data for refresh:', runAData.length, 'points');
        this.$refs.plotA.updateChartData(runAData);
      }
      
      if (this.$refs.plotB) {
        const runBData = this.filterDataForRun(allData, 'B');
        console.log('Run B data for refresh:', runBData.length, 'points');
        this.$refs.plotB.updateChartData(runBData);
      }
    }
  },
  watch: {
    runAData: {
      handler(newData) {
        console.log('Run A data changed:', newData);
        this.$nextTick(async () => {
          try {
            await this.updatePlotA();
          } catch (error) {
            console.error('Error updating Plot A:', error);
          }
        });
      },
      deep: true
    },
    runBData: {
      handler(newData) {
        console.log('Run B data changed:', newData);
        this.$nextTick(async () => {
          try {
            await this.updatePlotB();
          } catch (error) {
            console.error('Error updating Plot B:', error);
          }
        });
      },
      deep: true
    }
  },
  mounted() {
    // Initialize plots when component is mounted
    this.$nextTick(async () => {
      // Add a small delay to ensure Plot components are fully mounted
      setTimeout(async () => {
        console.log('Initializing plots after mount');
        await this.updateBothPlots();
      }, 500);
    });
  }
};
</script>

<style scoped>
.tabbed-plot-view {
  width: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
}

.tab-navigation {
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.tab-button {
  flex: 1;
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.tab-button:hover {
  background: #f1f5f9;
  color: #374151;
}

.tab-button.active {
  background: #fff;
  color: #337aff;
  border-bottom-color: #337aff;
}

.tab-content {
  min-height: 500px;
}

.tab-panel {
  padding: 1.5rem;
}

.run-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.run-header h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
}

.run-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.stat-item {
  font-size: 0.9rem;
  color: #4b5563;
}

.stat-item strong {
  color: #374151;
}

.plot-container {
  min-height: 400px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fafbfc;
}

.comparison-header {
  margin-bottom: 1.5rem;
  text-align: center;
}

.comparison-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
}

.comparison-subtitle {
  margin: 0;
  font-size: 1rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .tab-navigation {
    flex-direction: column;
  }
  
  .tab-button {
    padding: 0.75rem 1rem;
  }
  
  .run-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .stat-item {
    font-size: 0.85rem;
  }
}
</style> 