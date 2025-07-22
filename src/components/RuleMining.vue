<template>
  <div class="rule-mining-content">
    <h2>Rule Mining</h2>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="rules.length > 0" class="results">
      <h3>Mined Rules</h3>
      <table class="rules-table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Conf(F-&gt;P)</th>
            <th>Conf(P-&gt;F)</th>
            <th>Lift</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, index) in rules" :key="index">
            <td>{{ rule.rule }}</td>
            <td>{{ rule.conf_f_to_p.toFixed(2) }}</td>
            <td>{{ rule.conf_p_to_f.toFixed(2) }}</td>
            <td>{{ rule.lift.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="insights-button-container">
      <button class="insights-button" @click="getInsights">Get Insights</button>
    </div>
  </div>
</template>

<script>
import { getRuleMining, getRuleMiningInsights } from '@/services/analytics';

export default {
  name: "RuleMining",
  data() {
    return {
      rules: [],
      error: null
    };
  },
  methods: {
    async fetchRuleMining() {
      this.error = null;
      try {
        const response = await getRuleMining();
        this.rules = response.rules;
      } catch (error) {
        console.error("Error fetching rule mining results:", error);
        this.error = "Failed to fetch rule mining results. Please try again.";
      }
    },
    async getInsights() {
      try {
        const response = await getRuleMiningInsights();
        const insights = response.insights;
        this.$emit('send-insights-to-chat', insights);
      } catch (error) {
        console.error("Error getting rule mining insights:", error);
        this.error = "Failed to get insights. Please try again.";
      }
    }
  },
  mounted() {
    this.fetchRuleMining();
  }
};
</script>

<style scoped>
.rule-mining-content {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.results {
  margin-top: 2rem;
}

.rules-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.rules-table th, .rules-table td {
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  text-align: left;
}
.rules-table th {
  background: #f5f8ff;
  font-weight: 700;
  color: #2d3748;
  white-space: nowrap;
}
.rules-table tr:nth-child(even) {
  background: #f7fafc;
}

.error-message {
  color: #dc2626;
  margin: 1rem 0;
  padding: 0.5rem;
  background: #fee2e2;
  border-radius: 4px;
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