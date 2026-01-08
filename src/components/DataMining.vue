<template>
  <div class="data-mining">
    <div class="data-mining-header">
      <h2 class="data-mining-title">Data Mining</h2>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="data-mining-content">
      <div class="analysis-cards">
        <div class="analysis-card" @click="showRuleMining = !showRuleMining" :class="{ active: showRuleMining }">
          <div class="card-content">
            <h3 class="card-title">Rule Mining</h3>
            <p class="card-description">
              Finds chiplet‑count rules (e.g., low/medium/high) that frequently occur in top Pareto ranks.
              Reports confidence and lift to show rule strength.
            </p>
            <div class="card-features">
              <span class="feature-tag">Pattern Discovery</span>
              <span class="feature-tag">Feature Relationships</span>
              <span class="feature-tag">Optimization Insights</span>
            </div>
          </div>
          <div class="card-action">
            <button class="card-btn" :class="{ active: showRuleMining }">
              {{ showRuleMining ? 'Close Analysis' : 'Run Analysis' }}
            </button>
          </div>
        </div>

        <div class="analysis-card" @click="showDistanceCorrelation = !showDistanceCorrelation" :class="{ active: showDistanceCorrelation }">
          <div class="card-content">
            <h3 class="card-title">Distance Correlation Study</h3>
            <p class="card-description">
              Quantifies dependence between chiplet types and objectives (linear and nonlinear).
              Higher distance‑correlation indicates a stronger relationship.
            </p>
            <div class="card-features">
              <span class="feature-tag">Nonlinear Analysis</span>
              <span class="feature-tag">Statistical Dependencies</span>
              <span class="feature-tag">Complex Relationships</span>
            </div>
          </div>
          <div class="card-action">
            <button class="card-btn" :class="{ active: showDistanceCorrelation }">
              {{ showDistanceCorrelation ? 'Close Analysis' : 'Run Analysis' }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="showRuleMining" class="analysis-window">
        <div class="analysis-window-header">
          <h3>Rule Mining</h3>
          <button @click="showRuleMining = false" class="close-btn" aria-label="Close">&times;</button>
        </div>
        <RuleMining :filePath="filePath" :selectedModel="selectedModel" @send-insights-to-chat="$emit('send-insights-to-chat', $event)" />
      </div>
      <div v-if="showDistanceCorrelation" class="analysis-window">
        <div class="analysis-window-header">
          <h3>Distance Correlation Study</h3>
          <button @click="showDistanceCorrelation = false" class="close-btn" aria-label="Close">&times;</button>
        </div>
        <DistanceCorrelation :filePath="filePath" :selectedModel="selectedModel" @send-insights-to-chat="$emit('send-insights-to-chat', $event)" />
      </div>
    </div>
  </div>
</template>

<script>
import RuleMining from './RuleMining.vue';
import DistanceCorrelation from './DistanceCorrelation.vue';

export default {
  name: 'DataMining',
  components: {
    RuleMining,
    DistanceCorrelation,
  },
  data() {
    return {
      showRuleMining: false,
      showDistanceCorrelation: false,
      distanceCorrelationData: null,
      ruleMiningData: null,
      isLoading: false,
      error: null
    };
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
    closable: {
      type: Boolean,
      default: true
    },
    mounted() {
      console.log('DataMining component mounted');
      console.log('Received selectedModel prop:', this.selectedModel);
      console.log('Received filePath prop:', this.filePath);
    }
  },
};
</script>

<style scoped>
.data-mining {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.data-mining-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
}

.data-mining-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.data-mining-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.analysis-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.analysis-card {
  background: #fff;
  border: 2px solid #e0e6ed;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
}

.analysis-card:hover {
  border-color: #337aff;
  box-shadow: 0 4px 16px rgba(51, 122, 255, 0.15);
  transform: translateY(-2px);
}

.analysis-card.active {
  border-color: #337aff;
  background: #f8faff;
  box-shadow: 0 4px 16px rgba(51, 122, 255, 0.2);
}


.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
  text-align: center;
}

.card-description {
  font-size: 0.95rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
  text-align: center;
}

.card-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.5rem;
}

.feature-tag {
  background: #eaf1ff;
  color: #337aff;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #d1e7ff;
}

.analysis-card.active .feature-tag {
  background: #337aff;
  color: #fff;
  border-color: #337aff;
}

.card-action {
  display: flex;
  justify-content: center;
  margin-top: auto;
}

.card-btn {
  background: #337aff;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(51, 122, 255, 0.2);
}

.card-btn:hover {
  background: #2356b8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(51, 122, 255, 0.3);
}

.card-btn.active {
  background: #dc2626;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
}

.card-btn.active:hover {
  background: #b91c1c;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.analysis-window {
  position: relative;
  background: #f9fafb;
  border: 1.5px solid #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(44, 62, 80, 0.10);
  padding: 1.5rem;
  min-width: 0;
}

.analysis-window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
  position: relative;
}

.analysis-window-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.close-btn {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #f3f4f6;
  color: #374151;
  border: none;
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
  box-shadow: 0 1px 4px rgba(44, 62, 80, 0.08);
}

.close-btn:hover {
  background: #e0e6ed;
  color: #111827;
}

.btn {
  display: inline-block;
  font-weight: 600;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1rem;
  transition: background 0.2s, box-shadow 0.2s;
  border: none;
  outline: none;
  cursor: pointer;
}

.btn-primary {
  background: #337aff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.10);
}

.btn-primary:hover:not(:disabled) {
  background: #2356b8;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 600px) {
  .analysis-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .analysis-card {
    padding: 1.25rem;
  }
  
  
  .card-title {
    font-size: 1.2rem;
  }
  
  .card-description {
    font-size: 0.9rem;
  }
  
  .card-features {
    gap: 0.4rem;
  }
  
  .feature-tag {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
  }
  
  .card-btn {
    width: 100%;
    padding: 0.8rem 1.2rem;
  }
}
</style> 