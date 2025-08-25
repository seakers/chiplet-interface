<template>
  <div class="help-tooltip-container" @mouseenter="showTooltip = true" @mouseleave="showTooltip = false">
    <span class="help-icon">?</span>
    <div v-if="showTooltip" class="tooltip-content" :class="tooltipPosition" ref="tooltip">
      <div class="tooltip-header">
        <h4>{{ title }}</h4>
        <button class="tooltip-close" @click="showTooltip = false">&times;</button>
      </div>
      <div class="tooltip-body">
        <p>{{ description }}</p>
        <div v-if="example" class="tooltip-example">
          <strong>Example:</strong> {{ example }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HelpTooltip',
  props: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    example: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      showTooltip: false,
      shouldPositionAbove: false
    };
  },
  computed: {
    tooltipPosition() {
      return this.shouldPositionAbove ? 'above' : '';
    }
  },
  watch: {
    showTooltip(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.checkPosition();
        });
      }
    }
  },
  methods: {
    checkPosition() {
      if (!this.$refs.tooltip) return;
      
      const tooltip = this.$refs.tooltip;
      const container = this.$el.closest('.rule-mining-content, .distance-correlation-content, .data-mining');
      
      if (!container) return;
      
      const tooltipRect = tooltip.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const iconRect = this.$el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Check if tooltip would go below the container
      const spaceBelow = containerRect.bottom - iconRect.bottom;
      const tooltipHeight = tooltipRect.height;
      
      // Check if tooltip would go below the viewport
      const spaceBelowViewport = viewportHeight - iconRect.bottom;
      
      // If not enough space below (either container or viewport), position above
      this.shouldPositionAbove = spaceBelow < (tooltipHeight + 20) || spaceBelowViewport < (tooltipHeight + 20);
      
      // Additional check: if tooltip would still be too tall, reduce its max height
      if (this.shouldPositionAbove) {
        const spaceAbove = iconRect.top - containerRect.top;
        if (spaceAbove < (tooltipHeight + 20)) {
          tooltip.style.maxHeight = Math.max(200, spaceAbove - 20) + 'px';
        }
      } else {
        const availableSpaceBelow = Math.min(spaceBelow, spaceBelowViewport);
        if (availableSpaceBelow < (tooltipHeight + 20)) {
          tooltip.style.maxHeight = Math.max(200, availableSpaceBelow - 20) + 'px';
        }
      }
    }
  }
};
</script>

<style scoped>
.help-tooltip-container {
  position: relative;
  display: inline-block;
  margin-left: 0.5rem;
  z-index: 1000;
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #3182ce;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  cursor: help;
  transition: background-color 0.2s ease;
}

.help-icon:hover {
  background: #2c5aa0;
}

.tooltip-content {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0;
  min-width: 200px;
  max-width: 280px;
  z-index: 1001;
  margin-top: 8px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
  max-height: 400px;
  overflow-y: auto;
}

/* Ensure tooltip doesn't go off-screen to the right */
.tooltip-content {
  max-width: calc(100vw - 40px);
  left: 50%;
  transform: translateX(-50%);
}

/* If tooltip would go off-screen, adjust positioning */
@media (max-width: 768px) {
  .tooltip-content {
    left: 0;
    transform: none;
    max-width: calc(100vw - 20px);
  }
}

/* Position tooltip above if there's not enough space below */
.tooltip-content.above {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 8px;
}

.tooltip-content.above::before {
  top: auto;
  bottom: -6px;
  border-top: 6px solid #e2e8f0;
  border-bottom: none;
}

.tooltip-content.above::after {
  top: auto;
  bottom: -5px;
  border-top: 6px solid white;
  border-bottom: none;
}

.tooltip-content::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #e2e8f0;
}

.tooltip-content::after {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid white;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px 8px 0 0;
}

.tooltip-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.tooltip-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #718096;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.tooltip-close:hover {
  background: #e2e8f0;
  color: #4a5568;
}

.tooltip-body {
  padding: 12px 16px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.tooltip-body p {
  margin: 0 0 8px 0;
  font-size: 13px;
  line-height: 1.5;
  color: #4a5568;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  text-align: left;
}

.tooltip-example {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f7fafc;
  border-left: 3px solid #3182ce;
  border-radius: 4px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  text-align: left;
}

.tooltip-example strong {
  color: #2d3748;
  font-size: 12px;
  display: inline-block;
  margin-bottom: 2px;
}

.tooltip-example {
  font-size: 12px;
  color: #4a5568;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}
</style> 