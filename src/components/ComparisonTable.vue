<template>
  <div class="comparison-table">
    <div class="table-container">
      <table class="comparison-table-content">
        <thead>
          <tr>
            <th class="metric-header">Metric</th>
            <th class="run-header run-a">Run A</th>
            <th class="run-header run-b">Run B</th>
            <th class="difference-header">Difference</th>
          </tr>
        </thead>
        <tbody>
          <!-- Total Points -->
          <tr class="metric-row">
            <td class="metric-label">Total Points</td>
            <td class="run-value run-a">{{ runAData.points }}</td>
            <td class="run-value run-b">{{ runBData.points }}</td>
            <td class="difference-value" :class="getDifferenceClass(runAData.points, runBData.points)">
              {{ getDifference(runAData.points, runBData.points) }}
            </td>
          </tr>

          <!-- Pareto Optimal Points -->
          <tr class="metric-row">
            <td class="metric-label">Pareto Optimal</td>
            <td class="run-value run-a">{{ runAData.pareto }}</td>
            <td class="run-value run-b">{{ runBData.pareto }}</td>
            <td class="difference-value" :class="getDifferenceClass(runAData.pareto, runBData.pareto)">
              {{ getDifference(runAData.pareto, runBData.pareto) }}
            </td>
          </tr>

          <!-- Best Energy -->
          <tr class="metric-row">
            <td class="metric-label">Best Energy</td>
            <td class="run-value run-a">{{ formatEnergy(runAData.bestEnergy) }}</td>
            <td class="run-value run-b">{{ formatEnergy(runBData.bestEnergy) }}</td>
            <td class="difference-value" :class="getEnergyDifferenceClass(runAData.bestEnergy, runBData.bestEnergy)">
              {{ getEnergyDifference(runAData.bestEnergy, runBData.bestEnergy) }}
            </td>
          </tr>

          <!-- Best Time -->
          <tr class="metric-row">
            <td class="metric-label">Best Time</td>
            <td class="run-value run-a">{{ formatTime(runAData.bestTime) }}</td>
            <td class="run-value run-b">{{ formatTime(runBData.bestTime) }}</td>
            <td class="difference-value" :class="getTimeDifferenceClass(runAData.bestTime, runBData.bestTime)">
              {{ getTimeDifference(runAData.bestTime, runBData.bestTime) }}
            </td>
          </tr>

          <!-- Configuration Comparison -->
          <tr class="metric-row config-row">
            <td class="metric-label">Algorithm</td>
            <td class="run-value run-a">{{ getConfigValue(runAData.config, 'algorithm') }}</td>
            <td class="run-value run-b">{{ getConfigValue(runBData.config, 'algorithm') }}</td>
            <td class="difference-value">
              <span v-if="isConfigSame('algorithm')" class="same-config">Same</span>
              <span v-else class="different-config">Different</span>
            </td>
          </tr>

          <tr class="metric-row config-row">
            <td class="metric-label">Population Size</td>
            <td class="run-value run-a">{{ getConfigValue(runAData.config, 'population_size') || 'N/A' }}</td>
            <td class="run-value run-b">{{ getConfigValue(runBData.config, 'population_size') || 'N/A' }}</td>
            <td class="difference-value">
              <span v-if="isConfigSame('population_size')" class="same-config">Same</span>
              <span v-else class="different-config">Different</span>
            </td>
          </tr>

          <tr class="metric-row config-row">
            <td class="metric-label">Generations</td>
            <td class="run-value run-a">{{ getConfigValue(runAData.config, 'generations') || 'N/A' }}</td>
            <td class="run-value run-b">{{ getConfigValue(runBData.config, 'generations') || 'N/A' }}</td>
            <td class="difference-value">
              <span v-if="isConfigSame('generations')" class="same-config">Same</span>
              <span v-else class="different-config">Different</span>
            </td>
          </tr>

          <tr class="metric-row config-row">
            <td class="metric-label">Objectives</td>
            <td class="run-value run-a">{{ formatObjectives(runAData.config) }}</td>
            <td class="run-value run-b">{{ formatObjectives(runBData.config) }}</td>
            <td class="difference-value">
              <span v-if="isConfigSame('objectives')" class="same-config">Same</span>
              <span v-else class="different-config">Different</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Summary Section -->
    <div class="comparison-summary">
      <h4>Key Insights</h4>
      <div class="insights-grid">
        <div class="insight-card" :class="getInsightClass('points')">
          <div class="insight-icon">📊</div>
          <div class="insight-content">
            <h5>Data Points</h5>
            <p>{{ getPointsInsight() }}</p>
          </div>
        </div>
        
        <div class="insight-card" :class="getInsightClass('energy')">
          <div class="insight-icon">⚡</div>
          <div class="insight-content">
            <h5>Energy Efficiency</h5>
            <p>{{ getEnergyInsight() }}</p>
          </div>
        </div>
        
        <div class="insight-card" :class="getInsightClass('time')">
          <div class="insight-icon">⏱️</div>
          <div class="insight-content">
            <h5>Performance</h5>
            <p>{{ getTimeInsight() }}</p>
          </div>
        </div>
        
        <div class="insight-card" :class="getInsightClass('pareto')">
          <div class="insight-icon">🎯</div>
          <div class="insight-content">
            <h5>Pareto Efficiency</h5>
            <p>{{ getParetoInsight() }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ComparisonTable',
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
  methods: {
    formatEnergy(energy) {
      if (!energy) return 'N/A';
      return `${(energy / 1000).toFixed(1)} kJ`;
    },
    
    formatTime(time) {
      if (!time) return 'N/A';
      return `${time} ms`;
    },
    
    getDifference(valueA, valueB) {
      if (!valueA || !valueB) return 'N/A';
      const diff = valueA - valueB;
      return diff > 0 ? `+${diff}` : `${diff}`;
    },
    
    getDifferenceClass(valueA, valueB) {
      if (!valueA || !valueB) return '';
      const diff = valueA - valueB;
      if (diff > 0) return 'positive';
      if (diff < 0) return 'negative';
      return 'neutral';
    },
    
    getEnergyDifference(energyA, energyB) {
      if (!energyA || !energyB) return 'N/A';
      const diff = energyA - energyB;
      const diffKJ = (diff / 1000).toFixed(1);
      return diff > 0 ? `+${diffKJ} kJ` : `${diffKJ} kJ`;
    },
    
    getEnergyDifferenceClass(energyA, energyB) {
      if (!energyA || !energyB) return '';
      const diff = energyA - energyB;
      if (diff > 0) return 'negative'; // Higher energy is worse
      if (diff < 0) return 'positive'; // Lower energy is better
      return 'neutral';
    },
    
    getTimeDifference(timeA, timeB) {
      if (!timeA || !timeB) return 'N/A';
      const diff = timeA - timeB;
      return diff > 0 ? `+${diff} ms` : `${diff} ms`;
    },
    
    getTimeDifferenceClass(timeA, timeB) {
      if (!timeA || !timeB) return '';
      const diff = timeA - timeB;
      if (diff > 0) return 'negative'; // Higher time is worse
      if (diff < 0) return 'positive'; // Lower time is better
      return 'neutral';
    },
    
    getConfigValue(config, key) {
      if (!config) return 'N/A';
      return config[key];
    },
    
    formatObjectives(config) {
      if (!config || !config.objectives) return 'N/A';
      return config.objectives.join(', ');
    },
    
    isConfigSame(key) {
      const valueA = this.getConfigValue(this.runAData.config, key);
      const valueB = this.getConfigValue(this.runBData.config, key);
      return valueA === valueB;
    },
    
    getPointsInsight() {
      if (!this.runAData.points || !this.runBData.points) return 'Insufficient data';
      const diff = this.runAData.points - this.runBData.points;
      if (diff > 0) return `Run A has ${diff} more data points`;
      if (diff < 0) return `Run B has ${Math.abs(diff)} more data points`;
      return 'Both runs have the same number of data points';
    },
    
    getEnergyInsight() {
      if (!this.runAData.bestEnergy || !this.runBData.bestEnergy) return 'Insufficient data';
      const diff = this.runAData.bestEnergy - this.runBData.bestEnergy;
      if (diff > 0) return `Run B is ${(diff/1000).toFixed(1)} kJ more energy efficient`;
      if (diff < 0) return `Run A is ${(Math.abs(diff)/1000).toFixed(1)} kJ more energy efficient`;
      return 'Both runs have similar energy efficiency';
    },
    
    getTimeInsight() {
      if (!this.runAData.bestTime || !this.runBData.bestTime) return 'Insufficient data';
      const diff = this.runAData.bestTime - this.runBData.bestTime;
      if (diff > 0) return `Run B is ${diff} ms faster`;
      if (diff < 0) return `Run A is ${Math.abs(diff)} ms faster`;
      return 'Both runs have similar performance';
    },
    
    getParetoInsight() {
      if (!this.runAData.pareto || !this.runBData.pareto) return 'Insufficient data';
      const diff = this.runAData.pareto - this.runBData.pareto;
      if (diff > 0) return `Run A has ${diff} more Pareto optimal solutions`;
      if (diff < 0) return `Run B has ${Math.abs(diff)} more Pareto optimal solutions`;
      return 'Both runs have similar Pareto efficiency';
    },
    
    getInsightClass(type) {
      const runA = this.runAData;
      const runB = this.runBData;
      
      if (type === 'points') {
        return runA.points > runB.points ? 'better' : runA.points < runB.points ? 'worse' : 'neutral';
      }
      if (type === 'energy') {
        return runA.bestEnergy < runB.bestEnergy ? 'better' : runA.bestEnergy > runB.bestEnergy ? 'worse' : 'neutral';
      }
      if (type === 'time') {
        return runA.bestTime < runB.bestTime ? 'better' : runA.bestTime > runB.bestTime ? 'worse' : 'neutral';
      }
      if (type === 'pareto') {
        return runA.pareto > runB.pareto ? 'better' : runA.pareto < runB.pareto ? 'worse' : 'neutral';
      }
      return 'neutral';
    }
  }
};
</script>

<style scoped>
.comparison-table {
  width: 100%;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 2rem;
}

.comparison-table-content {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.comparison-table-content th,
.comparison-table-content td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.comparison-table-content th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.metric-header {
  width: 25%;
}

.run-header {
  width: 20%;
  text-align: center;
}

.run-header.run-a {
  background: #eff6ff;
  color: #1d4ed8;
}

.run-header.run-b {
  background: #f0fdf4;
  color: #166534;
}

.difference-header {
  width: 15%;
  text-align: center;
  background: #fef3c7;
  color: #92400e;
}

.metric-label {
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
}

.run-value {
  text-align: center;
  font-weight: 500;
}

.run-value.run-a {
  background: #f8fafc;
  color: #1e40af;
}

.run-value.run-b {
  background: #f0fdf4;
  color: #15803d;
}

.difference-value {
  text-align: center;
  font-weight: 600;
}

.difference-value.positive {
  color: #059669;
  background: #f0fdf4;
}

.difference-value.negative {
  color: #dc2626;
  background: #fef2f2;
}

.difference-value.neutral {
  color: #6b7280;
  background: #f9fafb;
}

.same-config {
  color: #059669;
  font-size: 0.85rem;
}

.different-config {
  color: #dc2626;
  font-size: 0.85rem;
}

.config-row {
  background: #fafbfc;
}

.comparison-summary {
  margin-top: 2rem;
}

.comparison-summary h4 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.insight-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  transition: all 0.2s;
}

.insight-card.better {
  border-color: #10b981;
  background: #f0fdf4;
}

.insight-card.worse {
  border-color: #ef4444;
  background: #fef2f2;
}

.insight-card.neutral {
  border-color: #6b7280;
  background: #f9fafb;
}

.insight-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.insight-content h5 {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.insight-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .comparison-table-content {
    font-size: 0.85rem;
  }
  
  .comparison-table-content th,
  .comparison-table-content td {
    padding: 0.5rem 0.75rem;
  }
  
  .insights-grid {
    grid-template-columns: 1fr;
  }
  
  .insight-card {
    padding: 0.75rem;
  }
}
</style> 