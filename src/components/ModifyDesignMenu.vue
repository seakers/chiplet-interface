<template>
  <div class="chiplet-menu-content">
    <h3>Modify Design</h3>
    <div class="selected-point-info">
      <p><strong>{{ xLabel }}:</strong> {{ x !== undefined ? Number(x).toFixed(2) : '' }}</p>
      <p><strong>{{ yLabel }}:</strong> {{ y !== undefined ? Number(y).toFixed(2) : '' }}</p>
    </div>
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
.selected-point-info {
  margin-bottom: 1rem;
  text-align: center;
}
</style> 