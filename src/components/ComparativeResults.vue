<template>
  <div class="comparative-results">
    <div class="results-header">
      <h3>Comparative Analysis Designs</h3>
      <p class="results-subtitle">Explore the design results of both optimization runs</p>
    </div>
    
    <!-- Tabbed Plot Interface -->
    <TabbedPlotView 
      :runAData="runAData"
      :runBData="runBData"
      ref="tabbedPlotView"
    />
  </div>
</template>

<script>
import TabbedPlotView from './TabbedPlotView.vue';

export default {
  name: 'ComparativeResults',
  components: {
    TabbedPlotView
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
  watch: {
    runAData: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.tabbedPlotView) {
            this.$refs.tabbedPlotView.forceRefreshPlots();
          }
        });
      },
      deep: true
    },
    runBData: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.tabbedPlotView) {
            this.$refs.tabbedPlotView.forceRefreshPlots();
          }
        });
      },
      deep: true
    }
  },
  mounted() {
    // Update plots when component is mounted
    this.$nextTick(() => {
      if (this.$refs.tabbedPlotView) {
        this.$refs.tabbedPlotView.forceRefreshPlots();
      }
    });
  }
};
</script>

<style scoped>
.comparative-results {
  width: 100%;
}

.results-header {
  margin-bottom: 2rem;
  text-align: center;
}

.results-header h3 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
}

.results-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}
</style> 