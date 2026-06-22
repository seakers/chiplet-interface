<template>
  <div class="rule-mining-content">
    <h2>
      Rule Mining
      <HelpTooltip 
        title="Rule Mining"
        description="Rule mining identifies patterns in chiplet designs by discovering relationships between decision features (like GPU, attention type) and outcomes (such as being on the Pareto front). It helps explain which feature combinations often lead to optimal designs."
      />
    </h2>
    
    <!-- Point Selection Controls -->
    <div class="point-selection-section">
      <h3>Region of Interest</h3>
      <div class="selection-controls">
        <div class="control-group">
          <label>Analysis Region:</label>
          <select v-model="selectedRegion" @change="updatePointSelection">
            <option value="pareto">Pareto Front Ranks</option>
            <option value="custom">Custom Selection</option>
            <option value="all">All Points</option>
          </select>
        </div>
        
        <div v-if="selectedRegion === 'pareto'" class="control-group">
          <label>Pareto Front Ranks:</label>
          <div class="rank-inputs">
            <input 
              type="number" 
              v-model.number="paretoStartRank" 
              min="1" 
              max="10"
              @change="updatePointSelection"
            />
            <span>to</span>
            <input 
              type="number" 
              v-model.number="paretoEndRank" 
              min="1" 
              max="10"
              @change="updatePointSelection"
            />
          </div>
        </div>
        
        <div v-if="selectedRegion === 'custom'" class="control-group">
          <label>Custom Selection:</label>
          <div class="custom-inputs">
            <div class="input-row" v-for="(obj, idx) in selectedObjectives.slice(0, 2)" :key="obj">
              <span>{{ obj }} Range:</span>
              <input type="number" v-model.number="customRanges[idx].min" placeholder="Min" @change="updatePointSelection" />
              <span>-</span>
              <input type="number" v-model.number="customRanges[idx].max" placeholder="Max" @change="updatePointSelection" />
            </div>
          </div>
        </div>
        
        <div class="region-summary" v-if="regionSummary">
          <strong>Selected Region:</strong> {{ regionSummary }}
        </div>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div class="action-buttons">
      <button class="run-button" @click="runRuleMining" :disabled="isRunning">
        {{ isRunning ? 'Running...' : 'Run Rule Mining' }}
      </button>
    </div>
    
    <div v-if="rules.length > 0" class="results">
      <h3>Mined Rules</h3>
      <div class="rules-legend">
        <div class="legend-title">Value Ranges:</div>
        <div class="legend-items">
          <span class="legend-item"><strong>None:</strong> 0</span>
          <span class="legend-item"><strong>Low:</strong> 0–33% of maximum</span>
          <span class="legend-item"><strong>Medium:</strong> 33–67% of maximum</span>
          <span class="legend-item"><strong>High:</strong> >67% of maximum</span>
        </div>
      </div>
      <table class="rules-table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>
              Conf(F-&gt;P)
              <HelpTooltip 
                title="Confidence (Feature → Pareto)"
                description="The probability that a design appears on the Pareto front given it has a specific feature."
                example="If a design uses GPU=low, how likely is it to be optimal?"
              />
            </th>
            <th>
              Conf(P-&gt;F)
              <HelpTooltip 
                title="Confidence (Pareto → Feature)"
                description="The probability that a design has a specific feature given it is on the Pareto front."
                example="Among all optimal designs, how often does GPU=low appear?"
              />
            </th>
            <th>
              Lift
              <HelpTooltip 
                title="Lift"
                description="A measure of how much more likely a feature is to be associated with optimal designs compared to random chance."
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, index) in rules" :key="index">
            <td>{{ formatRule(rule.rule) }}</td>
            <td>{{ rule.conf_f_to_p.toFixed(2) }}</td>
            <td>{{ rule.conf_p_to_f.toFixed(2) }}</td>
            <td>{{ rule.lift.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="insights-button-container" v-if="rules.length > 0">
      <button class="insights-button" @click="getInsights">Get Insights</button>
    </div>
  </div>
</template>

<script>
import { getRuleMining, getRuleMiningInsights } from '@/services/analytics';
import HelpTooltip from './HelpTooltip.vue';

export default {
  name: "RuleMining",
  components: {
    HelpTooltip
  },
  props: {
    filePath: {
      type: String,
      default: null
    },
    selectedModel: {
      type: String,
      default: null
    },
    currentRunId: {
      type: String,
      default: null
    },
    agentResults: {
      type: Object,
      default: null
    },
    selectedObjectives: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      rules: [],
      error: null,
      isRunning: false,
      selectedRegion: 'pareto',
      paretoStartRank: 1,
      paretoEndRank: 3,
      customRanges: Array.from({ length: 3 }, () => ({ min: '', max: '' })),
      regionSummary: 'Pareto Front Ranks 1 to 3'
    };
  },
  watch: {
    agentResults: {
      immediate: true,
      handler(newData) {
        if (newData && newData.rules) {
          this.rules = newData.rules;
          this.showResults = true;  // skip to results view
        }
      }
    }
  },
  methods: {
    updatePointSelection() {
      if (this.selectedRegion === 'pareto') {
        this.regionSummary = `Pareto Front Ranks ${this.paretoStartRank} to ${this.paretoEndRank}`;
      } else if (this.selectedRegion === 'custom') {
        const parts = (this.selectedObjectives || []).map((name, i) => {
          const r = this.customRanges[i] || {};
          return `${name}: [${r.min ?? '−∞'}, ${r.max ?? '∞'}]`;
        });
        this.regionSummary = `Custom Selection: ${parts.join(', ')}`;
      } else {
        this.regionSummary = 'All Points';
      }
    },
    async runRuleMining() {
      console.log("=== runRuleMining CALLED ===");
      console.log("Button clicked!");
      this.isRunning = true;
      this.error = null;
      console.log("EVALUATOR: ", this.selectedModel);
      console.log("CURRENT RUN ID: ", this.currentRunId);
      
      try {
        const params = {
          region: this.selectedRegion,
          paretoStartRank: this.paretoStartRank,
          paretoEndRank: this.paretoEndRank,
          evaluator: this.selectedModel,
          run_id: this.currentRunId,
          // NEW: pass the full objective list (joined for query string)
          objectives: (this.selectedObjectives || []).join(','),
        };

        // keep individual ranges
        (this.selectedObjectives || []).forEach((name, i) => {
          params[`obj${i}_name`] = name;
          if (this.customRanges[i]?.min !== '') params[`obj${i}_min`] = this.customRanges[i].min;
          if (this.customRanges[i]?.max !== '') params[`obj${i}_max`] = this.customRanges[i].max;
        });

        if (this.filePath) params.file_path = this.filePath;
        
        const response = await getRuleMining(params);
        this.rules = response.rules;
        
        // Automatically send rule mining context to chat
        await this.sendRuleMiningContextToChat(params, response);
        
      } catch (error) {
        console.error("Error running rule mining:", error);
        this.error = "Failed to run rule mining. Please try again.";
      } finally {
        this.isRunning = false;
      }
    },
    formatRule(rule) {
      // Convert underscore-separated rules to natural language
      if (!rule) return '';
      
      // Split the rule into parts (usually separated by AND/OR)
      const parts = rule.split(/\s+(AND|OR)\s+/);
      const formattedParts = [];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // Skip AND/OR operators, they'll be added back
        if (part === 'AND' || part === 'OR') {
          formattedParts.push(part);
          continue;
        }
        
        // Format individual conditions
        const formattedPart = this.formatCondition(part);
        formattedParts.push(formattedPart);
      }
      
      return formattedParts.join(' ');
    },
    formatCondition(condition) {
      // Handle different condition formats
      if (!condition) return '';
      
      // Remove extra whitespace
      condition = condition.trim();
      
      // Handle chiplet conditions like "Attention_none", "GPU_high", etc.
      const chipletPattern = /^(\w+)_(\w+)$/;
      const match = condition.match(chipletPattern);
      
      if (match) {
        const [, chipletType, level] = match;
        
        // Map chiplet types to proper names
        const chipletNames = {
          'GPU': 'GPU',
          'Attention': 'Attention',
          'Sparse': 'Sparse',
          'Convolution': 'Convolution'
        };
        
        // Map levels to natural language
        const levelNames = {
          'none': 'None',
          'low': 'Low',
          'medium': 'Medium',
          'high': 'High'
        };
        
        const chipletName = chipletNames[chipletType] || chipletType;
        const levelName = levelNames[level] || level;
        
        return `${levelName} value for ${chipletName}`;
      }
      
      // Handle other conditions (like performance metrics)
      // You can add more patterns here as needed
      
      return condition;
    },
    async sendRuleMiningContextToChat(params, response) {
      try {
        const contextParams = {
          objective: 'both',
          trace_name: 'Unknown',
          run_id: this.currentRunId,  // Use prop
          region: params.region,
          paretoStartRank: params.paretoStartRank,
          paretoEndRank: params.paretoEndRank,
          energyMin: params.energyMin,
          energyMax: params.energyMax,
          timeMin: params.timeMin,
          timeMax: params.timeMax
        };
        
        const insightsResponse = await getRuleMiningInsights(contextParams);
        const structuredData = insightsResponse.structured_data;
        
        this.$emit('send-insights-to-chat', structuredData, { silent: true });
        
        console.log('Rule mining context sent to chat silently');
      } catch (error) {
        console.error("Error sending rule mining context to chat:", error);
      }
    },

    async getInsights() {
      if (this.rules.length === 0) {
        this.error = "Please run the analysis first before getting insights.";
        return;
      }
      
      try {
        const params = {
          objective: 'both',
          trace_name: 'Unknown',
          run_id: this.currentRunId,
          evaluator: this.selectedModel,
          region: this.selectedRegion,
          paretoStartRank: this.paretoStartRank,
          paretoEndRank: this.paretoEndRank,
          objectives: (this.selectedObjectives || []).join(','),
        };
        (this.selectedObjectives || []).forEach((name, i) => {
          if (this.customRanges[i]?.min !== '') params[`obj${i}_min`] = this.customRanges[i].min;
          if (this.customRanges[i]?.max !== '') params[`obj${i}_max`] = this.customRanges[i].max;
        });
        
        const response = await getRuleMiningInsights(params);
        const insights = response.insights;
        
        // Emit event to parent to send to chat
        this.$emit('send-insights-to-chat', insights);
        
      } catch (error) {
        console.error("Error getting insights:", error);
        this.error = "Failed to get insights. Please try again.";
      }
    }
    
    // ... other methods remain the same
  },
  mounted() {
    console.log("RuleMining component mounted!");
    console.log("Selected model:", this.selectedModel);
    console.log("File path:", this.filePath);
    console.log("Current run ID:", this.currentRunId);
    this.updatePointSelection();
  }
};
</script>

<style scoped>
.rule-mining-content {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  overflow: visible;
}
.rule-mining-content h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.2rem;
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
  background: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #2d3748;
  border-bottom: 2px solid #e2e8f0;
  position: relative;
  white-space: nowrap;
}

.rules-table th .help-tooltip-container {
  margin-left: 0.25rem;
  display: inline-block;
  vertical-align: middle;
}

.rules-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #4a5568;
}

.rules-table tr:hover {
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

.point-selection-section {
  background: #f5f8ff;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.point-selection-section h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1rem;
}

.selection-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-group label {
  font-size: 0.9rem;
  color: #4a5568;
  font-weight: 500;
  min-width: 120px;
}

.rank-inputs, .custom-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-row input {
  width: 60px;
  padding: 8px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
}

.region-summary {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #4a5568;
  background: #e2e8f0;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #cbd5e0;
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.run-button {
  background-color: #4299e1;
  color: white;
  padding: 14px 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(66,153,225,0.08);
  transition: background-color 0.2s, box-shadow 0.2s;
  min-width: 200px;
}

.run-button:hover {
  background-color: #3182ce;
  box-shadow: 0 4px 16px rgba(66,153,225,0.15);
}

.run-button:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  box-shadow: none;
}

.rules-legend {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #f5f8ff;
  border-radius: 6px;
  border: 1px solid #cbd5e0;
}

.legend-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: #4a5568;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
</style> 