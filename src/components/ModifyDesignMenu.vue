<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Modify Design</span>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      <div class="chiplet-selectors">
        <div v-for="(value, key) in inputs" :key="key" class="chiplet-group">
          <label :for="key">{{ key }}</label>
          <input type="number" :id="key" v-model.number="inputs[key]" min="0" max="12" />
        </div>
      </div>
      <div class="total-display" :class="{ 'valid': isSumValid, 'invalid': !isSumValid }">
        Total: {{ total }}/12
      </div>
      <div class="form-actions">
        <button type="button" class="btn cancel-btn" @click="$emit('close')" :disabled="isRunning">Cancel</button>
        <button 
          type="button" 
          class="btn submit-btn" 
          :disabled="!isSumValid || isRunning"
          @click="handleButtonClick"
        >
          <span v-if="isRunning">Evaluating...</span>
          <span v-else>Modify Design</span>
        </button>
        <button 
          type="button" 
          class="btn chat-btn" 
          @click="sendToChat"
        >
          Send to Chat
        </button>
      </div>
      <div class="validation-info">
        <p v-if="!isSumValid" class="warning">Total must sum to 12, current total: {{ total }}</p>
        <p v-else class="success">Total: {{ total }} ✓</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ModifyDesignMenu",
  emits: ['close', 'submit-modified-design', 'send-to-chat'],
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
  created() {
    // Ensure inputs are initialized with current prop values
    console.log('=== ModifyDesignMenu CREATED ===');
    console.log('Props at creation:', {
      GPU: this.initialGPU,
      Attention: this.initialAttention,
      Sparse: this.initialSparse,
      Convolution: this.initialConvolution,
      Trace: this.initialTrace
    });
    
    // Force update inputs with current prop values
    this.inputs = {
      GPU: this.initialGPU,
      Attention: this.initialAttention,
      Sparse: this.initialSparse,
      Convolution: this.initialConvolution,
    };
    this.selectedTrace = this.initialTrace;
    
    console.log('Inputs initialized to:', this.inputs);
    console.log('=== END CREATED ===');
  },
  computed: {
    total() {
      return Object.values(this.inputs).reduce((acc, val) => acc + val, 0);
    },
    isSumValid() {
      const valid = this.total === 12;
      console.log('Validation check - Total:', this.total, 'Valid:', valid);
      return valid;
    },
  },
  watch: {
    // Watch for changes in initial props and update inputs accordingly
    initialGPU(newVal, oldVal) {
      console.log('initialGPU changed from', oldVal, 'to:', newVal);
      this.inputs.GPU = newVal;
      console.log('inputs.GPU updated to:', this.inputs.GPU);
    },
    initialAttention(newVal, oldVal) {
      console.log('initialAttention changed from', oldVal, 'to:', newVal);
      this.inputs.Attention = newVal;
      console.log('inputs.Attention updated to:', this.inputs.Attention);
    },
    initialSparse(newVal, oldVal) {
      console.log('initialSparse changed from', oldVal, 'to:', newVal);
      this.inputs.Sparse = newVal;
      console.log('inputs.Sparse updated to:', this.inputs.Sparse);
    },
    initialConvolution(newVal, oldVal) {
      console.log('initialConvolution changed from', oldVal, 'to:', newVal);
      this.inputs.Convolution = newVal;
      console.log('inputs.Convolution updated to:', this.inputs.Convolution);
    },
    initialTrace(newVal, oldVal) {
      console.log('initialTrace changed from', oldVal, 'to:', newVal);
      this.selectedTrace = newVal;
    },
  },
  mounted() {
    // Ensure inputs are properly initialized when component mounts
    console.log('=== ModifyDesignMenu MOUNTED ===');
    console.log('Props received:', {
      GPU: this.initialGPU,
      Attention: this.initialAttention,
      Sparse: this.initialSparse,
      Convolution: this.initialConvolution,
      Trace: this.initialTrace
    });
    console.log('Current inputs after mount:', this.inputs);
    console.log('Total after mount:', this.total);
    console.log('=== END MOUNT ===');
  },
  methods: {
    emitDesign() {
      console.log('emitDesign called');
      console.log('Current inputs:', this.inputs);
      console.log('Total:', this.total);
      console.log('isSumValid:', this.isSumValid);
      this.$emit("submit-modified-design", {
        chiplets: { ...this.inputs }
      });
    },
    handleButtonClick() {
      console.log('=== BUTTON CLICKED ===');
      console.log('Button clicked - handleButtonClick');
      console.log('Current inputs at button click:', this.inputs);
      console.log('Total at button click:', this.total);
      console.log('isSumValid at button click:', this.isSumValid);
      console.log('isRunning at button click:', this.isRunning);
      
      if (this.isSumValid && !this.isRunning) {
        console.log('Emitting submit-modified-design event');
        const designData = {
          chiplets: { ...this.inputs }
        };
        console.log('Design data being emitted:', designData);
        this.$emit("submit-modified-design", designData);
      } else {
        console.log('Button click ignored - not valid or running');
      }
      console.log('=== END BUTTON CLICK ===');
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
  color: #e03131;
  font-size: 0.9em;
  font-weight: 600;
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
/* Modal overlay and modal content styles to match CustomDesignModal */
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
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  gap: 1rem;
}
.btn {
  min-width: 100px;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #b3c6e0;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  transition: background 0.2s;
}
.submit-btn {
  background: #37b24d;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.submit-btn:hover:not(:disabled) {
  background: #2d8f3f;
  transform: translateY(-1px);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  background: #b3c6e0;
  color: #fff;
  cursor: not-allowed;
  transform: none;
}
.cancel-btn {
  background: #e0e6ed;
  color: #374151;
}
.cancel-btn:hover {
  background: #d1d5db;
}
.chat-btn {
  background: #6366f1;
  color: #fff;
}
.chat-btn:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}
.chat-btn:active {
  transform: translateY(0);
}
.validation-info {
  margin-top: 1rem;
  text-align: center;
}
.success {
  color: #37b24d;
  font-size: 0.9em;
  font-weight: 600;
}
.total-display {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1.5rem;
  text-align: center;
}
.total-display.valid {
  color: #37b24d;
}
.total-display.invalid {
  color: #e03131;
}
</style> 