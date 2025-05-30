<template>
  <div class="distance-correlation-content">
    <h2>Distance Correlation Study</h2>
    <div class="controls">
      <div class="input-group">
        <label for="variable-x">Variable X</label>
        <select id="variable-x" v-model="selectedVariableX">
          <option v-for="variable in variables" :key="variable" :value="variable">{{ variable }}</option>
        </select>
      </div>
      <div class="input-group">
        <label for="variable-y">Variable Y</label>
        <select id="variable-y" v-model="selectedVariableY">
          <option v-for="variable in variables" :key="variable" :value="variable">{{ variable }}</option>
        </select>
      </div>
      <button @click="runCorrelationStudy" class="action-button">Run Correlation Study</button>
    </div>
    <div v-if="correlationResult" class="results">
      <h3>Correlation Results</h3>
      <div class="correlation-card">
        <p><strong>Distance Correlation:</strong> {{ correlationResult.correlation.toFixed(4) }}</p>
        <p><strong>P-value:</strong> {{ correlationResult.pValue.toFixed(4) }}</p>
        <div class="visualization" ref="correlationPlot"></div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import Plot from 'plotly.js-dist';

export default {
  name: "DistanceCorrelation",
  data() {
    return {
      variables: [
        'GPU',
        'Attention',
        'Sparse',
        'Convolution',
        'Execution Time',
        'Energy Consumption',
        'Temperature'
      ],
      selectedVariableX: 'GPU',
      selectedVariableY: 'Execution Time',
      correlationResult: null,
    };
  },
  methods: {
    async runCorrelationStudy() {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/distance-correlation/", {
          params: {
            variable_x: this.selectedVariableX,
            variable_y: this.selectedVariableY,
          }
        });
        this.correlationResult = response.data;
        this.$nextTick(() => {
          this.plotCorrelation();
        });
      } catch (error) {
        console.error("Error running correlation study:", error);
      }
    },
    plotCorrelation() {
      if (!this.correlationResult || !this.$refs.correlationPlot) return;

      const data = [{
        x: this.correlationResult.x_values,
        y: this.correlationResult.y_values,
        mode: 'markers',
        type: 'scatter',
        marker: {
          color: '#337aff',
          size: 8,
        },
      }];

      const layout = {
        title: `${this.selectedVariableX} vs ${this.selectedVariableY}`,
        xaxis: {
          title: this.selectedVariableX,
        },
        yaxis: {
          title: this.selectedVariableY,
        },
        margin: {
          l: 50,
          r: 20,
          t: 50,
          b: 50,
        },
      };

      Plot.newPlot(this.$refs.correlationPlot, data, layout);
    },
  },
};
</script>

<style scoped>
.distance-correlation-content {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-weight: 600;
  color: #2d3748;
}

.input-group select {
  padding: 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
}

.action-button {
  background: #337aff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
}

.action-button:hover {
  background: #2356b8;
}

.results {
  margin-top: 2rem;
}

.correlation-card {
  background: #f7fafc;
  padding: 1.5rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.visualization {
  margin-top: 1.5rem;
  height: 400px;
  width: 100%;
}
</style> 