<template>
  <div class="distance-correlation-content data-mining-submenu-fullwidth">
    <h2>Distance Correlation Analysis</h2>
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

export default {
  name: "DistanceCorrelation",
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
        const response = await axios.get("http://127.0.0.1:8000/api/chart-data/");
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
        const response = await axios.get("http://127.0.0.1:8000/api/distance-correlation/");
        this.distanceCorrelations = response.data;
      } catch (error) {
        console.error("Error fetching distance correlation:", error);
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
        const response = await axios.get("http://127.0.0.1:8000/api/distance-correlation/");
        const correlations = response.data;
        
        // Format the insights message
        let insightsMessage = "Here are the key insights from the distance correlation analysis:\n\n";
        
        // Group by metric (Energy and Time)
        const energyInsights = [];
        const timeInsights = [];
        
        for (const [key, value] of Object.entries(correlations)) {
          const [chiplet, metric] = key.split('_vs_');
          const insight = `${chiplet}: ${value.toFixed(3)}`;
          if (metric === 'Energy') {
            energyInsights.push(insight);
          } else {
            timeInsights.push(insight);
          }
        }
        
        // Sort insights by correlation value (descending)
        const sortInsights = (a, b) => parseFloat(b.split(': ')[1]) - parseFloat(a.split(': ')[1]);
        energyInsights.sort(sortInsights);
        timeInsights.sort(sortInsights);
        
        insightsMessage += "Energy Impact (higher values indicate stronger influence):\n";
        energyInsights.forEach(insight => {
          insightsMessage += `• ${insight}\n`;
        });
        
        insightsMessage += "\nTime Impact (higher values indicate stronger influence):\n";
        timeInsights.forEach(insight => {
          insightsMessage += `• ${insight}\n`;
        });
        
        // Emit event to parent to send to chat
        this.$emit('send-insights-to-chat', insightsMessage);
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

h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 1.75rem;
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