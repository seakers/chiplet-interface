<template>
  <div class="dynamic-plot-content">
    <div :id="plotId" class="plot"></div>
  </div>
</template>

<script>
import Plot from 'plotly.js-dist';

export default {
  name: "DynamicPlot",
  props: {
    plotData: { type: Object, default: null },
  },
  data() {
    return {
      plotId: `dynamic-plot-${Math.random().toString(36).slice(2)}`,
    };
  },
  watch: {
    plotData(newData) {
        if (newData && Array.isArray(newData.traces) && newData.traces.length) {
        this.$nextTick(() => this.renderPlot());
        }
    }
  },
  methods: {
    renderPlot() {
        const data = this.plotData;
        if (!data || !Array.isArray(data.traces) || data.traces.length === 0) {
            console.warn('DynamicPlot: no valid traces', data);
            return;
        }
        // Clone so Plotly's internal mutations don't feed back into Vue reactivity
        const traces = JSON.parse(JSON.stringify(data.traces));
        const layout = JSON.parse(JSON.stringify(data.layout || {}));
        const config = { responsive: true, displayModeBar: true };
        Plot.newPlot(this.plotId, traces, layout, config);
        
    }
  },
  mounted() {
    if (this.plotData && this.plotData.traces) {
      this.renderPlot();
    }
  }
};
</script>

<style scoped>
.dynamic-plot-content {
  width: 100%;
  min-height: 400px;
}
.plot {
  width: 100%;
  min-height: 400px;
}
</style>