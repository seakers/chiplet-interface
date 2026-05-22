<template>
  <div class="design-visualizer">
    <div class="visualizer-header">
      <h3>Design Visualizer</h3>
      <div v-if="currentPoint" class="design-status">
        <span v-if="isSelected" class="status-badge selected">Selected</span>
        <span v-if="isHovered" class="status-badge hovered">Hovered</span>
        <span v-if="customPoint" class="status-badge custom">Custom</span>
      </div>
    </div>

    <div v-if="currentPoint" class="visualizer-content">
      <!-- Show both states when they're different -->
      <div v-if="showBothStates" class="dual-state-info">
          <div class="state-comparison">
              <div class="selected-info">
                  <h4>Selected Design</h4>
                  <div class="info-grid">
                      <template v-if="isPistilPoint">
                          <div class="info-item">
                              <span class="info-label">{{ selectedXAxis || 'Latency per Token (ms)' }}:</span>
                              <span class="info-value">{{ formatValue(selectedPoint.x) }}</span>
                          </div>
                          <div class="info-item">
                              <span class="info-label">{{ selectedYAxis || 'Energy per Inference (mJ)' }}:</span>
                              <span class="info-value">{{ formatValue(selectedPoint.y) }}</span>
                          </div>
                          <div class="info-item" v-if="selectedPoint.num_cus !== undefined">
                              <span class="info-label">CUs:</span>
                              <span class="info-value">{{ selectedPoint.num_cus }}</span>
                          </div>
                          <div class="info-item" v-if="selectedPoint.batch_size !== undefined">
                              <span class="info-label">Batch Size:</span>
                              <span class="info-value">{{ selectedPoint.batch_size }}</span>
                          </div>
                      </template>
                      <template v-else>
                          <div class="info-item">
                              <span class="info-label">Execution Time:</span>
                              <span class="info-value">{{ formatValue(selectedPoint.x) }} ms</span>
                          </div>
                          <div class="info-item">
                              <span class="info-label">Energy:</span>
                              <span class="info-value">{{ formatValue(selectedPoint.y) }} mJ</span>
                          </div>
                      </template>
                  </div>
              </div>
              <div class="hovered-info">
                  <h4>Hovered Design</h4>
                  <div class="info-grid">
                      <template v-if="isPistilPoint">
                          <div class="info-item">
                              <span class="info-label">{{ selectedXAxis || 'Latency per Token (ms)' }}:</span>
                              <span class="info-value">{{ formatValue(hoveredPoint.x) }}</span>
                          </div>
                          <div class="info-item">
                              <span class="info-label">{{ selectedYAxis || 'Energy per Inference (mJ)' }}:</span>
                              <span class="info-value">{{ formatValue(hoveredPoint.y) }}</span>
                          </div>
                          <div class="info-item" v-if="hoveredPoint.num_cus !== undefined">
                              <span class="info-label">CUs:</span>
                              <span class="info-value">{{ hoveredPoint.num_cus }}</span>
                          </div>
                          <div class="info-item" v-if="hoveredPoint.batch_size !== undefined">
                              <span class="info-label">Batch Size:</span>
                              <span class="info-value">{{ hoveredPoint.batch_size }}</span>
                          </div>
                      </template>
                      <template v-else>
                          <div class="info-item">
                              <span class="info-label">Execution Time:</span>
                              <span class="info-value">{{ formatValue(hoveredPoint.x) }} ms</span>
                          </div>
                          <div class="info-item">
                              <span class="info-label">Energy:</span>
                              <span class="info-value">{{ formatValue(hoveredPoint.y) }} mJ</span>
                          </div>
                      </template>
                  </div>
              </div>
          </div>
      </div>

      <!-- Show selected vs custom design comparison -->
      <div v-else-if="showSelectedVsCustom" class="dual-state-info">
          <div class="selected-info">
              <h4>Selected Design</h4>
              <template v-if="isPistilPoint">
                  <div class="design-parameters-list">
                      <div class="parameter-item" v-if="selectedPoint.num_cus !== undefined">
                          <span class="parameter-label">Number of CUs:</span>
                          <span class="parameter-value">{{ selectedPoint.num_cus }}</span>
                      </div>
                      <div class="parameter-item" v-if="selectedPoint.num_tmacs !== undefined">
                          <span class="parameter-label">Number of TMACs:</span>
                          <span class="parameter-value">{{ selectedPoint.num_tmacs }}</span>
                      </div>
                      <div class="parameter-item" v-if="selectedPoint.mem_buf_cap !== undefined">
                          <span class="parameter-label">Memory Buffer Cap:</span>
                          <span class="parameter-value">{{ selectedPoint.mem_buf_cap }} GB</span>
                      </div>
                      <div class="parameter-item" v-if="selectedPoint.batch_size !== undefined">
                          <span class="parameter-label">Batch Size:</span>
                          <span class="parameter-value">{{ selectedPoint.batch_size }}</span>
                      </div>
                  </div>
                  <div class="performance-metrics">
                      <div class="metric">
                          <span class="metric-label">{{ selectedXAxis || 'Latency per Token' }}:</span>
                          <span class="metric-value">{{ formatValue(selectedPoint.x) }}</span>
                      </div>
                      <div class="metric">
                          <span class="metric-label">{{ selectedYAxis || 'Energy per Inference' }}:</span>
                          <span class="metric-value">{{ formatValue(selectedPoint.y) }}</span>
                      </div>
                  </div>
              </template>
              <template v-else>
                  <div class="chiplet-details">
                      <div class="chiplet-item">
                          <span class="chiplet-label">GPU:</span>
                          <span class="chiplet-value">{{ selectedPoint.gpu }}</span>
                      </div>
                      <div class="chiplet-item">
                          <span class="chiplet-label">Attention:</span>
                          <span class="chiplet-value">{{ selectedPoint.attn }}</span>
                      </div>
                      <div class="chiplet-item">
                          <span class="chiplet-label">Sparse:</span>
                          <span class="chiplet-value">{{ selectedPoint.sparse }}</span>
                      </div>
                      <div class="chiplet-item">
                          <span class="chiplet-label">Convolution:</span>
                          <span class="chiplet-value">{{ selectedPoint.conv }}</span>
                      </div>
                  </div>
                  <div class="performance-metrics">
                      <div class="metric">
                          <span class="metric-label">Execution Time:</span>
                          <span class="metric-value">{{ selectedPoint.x?.toFixed(2) }} ms</span>
                      </div>
                      <div class="metric">
                          <span class="metric-label">Energy:</span>
                          <span class="metric-value">{{ selectedPoint.y?.toFixed(2) }} mJ</span>
                      </div>
                  </div>
              </template>
          </div>
          <div class="custom-info">
              <h4>Custom Design <span class="status-badge custom" :class="{ saved: customPoint?.saved }">{{ customPoint?.saved ? 'Saved' : 'New' }}</span></h4>
              <!-- Pistil custom editing not yet supported — show read-only -->
              <template v-if="isPistilPoint">
                  <div class="design-parameters-list">
                      <div class="parameter-item">
                          <span class="parameter-label">{{ selectedXAxis || 'Latency per Token' }}:</span>
                          <span class="parameter-value">{{ formatValue(customPoint?.x) }}</span>
                      </div>
                      <div class="parameter-item">
                          <span class="parameter-label">{{ selectedYAxis || 'Energy per Inference' }}:</span>
                          <span class="parameter-value">{{ formatValue(customPoint?.y) }}</span>
                      </div>
                  </div>
              </template>
              <template v-else>
                  <div class="chiplet-details">
                      <div class="chiplet-item">
                          <span class="chiplet-label">GPU:</span>
                          <input v-model.number="customChiplets.gpu" type="number" min="0" max="12" class="chiplet-input" />
                      </div>
                      <div class="chiplet-item">
                          <span class="chiplet-label">Attention:</span>
                          <input v-model.number="customChiplets.attn" type="number" min="0" max="12" class="chiplet-input" />
                      </div>
                      <div class="chiplet-item">
                          <span class="chiplet-label">Sparse:</span>
                          <input v-model.number="customChiplets.sparse" type="number" min="0" max="12" class="chiplet-input" />
                      </div>
                      <div class="chiplet-item">
                          <span class="chiplet-label">Convolution:</span>
                          <input v-model.number="customChiplets.conv" type="number" min="0" max="12" class="chiplet-input" />
                      </div>
                  </div>
                  <div class="performance-metrics">
                      <div class="metric">
                          <span class="metric-label">Execution Time:</span>
                          <span class="metric-value">{{ customPoint?.x?.toFixed(2) }} ms</span>
                      </div>
                      <div class="metric">
                          <span class="metric-label">Energy:</span>
                          <span class="metric-value">{{ customPoint?.y?.toFixed(2) }} mJ</span>
                      </div>
                  </div>
                  <div class="action-buttons">
                      <button @click="evaluateDesign" class="evaluate-btn">Evaluate Design</button>
                  </div>
              </template>
          </div>
      </div>

      <!-- Show single design info when only one state is active -->
      <div v-else :class="isPistilPoint ? 'two-column-layout' : 'three-column-layout'">
        <!-- PISTIL Design View -->
        <template v-if="isPistilPoint">
          <!-- Column 1: Design Decisions (Pistil Parameters) -->
          <div class="design-info-column">
            <h4>Design Decisions</h4>
            <div class="design-parameters-list">
              <div class="parameter-item" v-if="currentPoint.num_cus !== undefined">
                <span class="parameter-label">Number of CUs:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.num_cus) }}</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.num_tmacs !== undefined">
                <span class="parameter-label">Number of TMACs:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.num_tmacs) }}</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.mem_buf_cap !== undefined">
                <span class="parameter-label">Memory Buffer Capacity:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.mem_buf_cap) }} GB</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.net_buf_cap !== undefined">
                <span class="parameter-label">Network Buffer Capacity:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.net_buf_cap) }} GB</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.mem_banks_per_group !== undefined">
                <span class="parameter-label">Memory Banks per Group:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.mem_banks_per_group) }}</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.mem_ranks !== undefined">
                <span class="parameter-label">Memory Ranks:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.mem_ranks) }}</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.mem_frac_bank_cap !== undefined">
                <span class="parameter-label">Memory Fractional Bank Capacity:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.mem_frac_bank_cap) }}</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.batch_size !== undefined">
                <span class="parameter-label">Batch Size:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.batch_size) }}</span>
              </div>
              <div class="parameter-item" v-if="currentPoint.kv_cache !== undefined">
                <span class="parameter-label">KV Cache:</span>
                <span class="parameter-value">{{ formatValue(currentPoint.kv_cache) }}</span>
              </div>
            </div>
          </div>

          <!-- Column 2: Objective Values (All Pistil Objectives) - 2 columns layout -->
          <div class="chiplet-counts-column">
            <h4>Objective Values</h4>
            <div class="objective-values-list">
              <div class="objective-item" v-if="currentPoint.latency_per_token_ms !== undefined">
                <span class="objective-label">Latency per Token:</span>
                <span class="objective-value">{{ formatValue(currentPoint.latency_per_token_ms) }} ms</span>
              </div>
              <div class="objective-item" v-if="currentPoint.energy_per_inference_mJ !== undefined">
                <span class="objective-label">Energy per Inference:</span>
                <span class="objective-value">{{ formatValue(currentPoint.energy_per_inference_mJ) }} mJ</span>
              </div>
              <div class="objective-item" v-if="currentPoint.energy_per_token_mJ !== undefined">
                <span class="objective-label">Energy per Token:</span>
                <span class="objective-value">{{ formatValue(currentPoint.energy_per_token_mJ) }} mJ</span>
              </div>
              <div class="objective-item" v-if="currentPoint.average_power_W !== undefined">
                <span class="objective-label">Average Power:</span>
                <span class="objective-value">{{ formatValue(currentPoint.average_power_W) }} W</span>
              </div>
              <div class="objective-item" v-if="currentPoint.system_power_W !== undefined">
                <span class="objective-label">System Power:</span>
                <span class="objective-value">{{ formatValue(currentPoint.system_power_W) }} W</span>
              </div>
              <div class="objective-item" v-if="currentPoint.system_cost !== undefined">
                <span class="objective-label">System Cost:</span>
                <span class="objective-value">${{ formatValue(currentPoint.system_cost) }}</span>
              </div>
              <div class="objective-item" v-if="currentPoint.avg_comp_util !== undefined">
                <span class="objective-label">Avg Compute Util:</span>
                <span class="objective-value">{{ formatValue(currentPoint.avg_comp_util) }}%</span>
              </div>
              <div class="objective-item" v-if="currentPoint.avg_mem_util !== undefined">
                <span class="objective-label">Avg Memory Util:</span>
                <span class="objective-value">{{ formatValue(currentPoint.avg_mem_util) }}%</span>
              </div>
              <div class="objective-item" v-if="currentPoint.prefill_tokens_per_sec !== undefined">
                <span class="objective-label">Prefill Tokens/sec:</span>
                <span class="objective-value">{{ formatValue(currentPoint.prefill_tokens_per_sec) }}</span>
              </div>
              <div class="objective-item" v-if="currentPoint.system_compute_TOPS !== undefined">
                <span class="objective-label">System Compute:</span>
                <span class="objective-value">{{ formatValue(currentPoint.system_compute_TOPS) }} TOPS</span>
              </div>
              <div class="objective-item" v-if="currentPoint.system_bandwidth_TBps !== undefined">
                <span class="objective-label">System Bandwidth:</span>
                <span class="objective-value">{{ formatValue(currentPoint.system_bandwidth_TBps) }} TB/s</span>
              </div>
              <div class="objective-item" v-if="currentPoint.system_capacity_GB !== undefined">
                <span class="objective-label">System Capacity:</span>
                <span class="objective-value">{{ formatValue(currentPoint.system_capacity_GB) }} GB</span>
              </div>
              <!-- Also show x and y (currently selected axes) with actual objective names -->
              <div class="objective-item" style="background: #e6f3ff; border: 2px solid #4a90e2;">
                <span class="objective-label"><strong>X-axis: {{ selectedXAxis || 'Latency per Token (ms)' }}</strong></span>
                <span class="objective-value"><strong>{{ formatValue(currentPoint.x) }}</strong></span>
              </div>
              <div class="objective-item" style="background: #e6f3ff; border: 2px solid #4a90e2;">
                <span class="objective-label"><strong>Y-axis: {{ selectedYAxis || 'Energy per Inference (mJ)' }}</strong></span>
                <span class="objective-value"><strong>{{ formatValue(currentPoint.y) }}</strong></span>
              </div>
            </div>
          </div>
        </template>

        <!-- CASCADE Design View (Original) -->
        <template v-else>
          <!-- Column 1: Design Information -->
          <div class="design-info-column">
            <h4>Design Information</h4>
            <div class="performance-metrics">
              <div class="info-item">
                <span class="info-label">Execution Time:</span>
                <span class="info-value">{{ formatValue(currentPoint.x) }} ms</span>
              </div>
              <div class="info-item">
                <span class="info-label">Energy:</span>
                <span class="info-value">{{ formatValue(currentPoint.y) }} mJ</span>
              </div>
              <!-- Add more objectives here if needed -->
            </div>
          </div>

          <!-- Column 2: Chiplet Counts -->
          <div class="chiplet-counts-column">
            <h4>Chiplet Counts</h4>
            <div class="chiplet-counts">
              <div class="chiplet-count-item">
                <span class="chiplet-count-label">GPU:</span>
                <span v-if="!isSelected" class="chiplet-count-value">{{ currentPoint.gpu || 0 }}</span>
                <input 
                  v-else
                  v-model.number="editableValues.gpu" 
                  type="number" 
                  min="0" 
                  max="12" 
                  class="chiplet-count-input"
                  @input="validateTotalChiplets"
                />
              </div>
              <div class="chiplet-count-item">
                <span class="chiplet-count-label">Attention:</span>
                <span v-if="!isSelected" class="chiplet-count-value">{{ currentPoint.attn || 0 }}</span>
                <input 
                  v-else
                  v-model.number="editableValues.attn" 
                  type="number" 
                  min="0" 
                  max="12" 
                  class="chiplet-count-input"
                  @input="validateTotalChiplets"
                />
              </div>
              <div class="chiplet-count-item">
                <span class="chiplet-count-label">Sparse:</span>
                <span v-if="!isSelected" class="chiplet-count-value">{{ currentPoint.sparse || 0 }}</span>
                <input 
                  v-else
                  v-model.number="editableValues.sparse" 
                  type="number" 
                  min="0" 
                  max="12" 
                  class="chiplet-count-input"
                  @input="validateTotalChiplets"
                />
              </div>
              <div class="chiplet-count-item">
                <span class="chiplet-count-label">Convolution:</span>
                <span v-if="!isSelected" class="chiplet-count-value">{{ currentPoint.conv || 0 }}</span>
                <input 
                  v-else
                  v-model.number="editableValues.conv" 
                  type="number" 
                  min="0" 
                  max="12" 
                  class="chiplet-count-input"
                  @input="validateTotalChiplets"
                />
              </div>
              <div v-if="isSelected" class="chiplet-count-item total-chiplets">
                <span class="chiplet-count-label">Total:</span>
                <span class="chiplet-count-value" :class="{ 
                  'error': totalChiplets > 12 || totalChiplets < 12,
                  'warning': totalChiplets < 12 && totalChiplets > 0
                }">
                  {{ totalChiplets }}/12
                </span>
              </div>
            </div>
          </div>

          <!-- Column 3: Chiplet Layout -->
          <div class="chiplet-layout-column">
            <h4>Chiplet Layout</h4>
            <div class="chiplet-grid">
              <!-- GPU Chiplets -->
              <div v-for="i in (displayValues.gpu || 0)" :key="`gpu-${i}`" class="chiplet gpu">
                <span class="chiplet-label">GPU</span>
              </div>
              
              <!-- Attention Chiplets -->
              <div v-for="i in (displayValues.attn || 0)" :key="`attn-${i}`" class="chiplet attention">
                <span class="chiplet-label">ATTN</span>
              </div>
              
              <!-- Sparse Chiplets -->
              <div v-for="i in (displayValues.sparse || 0)" :key="`sparse-${i}`" class="chiplet sparse">
                <span class="chiplet-label">SPARSE</span>
              </div>
              
              <!-- Convolution Chiplets -->
              <div v-for="i in (displayValues.conv || 0)" :key="`conv-${i}`" class="chiplet convolution">
                <span class="chiplet-label">CONV</span>
              </div>
              
              <!-- Empty slots -->
              <div v-for="i in emptySlots" :key="`empty-${i}`" class="chiplet empty">
                <span class="chiplet-label">EMPTY</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Actions Section (only for selected CASCADE designs — Pistil editing not yet supported) -->
      <div v-if="isSelected && !isPistilPoint" class="actions-section">
          <h4>Actions</h4>
          <div class="action-buttons">
              <button
                  class="btn btn-primary"
                  @click="evaluateDesign"
                  :disabled="!hasChanges || totalChiplets > 12 || totalChiplets < 12"
                  :title="getEvaluateButtonTitle()"
              >
                  Evaluate Design
              </button>
          </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon"></div>
      <p>Hover over a design to view details</p>
      <p class="empty-subtitle">Click to select a design for modification</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesignVisualizer',
  props: {
    hoveredPoint: {
      type: Object,
      default: null
    },
    selectedPoint: {
      type: Object,
      default: null
    },
    customPoint: {
      type: Object,
      default: null
    },
    selectedXAxis: {
      type: String,
      default: ''
    },
    selectedYAxis: {
      type: String,
      default: ''
    },
    selectedModel: {          // ADD THIS
      type: String,
      default: null
    }
  },
  emits: ['evaluate-design'],
  data() {
    return {
      editableValues: {
        gpu: 0,
        attn: 0,
        sparse: 0,
        conv: 0
      },
      customChiplets: {
        gpu: 0,
        attn: 0,
        sparse: 0,
        conv: 0
      }
    };
  },
  computed: {
    currentPoint() {
      return this.selectedPoint || this.hoveredPoint;
    },
    isSelected() {
      return this.selectedPoint !== null;
    },
    isHovered() {
      return this.hoveredPoint !== null && this.hoveredPoint !== this.selectedPoint;
    },
    isPistilPoint() {
        // Check point data first, then fall back to selectedModel prop
        if (this.currentPoint && this.currentPoint.model === 'PISTIL') return true;
        if (this.selectedModel === 'PISTIL') return true;
        return false;
    },
    showBothStates() {
      return this.selectedPoint !== null && this.hoveredPoint !== null && this.hoveredPoint !== this.selectedPoint;
    },
    showSelectedVsCustom() {
      return this.selectedPoint !== null && this.customPoint !== null;
    },
    // Use editable values for display when selected, otherwise use current design values
    displayValues() {
      if (this.isSelected) {
        return this.editableValues;
      }
      return {
        gpu: this.currentPoint?.gpu || 0,
        attn: this.currentPoint?.attn || 0,
        sparse: this.currentPoint?.sparse || 0,
        conv: this.currentPoint?.conv || 0
      };
    },
    totalChiplets() {
      return (this.editableValues.gpu || 0) + 
             (this.editableValues.attn || 0) + 
             (this.editableValues.sparse || 0) + 
             (this.editableValues.conv || 0);
    },
    hasChanges() {
      if (!this.selectedPoint) return false;
      return this.editableValues.gpu !== (this.selectedPoint.gpu || 0) ||
             this.editableValues.attn !== (this.selectedPoint.attn || 0) ||
             this.editableValues.sparse !== (this.selectedPoint.sparse || 0) ||
             this.editableValues.conv !== (this.selectedPoint.conv || 0);
    },
    emptySlots() {
      const totalChiplets = (this.displayValues.gpu || 0) + 
                           (this.displayValues.attn || 0) + 
                           (this.displayValues.sparse || 0) + 
                           (this.displayValues.conv || 0);
      return Math.max(0, 12 - totalChiplets); // Assuming 12 total slots
    }
  },
  watch: {
    selectedPoint: {
      handler(newPoint) {
        if (newPoint) {
          // Update editable values when a new design is selected
          this.editableValues = {
            gpu: newPoint.gpu || 0,
            attn: newPoint.attn || 0,
            sparse: newPoint.sparse || 0,
            conv: newPoint.conv || 0
          };
        }
      },
      immediate: true
    },
    customPoint: {
      handler(newCustomPoint) {
        if (newCustomPoint) {
          // Update custom chiplet values when a new custom design is set
          this.customChiplets = {
            gpu: newCustomPoint.gpu || 0,
            attn: newCustomPoint.attn || 0,
            sparse: newCustomPoint.sparse || 0,
            conv: newCustomPoint.conv || 0
          };
        }
      },
      immediate: true
    }
  },
  methods: {
    formatValue(value) {
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return value || '0.00';
    },
    validateTotalChiplets() {
      // Ensure values are numbers and within valid range
      this.editableValues.gpu = Math.max(0, Math.min(12, parseInt(this.editableValues.gpu) || 0));
      this.editableValues.attn = Math.max(0, Math.min(12, parseInt(this.editableValues.attn) || 0));
      this.editableValues.sparse = Math.max(0, Math.min(12, parseInt(this.editableValues.sparse) || 0));
      this.editableValues.conv = Math.max(0, Math.min(12, parseInt(this.editableValues.conv) || 0));
    },
    getEvaluateButtonTitle() {
      if (this.totalChiplets > 12) {
        return 'Total chiplets cannot exceed 12';
      }
      if (this.totalChiplets < 12) {
        return 'Design must have exactly 12 chiplets';
      }
      if (!this.hasChanges) {
        return 'No changes made to evaluate';
      }
      return 'Evaluate the modified design';
    },
    evaluateDesign() {
      if (!this.hasChanges || this.totalChiplets > 12 || this.totalChiplets < 12) {
        return;
      }
      
      // Create the modified design object
      const modifiedDesign = {
        ...this.selectedPoint,
        gpu: this.editableValues.gpu,
        attn: this.editableValues.attn,
        sparse: this.editableValues.sparse,
        conv: this.editableValues.conv
      };
      
      this.$emit('evaluate-design', modifiedDesign);
    }
  }
};
</script>

<style scoped>
.design-visualizer {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 2rem;
  margin-top: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.visualizer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.visualizer-header h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 600;
}

.design-status {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.selected {
  background: #fed7d7;
  color: #c53030;
}

.status-badge.hovered {
  background: #fef5e7;
  color: #d69e2e;
}

.status-badge.custom {
  background: #6f42c1;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  margin-left: 8px;
}

.status-badge.custom.saved {
  background: #28a745;
}

.visualizer-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.three-column-layout {
  display: grid;
  grid-template-columns: auto 1fr 3fr;
  gap: 0;
  align-items: stretch;
  width: 100%;
  min-height: 300px;
}

.two-column-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0;
  align-items: stretch;
  width: 100%;
  min-height: 300px;
}

/* Column 1: Design Information */
.design-info-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px 0 0 8px;
  min-width: fit-content;
  width: auto;
}

.design-info-column h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}

.info-label {
  font-size: 0.9rem;
  color: #4a5568;
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2d3748;
  flex-shrink: 0;
}

/* Pistil-specific styles */
.design-parameters-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.objective-values-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.parameter-item,
.objective-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.parameter-label,
.objective-label {
  font-size: 0.9rem;
  color: #4a5568;
  font-weight: 500;
  flex: 1;
}

.parameter-value,
.objective-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #2d3748;
  text-align: right;
  flex: 1;
}

.design-summary {
  padding: 1rem;
  text-align: center;
}

.design-summary p {
  margin: 0.5rem 0;
  color: #4a5568;
}

.summary-text {
  font-size: 0.85rem;
  color: #718096;
  font-style: italic;
}

/* Column 2: Chiplet Counts */
.chiplet-counts-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
}

.two-column-layout .chiplet-counts-column {
  border-right: none;
  border-radius: 0 8px 8px 0;
}

.chiplet-counts-column h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.chiplet-counts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Column 3: Chiplet Layout */
.chiplet-layout-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0 8px 8px 0;
  min-height: 200px;
  align-items: center;
  justify-content: flex-start;
}

.chiplet-layout-column h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.dual-state-info {
  grid-column: 1 / -1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.state-comparison {
  display: flex;
  gap: 1.5rem;
}

.selected-info,
.hovered-info,
.custom-info {
  flex: 1;
  padding: 1rem;
  border-radius: 6px;
}

.selected-info {
  background: #fed7d7;
  border: 1px solid #feb2b2;
}

.hovered-info {
  background: #fef5e7;
  border: 1px solid #fbd38d;
}

.custom-info {
  background: #f8f9fa;
  border: 2px solid #6f42c1;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.selected-info h4,
.hovered-info h4,
.custom-info h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 600;
}

.selected-info h4 {
  color: #c53030;
}

.hovered-info h4 {
  color: #d69e2e;
}

.custom-info h4 {
  color: #805ad5;
}

.design-info-section,
.chiplet-visualization-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.75rem;
}

.design-info-section h4,
.chiplet-visualization-section h4 {
  margin: 0 0 0.75rem 0;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 600;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.125rem 0;
}

.info-label {
  font-size: 0.85rem;
  color: #4a5568;
  font-weight: 500;
}

.info-value {
  font-size: 0.85rem;
  color: #2d3748;
  font-weight: 600;
}

.chiplet-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

.chiplet-input:focus {
  outline: none;
  border-color: #6f42c1;
  box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.25);
}

.total-chiplets .chiplet-count-value.error {
  color: #e53e3e;
  font-weight: 700;
}

.total-chiplets .chiplet-count-value.warning {
  color: #f6ad55;
  font-weight: 700;
}

.chiplet-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.8rem;
  width: 100%;
  max-width: 450px;
  height: fit-content;
  margin: 0 auto;
}

.chiplet {
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  width: 55px;
  height: 55px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.chiplet.gpu {
  background: #3182ce;
}

.chiplet.attention {
  background: #38a169;
}

.chiplet.sparse {
  background: #d69e2e;
}

.chiplet.convolution {
  background: #805ad5;
}

.chiplet.empty {
  background: #e2e8f0;
  color: #a0aec0;
  border: 2px dashed #cbd5e0;
}

.chiplet-label {
  text-align: center;
  line-height: 1;
}

.chiplet-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 12px 0;
}

.chiplet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.chiplet-label {
  font-weight: 500;
  color: #495057;
}

.chiplet-value {
  font-weight: 600;
  color: #212529;
}

.performance-metrics {
  margin: 16px 0;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric:last-child {
  margin-bottom: 0;
}

.metric-label {
  font-weight: 500;
  color: #495057;
}

.metric-value {
  font-weight: 600;
  color: #212529;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.evaluate-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.evaluate-btn:hover:not(:disabled) {
  background: #0056b3;
}

.evaluate-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.save-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.save-btn:hover {
  background: #1e7e34;
}

.actions-section {
  grid-column: 1 / -1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.actions-section h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3182ce;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2c5aa0;
}

.btn-primary:disabled {
  background: #cbd5e0;
  color: #a0aec0;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.empty-state p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.empty-subtitle {
  font-size: 0.8rem;
  color: #a0aec0;
}

/* New styles for compact chiplet counts */
.performance-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 16px;
}

.performance-metrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chiplet-counts-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 140px;
}

.chiplet-count-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chiplet-count-label {
  font-size: 0.85rem;
  color: #4a5568;
  font-weight: 500;
  min-width: 70px;
}

.chiplet-count-value {
  font-size: 0.85rem;
  color: #2d3748;
  font-weight: 600;
}

.chiplet-count-input {
  width: 50px;
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

.chiplet-count-input:focus {
  outline: none;
  border-color: #6f42c1;
  box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.25);
}

/* Responsive design */
@media (max-width: 768px) {
  .visualizer-content {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .three-column-layout,
  .two-column-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  .design-info-column {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    border-radius: 8px 8px 0 0;
  }
  
  .chiplet-counts-column {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    border-radius: 0;
  }
  
  .two-column-layout .chiplet-counts-column {
    border-bottom: none;
    border-radius: 0 0 8px 8px;
  }
  
  .chiplet-layout-column {
    border-radius: 0 0 8px 8px;
  }
  
  .objective-values-list {
    grid-template-columns: 1fr;
  }
  
  .chiplet-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style> 