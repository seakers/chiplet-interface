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
        <div v-if="distanceCorrelations && typeof distanceCorrelations[plot.title.replace(' vs ', '_vs_')] === 'number'" class="correlation-value">
          dCor = {{ distanceCorrelations[plot.title.replace(' vs ', '_vs_')].toFixed(2) }}
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
    filePath: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      plots: [
        { x: 'GPU', y: 'Total Energy (mJ)', title: 'GPU vs Energy' },
        { x: 'Sparse', y: 'Total Energy (mJ)', title: 'Sparse vs Energy' },
        { x: 'Attention', y: 'Total Energy (mJ)', title: 'Attention vs Energy' },
        { x: 'Convolution', y: 'Total Energy (mJ)', title: 'Convolution vs Energy' },
        { x: 'GPU', y: 'Total time (ms)', title: 'GPU vs Time' },
        { x: 'Sparse', y: 'Total time (ms)', title: 'Sparse vs Time' },
        { x: 'Attention', y: 'Total time (ms)', title: 'Attention vs Time' },
        { x: 'Convolution', y: 'Total time (ms)', title: 'Convolution vs Time' }
      ],
      plotData: null,
      distanceCorrelations: null
    };
  },
  methods: {
    async fetchData() {
      try {
        let url = "http://127.0.0.1:8000/api/chart-data/";
        let params = {};
        
        // Add file path if provided (for loaded runs)
        if (this.filePath) {
          params.file_path = this.filePath;
          console.log('DistanceCorrelation: Fetching data with file path:', this.filePath);
        }
        
        const response = await axios.get(url, { params });
        this.plotData = response.data.data;
        if (response.data.correlations) {
          this.plots.forEach(plot => {
            plot.corr = response.data.correlations[plot.title];
          });
        }
        this.createPlots();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    },
    async fetchDistanceCorrelation() {
      try {
        const params = {};
        
        // Add file path if provided (for loaded runs)
        if (this.filePath) {
          params.file_path = this.filePath;
          console.log('DistanceCorrelation: Using file path:', this.filePath);
        }
        
        const response = await getDistanceCorrelation(params);
        this.distanceCorrelations = response;
        
        // Automatically send distance correlation context to chat
        await this.sendDistanceCorrelationContextToChat(params, response);
        
      } catch (error) {
        console.error("Error fetching distance correlation:", error);
      }
    },
    
    async sendDistanceCorrelationContextToChat(params, response) {
      try {
        // Get optimization context from parent or props
        const contextParams = {
          objective: this.$parent.currentObjective || 'both',
          trace_name: this.$parent.currentTraceName || 'Unknown',
          run_id: this.$parent.currentRunId || null
        };
        
        // Get insights for context
        const insightsResponse = await getDistanceCorrelationInsights(contextParams);
        const structuredData = insightsResponse.structured_data;
        
        // Store structured data for potential follow-up questions
        this.$parent.lastDataMiningResults = {
          type: 'distance_correlation',
          structured_data: structuredData
        };
        
        // Send context silently to chat (no visible message)
        this.$emit('send-insights-to-chat', structuredData, { silent: true });
        
        console.log('Distance correlation context sent to chat silently');
      } catch (error) {
        console.error("Error sending distance correlation context to chat:", error);
        // Don't show error to user as this is background functionality
      }
    },
    createPlots() {
      const chipletKeyMap = {
        GPU: 'gpu',
        Sparse: 'sparse',
        Attention: 'attn',
        Convolution: 'conv'
      };
      this.plots.forEach((plot, index) => {
        const chipletKey = chipletKeyMap[plot.x];
        const xData = this.plotData.map(point => point[chipletKey]);
        const yData = this.plotData.map(point =>
          plot.y === 'Total Energy (mJ)'
            ? point['y']
            : plot.y === 'Total time (ms)'
              ? point['x']
              : null
        );

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
            title: 'Chiplet Score',
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
          margin: {
            l: 50,
            r: 20,
            t: 20,
            b: 50
          },
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
    }
  },
  mounted() {
    this.fetchData();
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