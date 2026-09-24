<template>
  <div class="tabbed-plot-view">
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="setActiveTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Run A -->
      <div v-if="activeTab === 'runA'" class="tab-panel">
        <div class="run-header">
          <h3>Run A Results ({{ runAData.model || 'CASCADE' }})</h3>
          <div class="run-stats">
            <span
              v-for="stat in runAStats"
              :key="stat.label"
              class="stat-item"
            >
              <strong>{{ stat.label }}:</strong> {{ stat.value }}
            </span>
          </div>
        </div>
        <div class="plot-container">
          <Plot
            ref="plotA"
            :isComparative="false"
            :currentRunId="runAData.runId || 'runA'"
            :model="runAData.model || 'CASCADE'"
            :selectedObjectives="runAData.objectives || []"
            :runLabel="'A'"
          />
        </div>
      </div>

      <!-- Run B -->
      <div v-if="activeTab === 'runB'" class="tab-panel">
        <div class="run-header">
          <h3>Run B Results ({{ runBData.model || 'CASCADE' }})</h3>
          <div class="run-stats">
            <span
              v-for="stat in runBStats"
              :key="stat.label"
              class="stat-item"
            >
              <strong>{{ stat.label }}:</strong> {{ stat.value }}
            </span>
          </div>
        </div>
        <div class="plot-container">
          <Plot
            ref="plotB"
            :isComparative="false"
            :currentRunId="runBData.runId || 'runB'"
            :model="runBData.model || 'CASCADE'"
            :selectedObjectives="runBData.objectives || []"
            :runLabel="'B'"
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
  components: { Plot },
  props: {
    runAData: { type: Object, required: true },
    runBData: { type: Object, required: true },
  },
  data() {
    return {
      activeTab: 'runA',
      tabs: [
        { id: 'runA', label: 'Run A' },
        { id: 'runB', label: 'Run B' },
      ],
    };
  },
  computed: {
    // Per-run stat items derived from bestObjectives (evaluator-agnostic)
    runAStats() { return this.buildStats(this.runAData); },
    runBStats() { return this.buildStats(this.runBData); },
  },
  methods: {
    setActiveTab(tabId) {
      this.activeTab = tabId;
      this.$nextTick(() => this.refreshActive());
    },

    buildStats(run) {
      if (!run) return [];
      const items = [
        { label: 'Points', value: run.points ?? 0 },
        { label: 'Pareto', value: run.pareto ?? 0 },
      ];
      const best = run.bestObjectives || {};
      for (const [obj, val] of Object.entries(best)) {
        items.push({ label: `Best ${obj}`, value: this.formatValue(val) });
      }
      return items;
    },

    formatValue(v) {
      if (v === null || v === undefined) return 'N/A';
      const n = Number(v);
      if (Number.isNaN(n)) return String(v);
      // Simple, unit-free formatting — the objective name already tells the user the unit
      if (Math.abs(n) >= 1000) return n.toFixed(0);
      if (Math.abs(n) >= 1)    return n.toFixed(2);
      return n.toPrecision(3);
    },

    /**
     * Fetch points for a single run by its run_id. Each Plot component
     * already knows how to render points once we hand them the data.
     */
    async fetchRunPoints(run) {
      if (!run || !run.runId) return [];
      try {
        const resp = await axios.get('/api/chart-data/', {
          params: {
            run_id: run.runId,
            model: run.model,  // 'CASCADE' or 'PISTIL' — no hardcoding
          },
        });
        return resp.data?.data || [];
      } catch (e) {
        console.error(`[TabbedPlotView] Failed to fetch points for ${run.runId}:`, e);
        return [];
      }
    },

    async updatePlot(refName, run) {
      const plotRef = this.$refs[refName];
      if (!plotRef) return;
      const points = await this.fetchRunPoints(run);
      if (plotRef.updateChartData) {
        plotRef.updateChartData(points);
      }
    },

    refreshActive() {
      if (this.activeTab === 'runA') this.updatePlot('plotA', this.runAData);
      else                            this.updatePlot('plotB', this.runBData);
    },

    async forceRefreshPlots() {
      await this.updatePlot('plotA', this.runAData);
      await this.updatePlot('plotB', this.runBData);
    },
  },
  watch: {
    runAData: { handler() { this.$nextTick(() => this.updatePlot('plotA', this.runAData)); }, deep: true },
    runBData: { handler() { this.$nextTick(() => this.updatePlot('plotB', this.runBData)); }, deep: true },
  },
  mounted() {
    this.$nextTick(() => setTimeout(() => this.forceRefreshPlots(), 300));
  },
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