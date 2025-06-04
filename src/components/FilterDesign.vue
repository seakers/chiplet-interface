<template>
  <div class="filter-design">
    <div class="filter-header">
      <h3>Filter Designs</h3>
      <button class="clear-btn" @click="clearAll">Clear All Filters</button>
    </div>
    
    <div class="filter-content">
      <div v-for="chiplet in chipletTypes" :key="chiplet" class="chiplet-section">
        <div class="chiplet-header" @click="toggleSection(chiplet)">
          <span class="chiplet-title">{{ chiplet }}</span>
          <span class="toggle-icon">{{ isOpen[chiplet] ? '▼' : '▶' }}</span>
        </div>
        
        <div v-show="isOpen[chiplet]" class="chiplet-levels">
          <label v-for="level in levels" :key="level" class="level-checkbox">
            <input
              type="checkbox"
              :value="level"
              v-model="selected[chiplet]"
              @change="emitFilters"
            />
            <span class="level-label">{{ levelLabels[level] }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue';

const chipletTypes = ['GPU', 'Attention', 'Sparse', 'Convolution'];
const levels = ['none', 'low', 'medium', 'high', 'very high'];
const levelLabels = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  'very high': 'Very High'
};

const selected = reactive({
  GPU: [],
  Attention: [],
  Sparse: [],
  Convolution: []
});

const isOpen = reactive({
  GPU: false,
  Attention: false,
  Sparse: false,
  Convolution: false
});

const emit = defineEmits(['update:activeFilters']);

const activeFilters = computed(() => {
  return chipletTypes.flatMap(chiplet =>
    selected[chiplet].map(level => `${chiplet}_${level}`)
  );
});

function toggleSection(chiplet) {
  isOpen[chiplet] = !isOpen[chiplet];
}

function emitFilters() {
  emit('update:activeFilters', activeFilters.value);
}

function clearAll() {
  chipletTypes.forEach(chiplet => {
    selected[chiplet] = [];
    isOpen[chiplet] = false;
  });
  emitFilters();
}
</script>

<style scoped>
.filter-design {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.filter-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.clear-btn {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #e5e5e5;
}

.filter-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.chiplet-section {
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
}

.chiplet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8f8f8;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.chiplet-header:hover {
  background: #f0f0f0;
}

.chiplet-title {
  font-weight: 500;
  color: #333;
}

.toggle-icon {
  color: #666;
  font-size: 0.8rem;
}

.chiplet-levels {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.level-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.level-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.level-label {
  font-size: 0.9rem;
  color: #444;
}

@media (max-width: 768px) {
  .filter-content {
    grid-template-columns: 1fr;
  }
}
</style> 