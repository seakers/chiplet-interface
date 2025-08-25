<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Create Your Own Design</span>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="chiplet-selectors">
          <div v-for="type in chipletTypes" :key="type" class="chiplet-group">
            <label :for="type">{{ type }}</label>
            <input type="number" :id="type" v-model.number="chiplets[type]" min="0" max="12" />
          </div>
        </div>
        <!-- Chiplet arrangement grid -->
        <div class="chiplet-layout-box">
          <ChipletLayout :chipletColors="chipletColors" />
        </div>
        <div class="form-group">
          <label for="trace">Select Trace</label>
          <select id="trace" v-model="selectedTrace">
            <option v-for="trace in traceOptions" :key="trace" :value="trace">{{ trace }}</option>
          </select>
        </div>
        <div class="form-group" style="position: relative;">
          <label>Select Objectives</label>
          <div class="custom-multiselect" @click="dropdownOpen = !dropdownOpen">
            <div class="selected-summary">
              {{ selectedObjectives.length ? selectedObjectives.join(', ') : 'Select objectives...' }}
            </div>
            <div v-if="dropdownOpen" class="dropdown-list" @click.stop>
              <div v-for="obj in objectivesOptions" :key="obj" class="dropdown-item">
                <label>
                  <input type="checkbox" :value="obj" v-model="selectedObjectives" />
                  {{ obj }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary submit-btn">Submit Design</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import ChipletLayout from './ChipletLayout.vue';

export default {
  name: 'CustomDesignModal',
  components: { ChipletLayout },
  props: {
    traceOptions: {
      type: Array,
      default: () => [
        "gpt-j-65536-weighted",
        "gpt-j-1024-weighted",
        "sd-test",
        "ogbn-products-test",
        "resnet50-test"
      ]
    },
    objectivesOptions: {
      type: Array,
      default: () => [
        'Energy', 'Runtime', 'Temperature', 'Area', 'Latency', 'Throughput'
      ]
    }
  },
  data() {
    return {
      chipletTypes: ['GPU', 'Attention', 'Sparse', 'Convolution'],
      chiplets: {
        GPU: 0,
        Attention: 0,
        Sparse: 0,
        Convolution: 0,
      },
      selectedTrace: '',
      selectedObjectives: [],
      dropdownOpen: false,
    };
  },
  computed: {
    chipletColors() {
      const colorMap = {
        GPU: "#8fbf80",
        Attention: "#f8cd42",
        Sparse: "#70adcd",
        Convolution: "#f7a42f",
        Default: "#9e9e9e"
      };
      const colors = [];
      for (const type of this.chipletTypes) {
        for (let i = 0; i < this.chiplets[type]; i++) {
          colors.push(colorMap[type] || colorMap.Default);
        }
      }
      while (colors.length < 12) colors.push(colorMap.Default);
      return colors.slice(0, 12);
    }
  },
  methods: {
    handleSubmit() {
      this.$emit('submit-custom-design', {
        custom_design: true,
        model: 'CASCADE',
        trace: this.selectedTrace,
        objectives: this.selectedObjectives,
        chiplets: {
          gpu: this.chiplets.GPU,
          attention: this.chiplets.Attention,
          sparse: this.chiplets.Sparse,
          convolution: this.chiplets.Convolution,
        }
      });
    },
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.dropdownOpen = false;
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15);
  padding: 2rem 2.5rem 1.5rem 2.5rem;
  min-width: 340px;
  max-width: 95vw;
  position: relative;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #2c3e50;
}
.close-btn {
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
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
.chiplet-selectors {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.chiplet-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
}
.form-group {
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.custom-multiselect {
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  background: #f9fafb;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  position: relative;
  min-height: 2.5rem;
}
.selected-summary {
  color: #2d3748;
  font-size: 1rem;
}
.dropdown-list {
  position: absolute;
  left: 0;
  top: 110%;
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.10);
  z-index: 10;
  min-width: 200px;
  padding: 0.5rem 0;
}
.dropdown-item {
  padding: 0.25rem 1rem;
  font-size: 1rem;
}
.dropdown-item label {
  cursor: pointer;
  user-select: none;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
.submit-btn {
  min-width: 120px;
  font-size: 1.1rem;
  font-weight: 700;
}
.chiplet-layout-box {
  width: 100%;
  max-width: 260px;
  margin: 1rem 0 1.5rem 0;
}
</style> 