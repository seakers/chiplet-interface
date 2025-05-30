<template>
  <div class="rule-mining-content">
    <h2>Rule Mining</h2>
    <div class="controls">
      <button 
        @click="runRuleMining" 
        class="action-button"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Running...' : 'Run Rule Mining' }}
      </button>
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="rules.length > 0" class="results">
      <h3>Mined Rules</h3>
      <table class="rules-table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Conf (P → F)</th>
            <th>Conf (F → P)</th>
            <th>Lift (F → P)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, index) in rules" :key="index">
            <td>{{ rule.rule }}</td>
            <td>{{ rule.conf_p_to_f.toFixed(2) }}</td>
            <td>{{ rule.conf_f_to_p.toFixed(2) }}</td>
            <td>{{ rule.lift.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "RuleMining",
  data() {
    return {
      rules: [],
      isLoading: false,
      error: null
    };
  },
  methods: {
    async runRuleMining() {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/rule-mining/");
        this.rules = response.data.rules;
      } catch (error) {
        console.error("Error running rule mining:", error);
        this.error = "Failed to run rule mining. Please try again.";
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.rule-mining-content {
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

.action-button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}
</style> 