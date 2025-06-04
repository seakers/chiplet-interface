<template>
  <div class="chiplet-menu-content">
    <div class="window-header">
      <span>Selected Design</span>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="selected-point-info">
      <div class="design-data-card">Design Data</div>
      <p><strong>{{ xLabel }}:</strong> {{ x !== undefined ? Number(x).toFixed(2) : '' }}</p>
      <p><strong>{{ yLabel }}:</strong> {{ y !== undefined ? Number(y).toFixed(2) : '' }}</p>
      <button class="point-button minimal-btn no-bold" @click="sendToChat">Send to chat</button>
    </div>
    <h3>Modify Design</h3>
    <div class="input-group" v-for="(value, key) in inputs" :key="key">
      <label :for="key">
        <span class="color-box" :style="{ backgroundColor: colorMap[key] }"></span>
        {{ key }}
      </label>
      <input type="number" :id="key" v-model.number="inputs[key]" min="0" max="12" />
    </div>
    <div style="margin-top: 1rem;">
      <label for="chiplet-type">Trace</label><br>
      <select id="chiplet-type" v-model="selectedTrace">
        <option v-for="item in traceOptions" :key="item" :value="item">
          {{ item }}
        </option>
      </select>
    </div>
    <button :disabled="!isSumValid || isRunning" @click="emitDesign" class="minimal-btn">Evaluate Modified Design</button>
    <p v-if="!isSumValid" class="warning">Total must sum to 12, there are {{ total }}</p>
  </div>
</template>

<script>
export default {
  name: "ModifyDesignMenu",
  props: {
    initialGPU: { type: Number, required: true },
    initialAttention: { type: Number, required: true },
    initialSparse: { type: Number, required: true },
    initialConvolution: { type: Number, required: true },
    initialTrace: { type: String, default: "" },
    traceOptions: { type: Array, default: () => [
      "gpt-j-65536-weighted", "gpt-j-1024-weighted", "sd-test", "ogbn-products-test", "resnet50-test"
    ] },
    x: { type: [Number, String], default: null },
    y: { type: [Number, String], default: null },
    xLabel: { type: String, default: '' },
    yLabel: { type: String, default: '' },
  },
  data() {
    return {
      inputs: {
        GPU: this.initialGPU,
        Attention: this.initialAttention,
        Sparse: this.initialSparse,
        Convolution: this.initialConvolution,
      },
      selectedTrace: this.initialTrace,
      isRunning: false,
      colorMap: {
        GPU: "#8fbf80",
        Attention: "#f8cd42",
        Sparse: "#70adcd",
        Convolution: "#f7a42f",
        Default: "#9e9e9e"
      },
    };
  },
  computed: {
    total() {
      return Object.values(this.inputs).reduce((acc, val) => acc + val, 0);
    },
    isSumValid() {
      return this.total === 12;
    },
  },
  methods: {
    emitDesign() {
      this.$emit("evaluate-modified-design", {
        ...this.inputs,
        trace: this.selectedTrace
      });
    },
    sendToChat() {
      this.$emit('send-to-chat', {
        x: this.x,
        y: this.y,
        xLabel: this.xLabel,
        yLabel: this.yLabel,
        ...this.inputs,
        trace: this.selectedTrace
      });
    }
  },
};
</script>

<style scoped>
.chiplet-menu-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0.5rem 1rem 0.5rem;
  max-width: 340px;
  margin: 0 auto;
  position: relative;
}
.window-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e6ed;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 1.15rem;
  width: 100%;
  position: relative;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0 0.5rem;
  line-height: 1;
}
.close-btn:hover {
  color: #343a40;
}
.selected-point-info {
  margin-bottom: 1rem;
  text-align: center;
}
.point-button {
  margin: 10px 0 0 0;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}
.point-button:hover {
  background: #2356b8;
}
.input-group {
  display: flex;
  flex-direction: row;
  margin-bottom: 10px;
  justify-content: space-between;
  width: 100%;
  max-width: 260px;
}
.color-box {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 2px;
  border: 1px solid #ccc;
}
.warning {
  color: red;
  font-size: 0.8em;
}
.minimal-btn {
  margin-top: 10px;
  padding: 6px 12px;
  border-radius: 5px;
  background: #337aff;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  border: 1px solid #b3c6e0;
  cursor: pointer;
  transition: background 0.2s;
}
.minimal-btn:disabled {
  background: #b3c6e0;
  cursor: not-allowed;
}
.point-button.minimal-btn.no-bold {
  font-weight: 400;
}
.design-data-card {
  font-size: 1.5rem;
  font-weight: 700;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 1rem 0;
  margin-bottom: 1rem;
  margin-top: 0.5rem;
  text-align: center;
}
</style> 