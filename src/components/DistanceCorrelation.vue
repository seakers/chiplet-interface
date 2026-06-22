<template>
  <div class="distance-correlation-content data-mining-submenu-fullwidth">
    <h2>
      Distance Correlation Analysis
      <HelpTooltip 
        title="Distance Correlation Analysis"
        description="A statistical method to detect both linear and nonlinear relationships between chiplet design features and outcomes (e.g., energy, runtime). It's useful when standard correlation misses complex dependencies. The dCor values range from 0 to 1, where 0 means no dependency and 1 means perfect dependency. Higher values indicate stronger influence on outcomes."
      />
    </h2>
    <div class="correlation-grid">
      <div v-for="(plot, index) in plots" :key="index" class="plot-container">
        <h3 class="plot-title">{{ plot.title }}</h3>
        <div :id="'plot-' + index" class="plot"></div>
        <div v-if="getDistanceCorrelationValue(plot) !== null" class="correlation-value">
          dCor = {{ getDistanceCorrelationValue(plot).toFixed(2) }}
        </div>
      </div>
    </div>
    <div class="insights-button-container">
      <button class="insights-button" @click="getInsights">Get Insights</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import Plot from 'plotly.js-dist';
import { getDistanceCorrelation, getDistanceCorrelationInsights } from '@/services/analytics';
import HelpTooltip from './HelpTooltip.vue';

export default {
  name: "DistanceCorrelation",
  components: {
    HelpTooltip
  },
  props: {
    filePath:  { type: String, default: null },
    selectedModel:    { type: String, default: null },
    currentRunId:     { type: String, default: null },
    selectedObjectives: { type: Array, default: () => [] },
  },
  data() {
    return {
      plots: [],  // Start empty, will be populated dynamically
      plotData: null,
      distanceCorrelations: null,
      variables: [],  // Store available variables
      objectives: []  // Store available objectives
    };
  },
  methods: {
    async fetchData() {
      try {
        let url = "http://127.0.0.1:8000/api/chart-data/";
        let params = {
          model: this.selectedModel || 'CASCADE',
          run_id: this.currentRunId
        };
        if (this.filePath) {
          params.file_path = this.filePath;
        }
        
        const response = await axios.get(url, { params });
        this.plotData = response.data.data;
        this.createPlots();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    },

    createPlots() {
      // Debug: show what keys are available
      if (this.plotData && this.plotData.length > 0) {
        console.log('[DistanceCorrelation] Available keys in plotData:', Object.keys(this.plotData[0]));
        console.log('[DistanceCorrelation] Sample data point:', this.plotData[0]);
      }
      
      this.plots.forEach((plot, index) => {
        const variableKey = this.getVariableKey(plot.x);
        const xData = this.plotData.map(point => point[variableKey]);
        const yKey = this.getObjectiveKey(plot.y);
        const yData = this.plotData.map(point => point[yKey]);
        
        // Debug logging
        console.log(`[DistanceCorrelation] Plot ${index}: ${plot.title}`);
        console.log(`Variable "${plot.x}" mapped to key "${variableKey}"`);
        console.log(`Objective "${plot.y}" mapped to key "${yKey}"`);
        console.log(`Sample xData (first 3):`, xData.slice(0, 3));
        console.log(`Sample yData (first 3):`, yData.slice(0, 3));
        console.log(`Undefined count - x: ${xData.filter(v => v === undefined).length}, y: ${yData.filter(v => v === undefined).length}`);
        
        const trace = {
          x: xData,
          y: yData,
          mode: 'markers',
          type: 'scatter',
          marker: {
            color: '#337aff',
            size: 8,
            opacity: 0.7
          }
        };
        
        const layout = {
          title: null,
          xaxis: {
            title: this.getVariableDisplayName(plot.x),
            showgrid: true,
            gridcolor: '#e0e0e0',
            zeroline: false
          },
          yaxis: {
            title: plot.y,
            showgrid: true,
            gridcolor: '#e0e0e0',
            zeroline: false
          },
          margin: { l: 50, r: 20, t: 20, b: 50 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)'
        };
        
        const config = {
          responsive: true,
          displayModeBar: false
        };
        
        Plot.newPlot(`plot-${index}`, [trace], layout, config);
      });
    },

    getVariableKey(variableName) {
      if (!this.plotData || this.plotData.length === 0) {
        console.warn('[DistanceCorrelation] No plotData available');
        return variableName;
      }
      
      const availableKeys = Object.keys(this.plotData[0]);
      
      // Hard-coded mapping for CASCADE
      const cascadeMap = {
        'GPU': 'gpu',
        'Sparse': 'sparse',
        'Attention': 'attn',
        'Convolution': 'conv'
      };
      
      // Check if it's a CASCADE variable
      if (cascadeMap[variableName]) {
        const mappedKey = cascadeMap[variableName];
        if (availableKeys.includes(mappedKey)) {
          console.log(`[DistanceCorrelation] CASCADE: "${variableName}" → "${mappedKey}" ✓`);
          return mappedKey;
        } else {
          console.warn(`[DistanceCorrelation] CASCADE: "${variableName}" → "${mappedKey}" ✗ (not in data)`);
        }
      }
      
      // For PISTIL, check if variable name exists as-is
      if (availableKeys.includes(variableName)) {
        console.log(`[DistanceCorrelation] PISTIL: "${variableName}" found directly ✓`);
        return variableName;
      }
      
      console.error(`[DistanceCorrelation] Variable "${variableName}" not found in data. Available:`, availableKeys);
      return variableName;
    },
    
    getObjectiveKey(objectiveName) {
      if (!this.plotData || this.plotData.length === 0) return objectiveName;
      const availableKeys = Object.keys(this.plotData[0]);

      // Friendly name → internal data key
      const friendlyToField = {
        'Energy':                'y',
        'Runtime':               'x',
        'Latency per Token':     'latency_per_token_ms',
        'Energy per Inference':  'energy_per_inference_mJ',
        'Energy per Token':      'energy_per_token_mJ',
        'Average Power':         'average_power_W',
        'System Power':          'system_power_W',
        'System Cost':           'system_cost',
        'Avg Compute Util':      'avg_comp_util',
        'Avg Memory Util':       'avg_mem_util',
        'Prefill Tokens/sec':    'prefill_tokens_per_sec',
        'System Compute':        'system_compute_TOPS',
        'System Bandwidth':      'system_bandwidth_TBps',
        'System Capacity':       'system_capacity_GB',
      };

      // 1. Direct friendly-name lookup
      if (friendlyToField[objectiveName]) {
        const mapped = friendlyToField[objectiveName];
        if (availableKeys.includes(mapped)) return mapped;
      }

      // 2. Key already exists as-is (backend returned internal key)
      if (availableKeys.includes(objectiveName)) return objectiveName;

      // 3. Snake_case fallback
      const snake = objectiveName.toLowerCase().replace(/\s+/g, '_');
      if (availableKeys.includes(snake)) return snake;

      console.error(`[DistanceCorrelation] Objective "${objectiveName}" not found. Available:`, availableKeys);
      return objectiveName;
    },

    getObjectiveShortName(objectiveName) {
      const shortNames = {
        'Energy':                'Energy',
        'Runtime':               'Runtime',
        'Latency per Token':     'Latency/Token',
        'Energy per Inference':  'Energy/Inf',
        'Energy per Token':      'Energy/Token',
        'Average Power':         'Avg Power',
        'System Power':          'Sys Power',
        'System Cost':           'Cost',
        'Avg Compute Util':      'Compute Util',
        'Avg Memory Util':       'Mem Util',
        'Prefill Tokens/sec':    'Prefill T/s',
        'System Compute':        'Compute',
        'System Bandwidth':      'Bandwidth',
        'System Capacity':       'Capacity',
      };
      return shortNames[objectiveName] || objectiveName.split(' ').pop();
    },

    async getInsights() {
      try {
        // Get optimization context from parent or props
        const params = {
          objective: this.$parent.currentObjective || 'both',
          trace_name: this.$parent.currentTraceName || 'Unknown',
          run_id: this.$parent.currentRunId || null
        };
        
        const response = await getDistanceCorrelationInsights(params);
        const insights = response.insights;
        const structuredData = response.structured_data;
        
        // Store structured data for potential follow-up questions
        this.$parent.lastDataMiningResults = {
          type: 'distance_correlation',
          structured_data: structuredData
        };
        
        // Emit event to parent to send to chat
        this.$emit('send-insights-to-chat', insights);
      } catch (error) {
        console.error("Error getting insights:", error);
      }
    },
    async fetchDistanceCorrelation() {
      try {
        const params = {
          evaluator: this.selectedModel || 'CASCADE',
          run_id: this.currentRunId,
        };
        if (this.selectedObjectives.length) {
          params.objectives = this.selectedObjectives.join(',');
        }
        if (this.filePath) params.file_path = this.filePath;

        const response = await getDistanceCorrelation(params);
        this.distanceCorrelations = response;
        
        // Parse the keys to extract variables and objectives
        this.parsePlotConfiguration(response);
        
        // Now fetch data with the dynamic variables
        await this.fetchData();
        
        await this.sendDistanceCorrelationContextToChat(params, response);
      } catch (error) {
        console.error("Error fetching distance correlation:", error);
      }
    },

    parsePlotConfiguration(distanceCorrelations) {
      // Define which variables we want to plot for each evaluator
      const evaluatorVariables = {
        'CASCADE': ['GPU', 'Sparse', 'Attention', 'Convolution'],
        'PISTIL': ['num_cus', 'num_tmacs', 'mem_buf_cap', 'net_buf_cap', 
                   'mem_banks_per_group', 'mem_ranks', 'mem_frac_bank_cap', 
                   'batch_size', 'kv_cache']
      };
      
      // Get the variables for current evaluator
      const allowedVariables = evaluatorVariables[this.selectedModel] || [];
      
      // Extract unique objectives from the keys
      const objectivesSet = new Set();
      
      Object.keys(distanceCorrelations).forEach(key => {
        const parts = key.split('_vs_');
        if (parts.length === 2) {
          objectivesSet.add(parts[1]);
        }
      });
      
      this.variables = allowedVariables;
      this.objectives = Array.from(objectivesSet);
      
      // Generate plots array dynamically - only for allowed variables
      this.plots = [];
      this.variables.forEach(variable => {
        this.objectives.forEach(objective => {
          // Create readable titles
          const varDisplay = this.getVariableDisplayName(variable);
          const objShortName = this.getObjectiveShortName(objective);
          
          this.plots.push({
            x: variable,  // Keep original name for mapping
            y: objective,
            title: `${varDisplay} vs ${objShortName}`
          });
        });
      });
      
      console.log('[DistanceCorrelation] Dynamic plots generated:', this.plots);
      console.log('[DistanceCorrelation] Using variables for', this.selectedModel, ':', this.variables);
    },

    getVariableDisplayName(variableName) {
      // Convert variable names to display-friendly format
      const displayMap = {
        // CASCADE
        'GPU': 'GPU',
        'Sparse': 'Sparse',
        'Attention': 'Attention',
        'Convolution': 'Convolution',
        // PISTIL
        'num_cus': 'Num CUs',
        'num_tmacs': 'Num TMACs',
        'mem_buf_cap': 'Mem Buffer Cap',
        'net_buf_cap': 'Net Buffer Cap',
        'mem_banks_per_group': 'Mem Banks per Group',
        'mem_ranks': 'Mem Ranks',
        'mem_frac_bank_cap': 'Mem Frac Bank Cap',
        'batch_size': 'Batch Size',
        'kv_cache': 'KV Cache'
      };
      
      return displayMap[variableName] || variableName;
    },
    
    async sendDistanceCorrelationContextToChat(params, response) {
      try {
        const contextParams = {
          objective: 'both',
          trace_name: 'Unknown',
          run_id: this.currentRunId,  // Use prop
          evaluator: this.selectedModel || 'CASCADE'
        };
        
        const insightsResponse = await getDistanceCorrelationInsights(contextParams);
        const structuredData = insightsResponse.structured_data;
        
        this.$emit('send-insights-to-chat', structuredData, { silent: true });
        
        console.log('Distance correlation context sent to chat silently');
      } catch (error) {
        console.error("Error sending distance correlation context to chat:", error);
      }
    },

    getDistanceCorrelationValue(plot) {
      if (!this.distanceCorrelations) {
        return null;
      }
      
      // Construct the key: "variable_vs_objective"
      // e.g., "num_cus_vs_Total Energy (mJ)"
      const key = `${plot.x}_vs_${plot.y}`;
      console.log(`[DistanceCorrelation] Looking for key: "${key}"`);
      console.log(`[DistanceCorrelation] Available keys:`, Object.keys(this.distanceCorrelations));
      
      if (typeof this.distanceCorrelations[key] === 'number') {
        return this.distanceCorrelations[key];
      }
      
      console.warn(`[DistanceCorrelation] No correlation value found for key "${key}"`);
      return null;
    },

  },
  mounted() {
    console.log('[DistanceCorrelation] Component mounted');
    console.log('[DistanceCorrelation] selectedModel:', this.selectedModel);
    console.log('[DistanceCorrelation] currentRunId:', this.currentRunId);
    console.log('[DistanceCorrelation] filePath:', this.filePath);
    
    this.fetchDistanceCorrelation();
  }
};
</script>

<style scoped>
.distance-correlation-content {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding-bottom: 2rem;
  position: relative;
}

.distance-correlation-content h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.2rem;
}

.data-mining-submenu-fullwidth {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 100%;
}

.data-mining-submenu-fullwidth .correlation-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  width: 100%;
  flex: 1;
  min-height: 600px;
}

.correlation-grid {
  /* grid now handled by .data-mining-submenu-fullwidth .correlation-grid */
}

.plot-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 250px;
}

.plot-title {
  font-size: 1rem;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.plot {
  flex: 1;
  min-height: 200px;
  width: 100%;
}

.correlation-value {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

@media (max-width: 1400px) {
  .data-mining-submenu-fullwidth .correlation-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .data-mining-submenu-fullwidth .correlation-grid {
    grid-template-columns: 1fr;
  }
}

.insights-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  width: 100%;
}

.insights-button {
  background-color: #337aff;
  color: white;
  padding: 14px 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(51,122,255,0.08);
  transition: background-color 0.2s, box-shadow 0.2s;
  min-width: 160px;
}

.insights-button:hover {
  background-color: #2866cc;
  box-shadow: 0 4px 16px rgba(51,122,255,0.15);
}
</style> 