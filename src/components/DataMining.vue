<template>
  <div class="data-mining dock-window">
    <div class="dock-header">
      <span class="drag-handle">≡</span>
      <h3 class="dock-title">Data Mining</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="flex justify-center gap-4 mt-4">
      <button class="btn btn-primary" @click="showRuleMining = !showRuleMining">Rule Mining</button>
      <button class="btn btn-primary" @click="showDistanceCorrelation = !showDistanceCorrelation">Distance Correlation Study</button>
    </div>
    <div v-if="showRuleMining" class="mini-window">
      <div class="mini-window-header">
        <h3>Rule Mining</h3>
        <button @click="showRuleMining = false" class="close-btn" aria-label="Close">&times;</button>
      </div>
      <RuleMining :filePath="filePath" @send-insights-to-chat="$emit('send-insights-to-chat', $event)" />
    </div>
    <div v-if="showDistanceCorrelation" class="mini-window">
      <div class="mini-window-header">
        <button @click="showDistanceCorrelation = false" class="close-btn" aria-label="Close">&times;</button>
      </div>
      <DistanceCorrelation :filePath="filePath" @send-insights-to-chat="$emit('send-insights-to-chat', $event)" />
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
    closable: {
      type: Boolean,
      default: true
    }
  },
};
</script>

<style scoped>
.data-mining-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 2rem 2.5rem 2.5rem 2.5rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 32px;
  margin-right: 32px;
  position: relative;
}
.data-mining-header {
  margin-bottom: 1.2rem;
}
.data-mining-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.2rem;
}
.data-mining-subtext {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}
.mini-window {
  position: relative;
  background: #f9fafb;
  border: 1.5px solid #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(44, 62, 80, 0.10);
  margin-top: 2rem;
  margin-bottom: 1rem;
  padding: 1.5rem 1.5rem 1.5rem 1.5rem;
  min-width: 0;
}
.mini-window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
  position: relative;
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
.dock-window {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 1.5rem 2rem 2rem 2rem;
  margin: 0 0 1.5rem 0;
  width: 100%;
  flex: 1 1 0;
  position: relative;
  display: flex;
  flex-direction: column;
}
.dock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.dock-title {
  flex: 1;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}
.drag-handle {
  cursor: grab;
  margin-right: 0.5rem;
  font-size: 1.2rem;
  color: #bbb;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #888;
  cursor: pointer;
  margin-left: 1rem;
}
</style> 