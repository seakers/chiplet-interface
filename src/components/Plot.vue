<script setup>
import "../assets/styles.css";
import { onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import { Chart, ScatterController, LinearScale, PointElement, Title, Tooltip } from "chart.js";
import zoomPlugin from 'chartjs-plugin-zoom';
import axios from "axios";

Chart.register(ScatterController, LinearScale, PointElement, Title, Tooltip, zoomPlugin);

const chartRef = ref(null);
let chartInstance = null;
const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);
const selectedPoint = ref(null);
const pointDropdownRef = ref(null);
// Add legend drag functionality
const legendRef = ref(null);
const isLegendDragging = ref(false);
const legendDragOffset = ref({ x: 0, y: 0 });
const emit = defineEmits(["point-message", "point-selected", "point-hovered"]);

const props = defineProps({
  isEvaluatingDesign: {
    type: Boolean,
    default: false
  },
  isComparative: {
    type: Boolean,
    default: false
  },
  currentRunId: {
    type: String,
    default: ''
  },
  customPoints: {
    type: Array,
    default: () => []
  },
  model: {
    type: String,
    default: null  // No default - wait for explicit model selection
  }
});

// Default axes for CASCADE
const cascadeAxes = ["Total time (ms)", "Total Energy (mJ)", "Temperature (K)", "Latency (μs)"];
// Pistil-specific axes
const pistilAxes = [
    "Latency per Token (ms)",
    "Energy per Inference (mJ)",
    "Energy per Token (mJ)",
    "Average Power (W)",
    "System Power (W)",
    "System Cost ($)",
    "Avg Compute Util (%)",
    "Avg Memory Util (%)",
    "Prefill Tokens/sec",
    "System Compute (TOPS)",
    "System Bandwidth (TB/s)",
    "System Capacity (GB)"
];
const availableAxes = ref(cascadeAxes);
const selectedXAxis = ref("Total time (ms)");
const selectedYAxis = ref("Total Energy (mJ)");

// Map axis label to data field name
function getFieldForAxis(axisLabel) {
    const axisToField = {
        // CASCADE axes
        "Total time (ms)": "x",
        "Total Energy (mJ)": "y",
        "Temperature (K)": "temperature",
        "Latency (μs)": "latency",
        // PISTIL axes
        "Latency per Token (ms)": "latency_per_token_ms",
        "Energy per Inference (mJ)": "energy_per_inference_mJ",
        "Energy per Token (mJ)": "energy_per_token_mJ",
        "Average Power (W)": "average_power_W",
        "System Power (W)": "system_power_W",
        "System Cost ($)": "system_cost",
        "Avg Compute Util (%)": "avg_comp_util",
        "Avg Memory Util (%)": "avg_mem_util",
        "Prefill Tokens/sec": "prefill_tokens_per_sec",
        "System Compute (TOPS)": "system_compute_TOPS",
        "System Bandwidth (TB/s)": "system_bandwidth_TBps",
        "System Capacity (GB)": "system_capacity_GB"
    };
    return axisToField[axisLabel] || axisLabel.toLowerCase().replace(/\s+/g, '_');
}

// Detect model type from data and update axes accordingly
function updateAxesForModel(points) {
    if (!points || points.length === 0) return;
    
    // Check if any point has model: 'PISTIL'
    const isPistil = points.some(pt => pt.model === 'PISTIL');
    
    if (isPistil) {
        // Update available axes for Pistil
        availableAxes.value = pistilAxes;
        // Update default selections to Pistil objectives
        if (selectedXAxis.value === "Total time (ms)" || !pistilAxes.includes(selectedXAxis.value)) {
            selectedXAxis.value = "Latency per Token (ms)";
        }
        if (selectedYAxis.value === "Total Energy (mJ)" || !pistilAxes.includes(selectedYAxis.value)) {
            selectedYAxis.value = "Energy per Inference (mJ)";
        }
    } else {
        // Use CASCADE axes
        availableAxes.value = cascadeAxes;
        if (!cascadeAxes.includes(selectedXAxis.value)) {
            selectedXAxis.value = "Total time (ms)";
        }
        if (!cascadeAxes.includes(selectedYAxis.value)) {
            selectedYAxis.value = "Total Energy (mJ)";
        }
    }
}

const popupX = ref(0);
const popupY = ref(0);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const selectedPointId = ref(null);

const customPoints = ref([]);
const allPoints = ref([]); // All points, including custom and GA
const latestCompositeLabel = ref("");

// Add flag to track loaded run data
const hasLoadedRunData = ref(false);

// Add flag to track if we've set initial points for restarted run
const hasSetInitialRestartPoints = ref(false);

// Add highlighting functionality
const highlightedPoints = ref([]); // Array of point indices to highlight

// Add reactive state for comparative analysis loading
const isComparativeLoading = ref(false);
const comparativeLoadingMessage = ref('');

// Add point selection state
const selectedPointIndex = ref(null);
// Add hovered point state
const hoveredPointIndex = ref(null);

// Add region selection state
const showRegionPanel = ref(false);
const regionSelection = ref({
  rectangular: {
    active: false,
    energyMin: null,
    energyMax: null,
    timeMin: null,
    timeMax: null,
    points: []
  },
  pareto: {
    active: false,
    ranks: [1, 3],
    points: []
  },
  manual: {
    active: false,
    points: []
  }
});

// Region colors
const regionColors = {
  rectangular: '#10B981', // Green
  pareto: '#EF4444',      // Red
  manual: '#8B5CF6'       // Purple
};
// Color palette for algorithm:trace combos
const palette = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];
// Add new color constants for comparative study
const runAColor = '#1f77b4'; // blue
const runBColor = '#ff7f0e'; // orange
const customColor = '#800080';
const highlightColor = '#FFD700';
const selectedColor = '#FF6B6B'; // Red color for selected points
const colorMap = ref({}); // key: 'algorithm:trace' => color
const lastAlgorithm = ref((() => {
  if (typeof window === 'undefined') return 'Genetic Algorithm';
  if (window.__lastAlgorithm) return window.__lastAlgorithm;
  if (window.localStorage) return window.localStorage.getItem('lastAlgorithm') || 'Genetic Algorithm';
  return 'Genetic Algorithm';
})());

// Region selection methods
const hasActiveRegions = () => {
  return regionSelection.value.rectangular.active || 
         regionSelection.value.pareto.active || 
         regionSelection.value.manual.active;
};

const getPointRegions = (point, pointIndex) => {
  const regions = [];
  
  if (regionSelection.value.rectangular.active && 
      isPointInRectangularRegion(point)) {
    regions.push('rectangular');
  }
  
  if (regionSelection.value.pareto.active && 
      isPointInParetoRegion(point, pointIndex)) {
    regions.push('pareto');
  }
  
  if (regionSelection.value.manual.active && 
      regionSelection.value.manual.points.includes(pointIndex)) {
    regions.push('manual');
  }
  
  return regions;
};

const isPointInRectangularRegion = (point) => {
  const rect = regionSelection.value.rectangular;
  if (!rect.active) return false;
  
  const inEnergyRange = (!rect.energyMin || point.y >= rect.energyMin) && 
                       (!rect.energyMax || point.y <= rect.energyMax);
  const inTimeRange = (!rect.timeMin || point.x >= rect.timeMin) && 
                     (!rect.timeMax || point.x <= rect.timeMax);
  
  return inEnergyRange && inTimeRange;
};

const isPointInParetoRegion = (point, pointIndex) => {
  // This would need to be implemented based on Pareto ranking logic
  // For now, return false as placeholder
  return false;
};

const mixColors = (colors) => {
  // Simple color mixing for overlaps
  if (colors.includes('rectangular') && colors.includes('pareto')) return '#F97316'; // Orange
  if (colors.includes('rectangular') && colors.includes('manual')) return '#14B8A6'; // Teal
  if (colors.includes('pareto') && colors.includes('manual')) return '#EC4899'; // Magenta
  if (colors.length === 3) return '#1E40AF'; // Dark Blue
  return colors[0];
};

// Region selection control methods
const applyRectangularRegion = (regionData) => {
  regionSelection.value.rectangular.energyMin = regionData.energyMin;
  regionSelection.value.rectangular.energyMax = regionData.energyMax;
  regionSelection.value.rectangular.timeMin = regionData.timeMin;
  regionSelection.value.rectangular.timeMax = regionData.timeMax;
  regionSelection.value.rectangular.active = true;
  updateChart();
};

const clearRectangularRegion = () => {
  regionSelection.value.rectangular.active = false;
  regionSelection.value.rectangular.energyMin = null;
  regionSelection.value.rectangular.energyMax = null;
  regionSelection.value.rectangular.timeMin = null;
  regionSelection.value.rectangular.timeMax = null;
  updateChart();
};

const clearAllRegions = () => {
  regionSelection.value.rectangular.active = false;
  regionSelection.value.pareto.active = false;
  regionSelection.value.manual.active = false;
  regionSelection.value.rectangular.energyMin = null;
  regionSelection.value.rectangular.energyMax = null;
  regionSelection.value.rectangular.timeMin = null;
  regionSelection.value.rectangular.timeMax = null;
  regionSelection.value.manual.points = [];
  updateChart();
};

const toggleRegionSelection = () => {
  showRegionPanel.value = !showRegionPanel.value;
};

// Pareto region controls
const applyParetoRegion = (ranks) => {
  regionSelection.value.pareto.active = Array.isArray(ranks) && ranks.length > 0;
  regionSelection.value.pareto.ranks = ranks || [];
  updateChart();
};

const clearParetoRegion = () => {
  regionSelection.value.pareto.active = false;
  regionSelection.value.pareto.ranks = [];
  updateChart();
};

// Manual selection controls (placeholder hooks)
const startManualSelection = () => {
  // Future: enable click-to-select on chart
  regionSelection.value.manual.active = true;
  updateChart();
};

const clearManualSelection = () => {
  regionSelection.value.manual.active = false;
  regionSelection.value.manual.points = [];
  updateChart();
};


function getColorForPoint(point, pointIndex = null) {
  // Defensive check for undefined or null point
  if (!point) {
    console.warn('getColorForPoint called with undefined/null point:', point);
    return '#cccccc'; // Default gray color
  }
  
  // Check if this point is hovered (highest priority)
  if (pointIndex !== null && pointIndex === hoveredPointIndex.value) {
    console.log('🟡 HOVERED POINT DETECTED! Point index:', pointIndex, 'Hovered index:', hoveredPointIndex.value);
    return highlightColor; // Yellow for hovered points
  }
  
  // Check if this point is selected
  if (pointIndex !== null && pointIndex === selectedPointIndex.value) {
    console.log('🎯 SELECTED POINT DETECTED! Point index:', pointIndex, 'Selected index:', selectedPointIndex.value);
    return selectedColor; // Red for selected points
  }
  
  // Check for region selection (after hover/selected)
  if (hasActiveRegions()) {
    const regions = getPointRegions(point, pointIndex);
    if (regions.length > 0) {
      if (regions.length === 1) {
        return regionColors[regions[0]];
      } else {
        return mixColors(regions);
      }
    } else {
      // Point not in any region - dim it
      return '#1f77b4'; // Dimmed blue
    }
  }
  
  // Check point type first (highest priority for custom designs)
  if (point.type === 'custom' || point.type === 'modified') {
    return customColor; // Purple for custom/modified points
  }
  
  // Check algorithm field for Custom Design (in case type was lost)
  if (point.algorithm === 'Custom Design' || point.algorithm === 'Manual') {
    return customColor;
  }
  
  // Check source for backward compatibility
  if (point.source === 'Manual' || point.label === 'Custom Design' || point.label === 'Modified Design') {
    return customColor;
  }
  
  // Check run for comparative studies
  if (point.run === 'A' || point.run_label === 'Run A') {
    return runAColor;
  }
  if (point.run === 'B' || point.run_label === 'Run B') {
    return runBColor;
  }
  
  // Default: blue for optimization points
  if (point.algorithm && typeof point.algorithm === 'string') {
    const alg = point.algorithm.toLowerCase();
    if (alg.includes('custom design')) return customColor; // Ensure custom designs stay purple
    if (alg.includes('full-factorial')) return '#2ca02c'; // green distinct for Full-Factorial
    if (alg.includes('genetic')) return '#1f77b4'; // blue for GA
  }
  return palette[0];
}

function getLegendEntries() {
  const entries = [];
  const seen = new Set();
  
  // Selected point legend (only if a point is selected)
  if (selectedPointIndex.value !== null) {
    entries.push({ key: 'selected', label: 'Selected Design', color: selectedColor });
  }
  
  // Hovered design legend (only if hovering over a different point than selected)
  if (hoveredPointIndex.value !== null && hoveredPointIndex.value !== selectedPointIndex.value) {
    entries.push({ key: 'hovered', label: 'Hovered Design', color: highlightColor });
  }
  
  // GA and custom design legends
  allPoints.value.forEach((pt) => {
    let key, label, color;
    if (pt.source === 'Manual' || pt.label === 'Custom Design') {
      key = 'Custom Design';
      label = 'Custom Design';
      color = customColor;
    } else if (pt.algorithm && pt.algorithm.toLowerCase().includes('genetic')) {
      key = pt.algorithm;
      label = pt.algorithm;
      color = getColorForPoint(pt);
    } else {
      key = `${pt.algorithm}:${pt.algorithm}`;
      label = pt.algorithm ? pt.algorithm : 'Unknown Algorithm';
      color = getColorForPoint(pt);
    }
    if (!seen.has(key)) {
      entries.push({ key, label, color });
      seen.add(key);
    }
  });
  // Remove duplicate Custom Design if present
  return entries;
}

const fetchChartData = async (runId = null) => {
    try {
        let url = "http://127.0.0.1:8000/api/chart-data/";
        let params = {};
        
        if (props.isComparative) {
            params.comparative = "true";
            console.log('Fetching comparative chart data...');
        }
        
        // Check if this is a loaded run and pass the correct file path
        console.log('Plot fetchChartData - currentRunId:', props.currentRunId);
        console.log('Plot fetchChartData - hasLoadedRunData:', hasLoadedRunData.value);
        
        // Determine model first to avoid Cascade-specific logic when Pistil is selected
        const currentModel = props.model || (props.currentRunId && props.currentRunId.startsWith('pistil_run_') ? 'PISTIL' : 'CASCADE');
        
        // Only handle Cascade-specific run types if model is CASCADE
        if (currentModel === 'CASCADE') {
            if (hasLoadedRunData.value && props.currentRunId && props.currentRunId.startsWith('loaded_run_')) {
                const tempFilePath = `/Users/ramyagotika/research-work/chiplet/chiplet-server/api/Evaluator/cascade/chiplet_model/dse/results/temp_points_${props.currentRunId}.csv`;
                params.file_path = tempFilePath;
                console.log('[CASCADE] Polling with loaded run file path:', tempFilePath);
            } else if (props.currentRunId && props.currentRunId.startsWith('restarted_run_')) {
                // For restarted runs, poll the main points.csv (which will have new GA points)
                const restartedPath = `/Users/ramyagotika/research-work/chiplet/chiplet-server/api/Evaluator/cascade/chiplet_model/dse/results/${props.currentRunId}/points.csv`;
                params.file_path = restartedPath;
                console.log('[CASCADE] Polling with restarted run file path:', restartedPath);
            } else {
                console.log('[CASCADE] Using default polling (no specific run ID detected)');
            }
        } else if (currentModel === 'PISTIL') {
            // For Pistil runs, pass run_id so backend can find the correct directory
            if (props.currentRunId && props.currentRunId.startsWith('pistil_run_')) {
                params.run_id = props.currentRunId;
                params.model = 'PISTIL';
                console.log('[PISTIL] Polling Pistil run:', props.currentRunId);
            } else {
                console.log('[PISTIL] No Pistil run_id detected, will use most recent run');
                params.model = 'PISTIL';
            }
        }
        
        // CRITICAL: Always pass model parameter to ensure backend routes correctly
        // Priority: 1) props.model (explicit), 2) detected from currentRunId, 3) detected from existing points, 4) default CASCADE
        if (!params.model) {
          if (props.model) {
            params.model = props.model;
            console.log('Using model from props:', params.model);
          } else if (props.currentRunId && props.currentRunId.startsWith('pistil_run_')) {
            params.model = 'PISTIL';
            console.log('Detected Pistil from run_id:', props.currentRunId);
          } else if (allPoints.value.length > 0 && allPoints.value.some(pt => pt.model === 'PISTIL')) {
            params.model = 'PISTIL';
            console.log('Detected Pistil from existing points');
          } else {
            params.model = 'CASCADE';  // Default fallback
            console.log('Using default model: CASCADE');
          }
        }
        
        // Pass algorithm and run_id so backend labels points correctly in legend/colors
        if (lastAlgorithm.value) {
          params.algorithm = lastAlgorithm.value;
        }
        
        // Pass run_id if available so backend can look up correct algorithm from database
        if (props.currentRunId && !params.run_id) {
          params.run_id = props.currentRunId;
        }
        
        // Final validation: ensure model is set
        if (!params.model) {
          console.warn('WARNING: model parameter not set! Defaulting to CASCADE. This may cause incorrect data loading.');
          params.model = 'CASCADE';
        }
        
        console.log('Plot fetchChartData - Final params:', { model: params.model, run_id: params.run_id, algorithm: params.algorithm });
        
        const response = await axios.get(url, { params });
        const data = response.data.data;
        
        // For comparative analysis, log the data structure to help debug
        if (props.isComparative) {
            console.log('Comparative data received:', data ? data.length : 'no data');
            if (data && data.length > 0) {
                console.log('Sample comparative point:', data[0]);
                const runAPoints = data.filter(pt => pt.run === 'A');
                const runBPoints = data.filter(pt => pt.run === 'B');
                console.log('Run A points:', runAPoints.length, 'Run B points:', runBPoints.length);
                
                // If we have data, stop showing loading state
                if (data.length > 0) {
                    isComparativeLoading.value = false;
                    comparativeLoadingMessage.value = '';
                }
            } else {
                // Show loading state if no data available
                isComparativeLoading.value = true;
                comparativeLoadingMessage.value = 'Comparative analysis in progress...';
            }
        }
        
        return data;
    } catch (error) {
        console.error("Error fetching chart data:", error);
        // For comparative analysis, don't return empty array immediately
        // Let the existing data persist while analysis is running
        if (props.isComparative) {
            console.log('Comparative analysis in progress - keeping existing data');
            isComparativeLoading.value = true;
            comparativeLoadingMessage.value = 'Comparative analysis in progress...';
            return null; // Return null to indicate no new data, but don't clear existing
        }
        return [];
    }
};

function buildChartData() {
  // Map axis selections to data fields
  const xField = getFieldForAxis(selectedXAxis.value);
  const yField = getFieldForAxis(selectedYAxis.value);
  
  // Filter out any undefined or malformed points and map to selected axes
  const validPoints = allPoints.value
    .filter(pt => pt && typeof pt === 'object')
    .map(pt => {
      // Get x and y values from the selected fields, fallback to pt.x/pt.y
      const xValue = pt[xField] !== undefined ? pt[xField] : pt.x;
      const yValue = pt[yField] !== undefined ? pt[yField] : pt.y;
      
      if (xValue === undefined || yValue === undefined) {
        return null;
      }
      
      return {
        ...pt,
        x: xValue,
        y: yValue
      };
    })
    .filter(pt => pt !== null);
  
  if (validPoints.length !== allPoints.value.length) {
    console.warn('Filtered out', allPoints.value.length - validPoints.length, 'invalid points');
    allPoints.value = validPoints;
  }
  
  // If comparative study, split by run
  const runA = validPoints.filter(pt => pt.run === 'A' || pt.run_label === 'Run A');
  const runB = validPoints.filter(pt => pt.run === 'B' || pt.run_label === 'Run B');
  
  // Categorize points by type
  const optimizationPoints = validPoints.filter(pt => 
    pt.type === 'optimization' || 
    (!pt.type && !pt.source && !pt.label && pt.algorithm !== 'Custom Design' && pt.algorithm !== 'Manual') // Default to optimization for backward compatibility
  );
  
  const customPoints = validPoints.filter(pt => 
    pt.type === 'custom' || 
    pt.type === 'modified' ||
    pt.source === 'Manual' || 
    pt.label === 'Custom Design' || 
    pt.label === 'Modified Design' ||
    pt.algorithm === 'Manual' ||
    pt.algorithm === 'Custom Design'  // Include points with Custom Design algorithm
  );
  
  console.log('buildChartData - Optimization points:', optimizationPoints.length);
  console.log('buildChartData - Custom points:', customPoints.length);
  console.log('buildChartData - Total points:', validPoints.length);
  console.log('buildChartData - Highlighted points:', highlightedPoints.value);
  
  if (runA.length || runB.length) {
    // Comparative mode
    return [
      {
        label: 'Run A',
        data: runA.map((pt, i) => ({
          ...pt,
          x: pt.x,
          y: pt.y,
          radius: (i === hoveredPointIndex.value) ? 8 : 6,
        })),
        backgroundColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('backgroundColor called with undefined point in Run A');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          return getColorForPoint(point, globalIndex);
        },
        borderColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('borderColor called with undefined point in Run A');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          return getColorForPoint(point, globalIndex);
        },
        pointRadius: 6,
        pointBorderWidth: 1,
      },
      {
        label: 'Run B',
        data: runB.map((pt, i) => ({
          ...pt,
          x: pt.x,
          y: pt.y,
          radius: (i === hoveredPointIndex.value) ? 8 : 6,
        })),
        backgroundColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('backgroundColor called with undefined point in Run B');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          return getColorForPoint(point, globalIndex);
        },
        borderColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('borderColor called with undefined point in Run B');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          return getColorForPoint(point, globalIndex);
        },
        pointRadius: 6,
        pointBorderWidth: 1,
      }
    ];
  }
  
  const datasets = [];
  
  // Add genetic algorithm points
  if (optimizationPoints.length > 0) {
    console.log('Adding optimization dataset with', optimizationPoints.length, 'points');
    
    // Separate highlighted and non-highlighted points
    const highlightedOptimization = [];
    const normalOptimization = [];
    
    optimizationPoints.forEach((pt, i) => {
      const globalIndex = allPoints.value.indexOf(pt);
      const isHighlighted = highlightedPoints.value.includes(globalIndex);
      console.log(`Optimization point ${i}: globalIndex=${globalIndex}, isHighlighted=${isHighlighted}, highlightedPoints=${highlightedPoints.value}`);
      
      if (isHighlighted) {
        highlightedOptimization.push({
          ...pt,
          x: pt.x,
          y: pt.y,
          backgroundColor: getColorForPoint(pt, globalIndex),
          borderColor: highlightColor,
          borderWidth: 3,
          radius: 6,
        });
      } else {
        normalOptimization.push({
          ...pt,
          x: pt.x,
          y: pt.y,
          backgroundColor: getColorForPoint(pt, globalIndex),
          borderColor: getColorForPoint(pt, globalIndex),
          borderWidth: 1,
          radius: 6,
        });
        
        // Debug logging
        const pointColor = getColorForPoint(pt, globalIndex);
        console.log(`Point ${globalIndex}: x=${pt.x}, y=${pt.y}, color=${pointColor}, selected=${globalIndex === selectedPointIndex.value}`);
      }
    });
    
    // Add normal optimization points
    if (normalOptimization.length > 0) {
      datasets.push({
        label: 'Optimization',
        data: normalOptimization,
        backgroundColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('backgroundColor called with undefined point');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          return getColorForPoint(point, globalIndex);
        },
        borderColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('borderColor called with undefined point');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          return getColorForPoint(point, globalIndex);
        },
        pointRadius: 6,
        pointBorderWidth: 1,
      });
    }
    
    // Add highlighted optimization points as separate datasets: a halo ring and the base point
    if (highlightedOptimization.length > 0) {
      // 1) Halo ring behind the highlighted points
      datasets.push({
        label: 'Highlight Halo',
        data: highlightedOptimization.map(p => ({
          ...p,
          radius: 10,
          backgroundColor: 'rgba(255, 215, 0, 0.05)',
          borderColor: highlightColor,
          borderWidth: 4,
        })),
        backgroundColor: () => 'rgba(255, 215, 0, 0.05)',
        borderColor: () => highlightColor,
        pointRadius: 10,
        pointBorderWidth: 4,
      });

      // 2) The highlighted points themselves
      datasets.push({
        label: 'Highlighted Designs',
        data: highlightedOptimization,
        backgroundColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('backgroundColor called with undefined point');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          return getColorForPoint(point, globalIndex);
        },
        borderColor: (context) => {
          const point = context.raw;
          if (!point) {
            console.warn('borderColor called with undefined point');
            return '#cccccc';
          }
          const globalIndex = allPoints.value.findIndex(pt => 
            pt && pt.x === point.x && pt.y === point.y &&
            pt.gpu === point.gpu && pt.attn === point.attn &&
            pt.sparse === point.sparse && pt.conv === point.conv
          );
          // Draw yellow border on highlighted point itself
          return highlightedPoints.value.includes(globalIndex) ? highlightColor : getColorForPoint(point, globalIndex);
        },
        pointRadius: 6,
        pointBorderWidth: 3,
      });
    }
  }
  
  // Add custom design points
  if (customPoints.length > 0) {
    console.log('Adding custom dataset with', customPoints.length, 'points');
    datasets.push({
      label: 'Custom Design',
      data: customPoints.map((pt, i) => {
        const globalIndex = allPoints.value.indexOf(pt);
        const isHighlighted = highlightedPoints.value.includes(globalIndex);
        console.log('Custom point data:', pt);
        return {
          ...pt,
          x: pt.x,
          y: pt.y,
          radius: 6,  // Same size as GA points
          borderWidth: isHighlighted ? 3 : 1, // Normal border width
        };
      }),
      backgroundColor: (context) => {
        const point = context.raw;
        if (!point) {
          console.warn('backgroundColor called with undefined point');
          return '#cccccc';
        }
        const globalIndex = allPoints.value.findIndex(pt => 
          pt && pt.x === point.x && pt.y === point.y &&
          pt.gpu === point.gpu && pt.attn === point.attn &&
          pt.sparse === point.sparse && pt.conv === point.conv
        );
        const isHighlighted = highlightedPoints.value.includes(globalIndex);
        return isHighlighted ? highlightColor : customColor; // Always purple unless highlighted
      },
      borderColor: (context) => {
        const point = context.raw;
        if (!point) {
          console.warn('borderColor called with undefined point');
          return '#cccccc';
        }
        const globalIndex = allPoints.value.findIndex(pt => 
          pt && pt.x === point.x && pt.y === point.y &&
          pt.gpu === point.gpu && pt.attn === point.attn &&
          pt.sparse === point.sparse && pt.conv === point.conv
        );
        const isHighlighted = highlightedPoints.value.includes(globalIndex);
        return isHighlighted ? highlightColor : customColor; // Always purple unless highlighted
      },
      pointRadius: 6, // Same size as GA points
      pointBorderWidth: 1, // Normal border width
    });
  }
  
  console.log('Final datasets:', datasets);
  return datasets;
}

const createChart = () => {
    // Clean up any existing tooltip DOM before destroying chart
    if (chartRef.value && chartRef.value.parentNode) {
      const oldTooltip = chartRef.value.parentNode.querySelector('.custom-tooltip');
      if (oldTooltip) oldTooltip.remove();
    }
    if (chartInstance) {
        chartInstance.destroy();
    }
    const chartDataSets = buildChartData();
    chartInstance = new Chart(chartRef.value, {
        type: "scatter",
        data: {
            datasets: chartDataSets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: selectedXAxis.value || 'Total time (ms)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true
                    },
                    ticks: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.7)',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: selectedYAxis.value || 'Total Energy (mJ)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true
                    },
                    ticks: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.7)',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: false,
                    text: "Scattered Data Points",
                },
                tooltip: {
                    enabled: false, // Disable tooltips completely
                },
                legend: {
                  display: true,
                  position: 'top',
                  labels: {
                    usePointStyle: true,
                    font: { size: 14 },
                  }
                },
                zoom: {
                    pan: {
                        enabled: false, // Disable panning/scrolling
                        mode: 'xy',
                        threshold: 10,
                        modifierKey: null,
                    },
                    zoom: {
                        wheel: {
                            enabled: false, // Disable wheel scrolling/zooming
                            speed: 0.1,
                            modifierKey: null,
                        },
                        pinch: {
                            enabled: false // Disable pinch zoom
                        },
                        drag: {
                            enabled: false, // Disable drag zoom
                            modifierKey: null,
                        },
                        mode: 'xy',
                        limits: {
                            x: { min: -Infinity, max: Infinity },
                            y: { min: -Infinity, max: Infinity }
                        }
                    }
                }
            },
            onClick: (event, elements) => {
              if (elements && elements.length > 0) {
                const element = elements[0];
                const datasetIndex = element.datasetIndex;
                const localIndex = element.index;
                
                console.log('=== CLICK HANDLER DEBUG ===');
                console.log('Dataset index:', datasetIndex);
                console.log('Local index:', localIndex);
                console.log('Selected point index before:', selectedPointIndex.value);
                
                // Get the actual point data from the dataset
                const dataset = chartInstance.data.datasets[datasetIndex];
                const pointData = dataset.data[localIndex];
                
                console.log('Point data from dataset:', pointData);
                console.log('All points length:', allPoints.value.length);
                console.log('First few allPoints:', allPoints.value.slice(0, 3));
                
                // Find the global index in allPoints.value - support both Cascade and Pistil
                // Match primarily on model-specific parameters (not x/y, which change with axis selection)
                const globalIndex = allPoints.value.findIndex(pt => {
                  // Check model type first
                  const ptIsPistil = pt.model === 'PISTIL';
                  const dataIsPistil = pointData.model === 'PISTIL';
                  
                  // Model types must match
                  if (ptIsPistil !== dataIsPistil) return false;
                  
                  if (ptIsPistil || dataIsPistil) {
                    // Pistil points: match on key Pistil parameters (use loose equality for undefined)
                    return (pt.num_cus == pointData.num_cus) &&
                           (pt.num_tmacs == pointData.num_tmacs) &&
                           (pt.mem_buf_cap == pointData.mem_buf_cap) &&
                           (pt.net_buf_cap == pointData.net_buf_cap) &&
                           (pt.mem_banks_per_group == pointData.mem_banks_per_group) &&
                           (pt.mem_ranks == pointData.mem_ranks) &&
                           (pt.mem_frac_bank_cap == pointData.mem_frac_bank_cap) &&
                           (pt.batch_size == pointData.batch_size) &&
                           (pt.kv_cache == pointData.kv_cache);
                  } else {
                    // Cascade points: match on Cascade parameters
                    return (pt.gpu == pointData.gpu) &&
                           (pt.attn == pointData.attn) &&
                           (pt.sparse == pointData.sparse) &&
                           (pt.conv == pointData.conv);
                  }
                });
                
                console.log('Global index found:', globalIndex);
                
                // Toggle selection: if clicking the same point, deselect it; otherwise select the new point
                if (globalIndex !== -1) {
                  if (selectedPointIndex.value === globalIndex) {
                    // Clicking the same point - deselect it
                    selectedPointIndex.value = null;
                    console.log('Deselected point');
                    emit('point-selected', null);
                  } else {
                    // Clicking a different point - select it
                    selectedPointIndex.value = globalIndex;
                    console.log('Selected new point');
                    const pt = allPoints.value[globalIndex];
                    emit('point-selected', pt);
                    (async () => {
                      try {
                        const params = {
                          exe: pt?.x ?? '',
                          energy: pt?.y ?? '',
                          gpu: pt?.gpu ?? 0,
                          attn: pt?.attn ?? 0,
                          sparse: pt?.sparse ?? 0,
                          conv: pt?.conv ?? 0,
                        };
                        await axios.get("http://127.0.0.1:8000/add-info/", { params });
                        console.log("Sent design info to backend:", params);
                      } catch (err) {
                        console.error("Error sending design info to backend:", err);
                      }
                    })();
                  }
                }
                
                console.log('Selected point index after:', selectedPointIndex.value);
                updateChart();
                console.log('=== CLICK HANDLER DEBUG END ===');
              }
            },
            onHover: (event, chartElements) => {
              if (chartElements && chartElements.length > 0) {
                const element = chartElements[0];
                const datasetIndex = element.datasetIndex;
                const localIndex = element.index;
                
                // Get the actual point data from the dataset
                const dataset = chartInstance.data.datasets[datasetIndex];
                const pointData = dataset.data[localIndex];
                
                // Find the global index in allPoints.value - support both Cascade and Pistil
                // Match primarily on model-specific parameters (not x/y, which change with axis selection)
                const globalIndex = allPoints.value.findIndex(pt => {
                  // Check model type first
                  const ptIsPistil = pt.model === 'PISTIL';
                  const dataIsPistil = pointData.model === 'PISTIL';
                  
                  // Model types must match
                  if (ptIsPistil !== dataIsPistil) return false;
                  
                  if (ptIsPistil || dataIsPistil) {
                    // Pistil points: match on key Pistil parameters (use loose equality for undefined)
                    return (pt.num_cus == pointData.num_cus) &&
                           (pt.num_tmacs == pointData.num_tmacs) &&
                           (pt.mem_buf_cap == pointData.mem_buf_cap) &&
                           (pt.net_buf_cap == pointData.net_buf_cap) &&
                           (pt.mem_banks_per_group == pointData.mem_banks_per_group) &&
                           (pt.mem_ranks == pointData.mem_ranks) &&
                           (pt.mem_frac_bank_cap == pointData.mem_frac_bank_cap) &&
                           (pt.batch_size == pointData.batch_size) &&
                           (pt.kv_cache == pointData.kv_cache);
                  } else {
                    // Cascade points: match on Cascade parameters
                    return (pt.gpu == pointData.gpu) &&
                           (pt.attn == pointData.attn) &&
                           (pt.sparse == pointData.sparse) &&
                           (pt.conv == pointData.conv);
                  }
                });
                
                hoveredPointIndex.value = globalIndex !== -1 ? globalIndex : null;
                // Emit hovered point data for design visualizer
                if (globalIndex !== -1) {
                  const pt = allPoints.value[globalIndex];
                  emit('point-hovered', pt);
                } else {
                  emit('point-hovered', null);
                }
              } else {
                hoveredPointIndex.value = null;
                // Clear hovered point
                emit('point-hovered', null);
              }
              updateChart();
            },
            // Remove previous click-to-highlight selection logic
        },
    });
};

function updateChart() {
  console.log('=== updateChart START ===');
  console.log('Chart instance exists:', !!chartInstance);
  if (chartInstance) {
    const newDataSets = buildChartData();
    console.log('Built new datasets:', newDataSets.length);
    console.log('Dataset details:', newDataSets.map(ds => ({ label: ds.label, points: ds.data.length })));
    
    // Update each dataset's data and properties in place
    newDataSets.forEach((newSet, i) => {
      if (chartInstance.data.datasets[i]) {
        chartInstance.data.datasets[i].data = newSet.data;
        chartInstance.data.datasets[i].label = newSet.label;
        chartInstance.data.datasets[i].backgroundColor = newSet.backgroundColor;
        // Ensure stroke color is set for point outlines
        chartInstance.data.datasets[i].borderColor = newSet.borderColor || chartInstance.data.datasets[i].borderColor;
        chartInstance.data.datasets[i].pointRadius = newSet.pointRadius;
      } else {
        chartInstance.data.datasets.push(newSet);
      }
    });
    // Remove extra datasets if any
    chartInstance.data.datasets.length = newDataSets.length;
    console.log('Updating chart with new data');
    chartInstance.update();
    console.log('Chart update completed');
  } else {
    console.log('No chart instance available for update');
  }
  console.log('=== updateChart END ===');
}

// Update updateChartData to robustly map both array and object points for comparative study polling, ensuring all points for Run A and Run B are plotted correctly.
const updateChartData = (newChartData, traceMetadata = null) => {
  console.log('=== updateChartData START ===');
  console.log('Updating chart data with:', newChartData ? newChartData.length : 'no data');
  console.log('New chart data type:', typeof newChartData);
  console.log('New chart data keys:', newChartData ? Object.keys(newChartData) : 'no data');
  
  // Store current custom points before updating
  const currentCustomPoints = allPoints.value.filter(pt => 
    pt.type === 'custom' || pt.type === 'modified' || 
    pt.source === 'Manual' || pt.label === 'Custom Design' || 
    pt.label === 'Modified Design' || pt.algorithm === 'Custom Design'
  );
  console.log('Preserving custom points:', currentCustomPoints.length);
  
  // Handle null data from fetchChartData during comparative analysis
  if (newChartData === null) {
    console.log('Received null data - preserving existing data for comparative analysis');
    return; // Don't update anything, preserve existing data
  }
  
  // If comparative study, expect {A: [...], B: [...]} or run_a_results/run_b_results
  if (newChartData && (newChartData.A || newChartData.B || newChartData.run_a_results || newChartData.run_b_results)) {
    let points = [];
    if (newChartData.A) points = points.concat(newChartData.A.map(pt =>
      Array.isArray(pt)
        ? { x: pt[0], y: pt[1], run: 'A', run_label: 'Run A' }
        : { ...pt, run: 'A', run_label: 'Run A' }
    ));
    if (newChartData.B) points = points.concat(newChartData.B.map(pt =>
      Array.isArray(pt)
        ? { x: pt[0], y: pt[1], run: 'B', run_label: 'Run B' }
        : { ...pt, run: 'B', run_label: 'Run B' }
    ));
    if (newChartData.run_a_results) points = points.concat(newChartData.run_a_results.map(pt =>
      Array.isArray(pt)
        ? { x: pt[0], y: pt[1], run: 'A', run_label: 'Run A' }
        : { ...pt, run: 'A', run_label: 'Run A' }
    ));
    if (newChartData.run_b_results) points = points.concat(newChartData.run_b_results.map(pt =>
      Array.isArray(pt)
        ? { x: pt[0], y: pt[1], run: 'B', run_label: 'Run B' }
        : { ...pt, run: 'B', run_label: 'Run B' }
    ));
    
    // Only update if we have new data
    if (points.length > 0) {
      allPoints.value = points;
      // Restore custom points
      if (currentCustomPoints.length > 0) {
        allPoints.value.push(...currentCustomPoints);
        console.log('Restored custom points after comparative update. Total points:', allPoints.value.length);
      }
      console.log('Comparative mode - Total points after update:', allPoints.value.length);
    } else {
      console.log('Comparative mode - No new data received, preserving existing data');
    }
  } else {
    // Normal mode - just use the new data, let custom points be handled naturally
    const defaultAlgorithm = (newChartData && newChartData.metadata && newChartData.metadata.algorithm) || lastAlgorithm.value || 'Genetic Algorithm';
    
    // Preserve custom design markers when mapping new points
    const newPoints = newChartData && newChartData.map
      ? newChartData.map(pt => {
          // Check if this point matches any existing custom design point
          const isCustomPoint = currentCustomPoints.some(customPt => 
            Math.abs(customPt.x - pt.x) < 0.001 &&
            Math.abs(customPt.y - pt.y) < 0.001 &&
            customPt.gpu === pt.gpu &&
            customPt.attn === pt.attn &&
            customPt.sparse === pt.sparse &&
            customPt.conv === pt.conv
          );
          
          // If it's a custom point, preserve its markers; otherwise use default algorithm
          if (isCustomPoint) {
            // Find the matching custom point to preserve its properties
            const matchingCustom = currentCustomPoints.find(customPt => 
              Math.abs(customPt.x - pt.x) < 0.001 &&
              Math.abs(customPt.y - pt.y) < 0.001 &&
              customPt.gpu === pt.gpu &&
              customPt.attn === pt.attn &&
              customPt.sparse === pt.sparse &&
              customPt.conv === pt.conv
            );
            return {
              ...pt,
              ...matchingCustom, // Preserve all custom point properties
              algorithm: matchingCustom?.algorithm || 'Custom Design',
              type: matchingCustom?.type || 'custom',
              source: matchingCustom?.source || 'Manual',
              label: matchingCustom?.label || 'Custom Design',
              trace: pt.trace || matchingCustom?.trace || '',
            };
          } else {
            // Regular point - use default algorithm
            return {
              ...pt,
              algorithm: pt.algorithm || defaultAlgorithm,
              trace: pt.trace || '',
            };
          }
        })
      : [];
    if (newChartData && newChartData.metadata && newChartData.metadata.algorithm) {
      lastAlgorithm.value = newChartData.metadata.algorithm;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('lastAlgorithm', lastAlgorithm.value);
      }
    }
    const currentModel = props.model || (newPoints.length > 0 && newPoints[0]?.model === 'PISTIL' ? 'PISTIL' : 'CASCADE');
    const modelPrefix = currentModel === 'PISTIL' ? '[PISTIL]' : '[CASCADE]';
    console.log(`${modelPrefix} Processing new points:`, newPoints.length);
    if (newPoints.length > 0) {
      console.log(`${modelPrefix} Sample new point:`, newPoints[0]);
    }
    
    // Check if this is a loaded run (has loaded_from_backup flag)
    const isLoadedRun = newChartData && newChartData.loaded_from_backup;
    
    // Special handling for restarted runs (CASCADE only) - append new points instead of replacing
    // Skip this for PISTIL - Pistil has its own handling below
    if (props.model !== 'PISTIL' && props.currentRunId && props.currentRunId.startsWith('restarted_run_')) {
      console.log('[CASCADE] Restarted run mode - appending new points to existing points');
      console.log('[CASCADE] Current allPoints before processing:', allPoints.value.length);
      console.log('[CASCADE] New points from polling:', newPoints.length);
      console.log('[CASCADE] hasSetInitialRestartPoints:', hasSetInitialRestartPoints.value);
      
      // For restarted runs, NEVER replace allPoints, only append new ones
      if (newPoints.length > 0) {
        // Find new points that aren't already in allPoints
        const existingPoints = allPoints.value.map(pt => `${pt.x},${pt.y},${pt.gpu},${pt.attn},${pt.sparse},${pt.conv}`);
        const trulyNewPoints = newPoints.filter(pt => {
          const pointKey = `${pt.x},${pt.y},${pt.gpu},${pt.attn},${pt.sparse},${pt.conv}`;
          return !existingPoints.includes(pointKey);
        });
        
        if (trulyNewPoints.length > 0) {
          allPoints.value.push(...trulyNewPoints);
          console.log(`[CASCADE] Added ${trulyNewPoints.length} new points to restarted run. Total points:`, allPoints.value.length);
        } else {
          console.log('[CASCADE] No truly new points to add (all were duplicates)');
        }
      } else {
        console.log('[CASCADE] No new points from polling, preserving existing points');
      }
      
      // Always update the chart after processing restarted run data
      updateChart();
      return; // Exit early to prevent normal processing
    } else if (props.currentRunId && props.currentRunId.startsWith('pistil_run_')) {
      // Special handling for Pistil GA runs - append new points incrementally
      // First, filter out any old Pistil points from different runs
      const currentRunPoints = allPoints.value.filter(pt => {
        // Keep custom points
        if (pt.type === 'custom' || pt.type === 'modified' || pt.source === 'Manual') {
          return true;
        }
        // For Pistil points, only keep if they match the current run
        // We can't directly check run_id on points, but we can check if they're from the current model
        // and assume all Pistil points in allPoints are from the current run after clearing
        return pt.model !== 'PISTIL' || true; // Keep all Pistil points (they should all be from current run after initial clear)
      });
      
      // If we have new points and no existing Pistil points, this might be the first poll
      // In that case, replace all points with new ones to ensure we only show current run
      const hasExistingPistilPoints = currentRunPoints.some(pt => pt.model === 'PISTIL');
      if (newPoints.length > 0 && !hasExistingPistilPoints) {
        console.log('First poll for Pistil run - setting initial points');
        allPoints.value = [...newPoints];
        // Restore custom points
        if (currentCustomPoints.length > 0) {
          allPoints.value.push(...currentCustomPoints);
        }
        updateChart();
        return;
      }
      
      console.log('Pistil GA run mode - appending new points incrementally');
      console.log('Current allPoints before processing:', allPoints.value.length);
      console.log('New points from polling:', newPoints.length);
      
      if (newPoints.length > 0) {
        // Find new points that aren't already in allPoints
        // For Pistil, use a unique key based on design parameters
        const existingPoints = allPoints.value.map(pt => {
          if (pt.model === 'PISTIL') {
            // Use Pistil-specific parameters for uniqueness
            return `${pt.num_cus || ''},${pt.num_tmacs || ''},${pt.mem_buf_cap || ''},${pt.net_buf_cap || ''},${pt.mem_banks_per_group || ''},${pt.mem_ranks || ''},${pt.mem_frac_bank_cap || ''},${pt.batch_size || ''},${pt.kv_cache || ''}`;
          } else {
            // Fallback for non-Pistil points
            return `${pt.x},${pt.y},${pt.gpu || ''},${pt.attn || ''},${pt.sparse || ''},${pt.conv || ''}`;
          }
        });
        
        const trulyNewPoints = newPoints.filter(pt => {
          let pointKey;
          if (pt.model === 'PISTIL') {
            pointKey = `${pt.num_cus || ''},${pt.num_tmacs || ''},${pt.mem_buf_cap || ''},${pt.net_buf_cap || ''},${pt.mem_banks_per_group || ''},${pt.mem_ranks || ''},${pt.mem_frac_bank_cap || ''},${pt.batch_size || ''},${pt.kv_cache || ''}`;
          } else {
            pointKey = `${pt.x},${pt.y},${pt.gpu || ''},${pt.attn || ''},${pt.sparse || ''},${pt.conv || ''}`;
          }
          return !existingPoints.includes(pointKey);
        });
        
        if (trulyNewPoints.length > 0) {
          allPoints.value.push(...trulyNewPoints);
          console.log(`Added ${trulyNewPoints.length} new Pistil points. Total points:`, allPoints.value.length);
          updateChart();
        } else {
          console.log('No truly new Pistil points to add (all were duplicates)');
        }
      } else {
        console.log('No new Pistil points from polling yet');
      }
      
      // Restore custom points if any
      if (currentCustomPoints.length > 0) {
        const customInAllPoints = allPoints.value.some(pt => 
          currentCustomPoints.some(customPt => 
            Math.abs(customPt.x - pt.x) < 0.001 &&
            Math.abs(customPt.y - pt.y) < 0.001
          )
        );
        if (!customInAllPoints) {
          allPoints.value.push(...currentCustomPoints);
        }
      }
      
      return; // Exit early to prevent normal processing
    } else {
      // Regular behavior for non-restarted, non-Pistil runs (CASCADE only)
      // Skip this entirely if model is PISTIL
      if (props.model === 'PISTIL') {
        console.log('[PISTIL] Skipping CASCADE-specific update logic');
        return;
      }
      
      // For CASCADE, also append incrementally if it's a GA run
      const isCascadeGA = !hasLoadedRunData.value && newPoints.length > 0 && 
                          allPoints.value.length > 0 && 
                          !props.currentRunId?.startsWith('restarted_run_') &&
                          !props.currentRunId?.startsWith('pistil_run_');
      
      if (isCascadeGA) {
        // For CASCADE GA runs, also append incrementally
        console.log('[CASCADE] GA run mode - appending new points incrementally');
        const existingPoints = allPoints.value.map(pt => `${pt.x},${pt.y},${pt.gpu},${pt.attn},${pt.sparse},${pt.conv}`);
        const trulyNewPoints = newPoints.filter(pt => {
          const pointKey = `${pt.x},${pt.y},${pt.gpu},${pt.attn},${pt.sparse},${pt.conv}`;
          return !existingPoints.includes(pointKey);
        });
        
        if (trulyNewPoints.length > 0) {
          allPoints.value.push(...trulyNewPoints);
          console.log(`[CASCADE] Added ${trulyNewPoints.length} new CASCADE points. Total points:`, allPoints.value.length);
          updateChart();
        }
      } else {
        // Only update if we have new data OR if this is not a loaded run
        // This prevents clearing loaded run data when polling returns empty data
        if (newPoints.length > 0 || !hasLoadedRunData.value) {
          allPoints.value = newPoints;
          // Restore custom points
          if (currentCustomPoints.length > 0) {
            allPoints.value.push(...currentCustomPoints);
            console.log('[CASCADE] Restored custom points after normal update. Total points:', allPoints.value.length);
          }
          console.log('[CASCADE] Normal mode - Total points after update:', allPoints.value.length);
          updateChart();
        } else {
          console.log('[CASCADE] Skipping update for loaded run with empty polling data');
          console.log('[CASCADE] hasLoadedRunData.value:', hasLoadedRunData.value);
          console.log('[CASCADE] newPoints.length:', newPoints.length);
        }
      }
    }
  }
  
  console.log('All points after update:', allPoints.value.length);
  console.log('Sample points after update:', allPoints.value.slice(0, 2));
  
  // Update axes based on model type detected in data
  updateAxesForModel(allPoints.value);
  
  updateChart();
  console.log('=== updateChartData END ===');
};

const getChartData = () => {
    return allPoints.value;
};

const startDrag = (event) => {
    isDragging.value = true;
    dragOffset.value = {
        x: event.clientX - popupX.value,
        y: event.clientY - popupY.value,
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
};

const onDrag = (event) => {
    if (isDragging.value) {
        popupX.value = event.clientX - dragOffset.value.x;
        popupY.value = event.clientY - dragOffset.value.y;
    }
};

const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
};

// Legend drag functionality
const startLegendDrag = (event) => {
    if (!legendRef.value) return;
    
    isLegendDragging.value = true;
    const rect = legendRef.value.getBoundingClientRect();
    legendDragOffset.value = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
    
    document.addEventListener('mousemove', onLegendDrag);
    document.addEventListener('mouseup', stopLegendDrag);
    event.preventDefault();
};

const onLegendDrag = (event) => {
    if (!isLegendDragging.value || !legendRef.value) return;
    
    const container = legendRef.value.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    let newX = event.clientX - containerRect.left - legendDragOffset.value.x;
    let newY = event.clientY - containerRect.top - legendDragOffset.value.y;
    
    // Keep legend within bounds
    const legendRect = legendRef.value.getBoundingClientRect();
    const maxX = containerRect.width - legendRect.width;
    const maxY = containerRect.height - legendRect.height;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    legendRef.value.style.left = newX + 'px';
    legendRef.value.style.top = newY + 'px';
};

const stopLegendDrag = () => {
    isLegendDragging.value = false;
    document.removeEventListener('mousemove', onLegendDrag);
    document.removeEventListener('mouseup', stopLegendDrag);
};

const showPointPopup = (point) => {
    if (!chartInstance) return;
    let container = chartRef.value?.parentElement;
    if (!container) container = chartRef.value;
    const rect = container.getBoundingClientRect();
    popupX.value = rect.width / 2;
    popupY.value = rect.height / 2;
    selectedPoint.value = { ...point };
    showDropdown.value = true;
};

const closePointPopup = () => {
    showDropdown.value = false;
};

// Add method for adding custom design points
function addCustomDesignPoint(point) {
  console.log('addCustomDesignPoint called with:', point);
  
  // Create the custom point with proper type identification
  const customPoint = {
    x: point.x,
    y: point.y,
    gpu: point.gpu || 0,
    attn: point.attn || 0,
    sparse: point.sparse || 0,
    conv: point.conv || 0,
    trace: point.trace || '',
    algorithm: 'Custom Design',
    source: 'Manual',
    label: 'Custom Design',
    type: 'custom', // Add explicit type for better identification
    saved: point.saved || false // Track saved status
  };
  
  console.log('Processed custom point:', customPoint);
  
  // Add to allPoints just like any other point
  allPoints.value.push(customPoint);
  
  console.log('All points after adding custom point:', allPoints.value.length);
  
  updateChart();
}

// Add method for updating custom design points (e.g., marking as saved)
function updateCustomDesignPoint(updatedPoint) {
  console.log('updateCustomDesignPoint called with:', updatedPoint);
  
  // Find the custom point in allPoints and update it
  const pointIndex = allPoints.value.findIndex(pt => 
    pt.type === 'custom' && 
    pt.x === updatedPoint.x && 
    pt.y === updatedPoint.y &&
    pt.gpu === updatedPoint.gpu &&
    pt.attn === updatedPoint.attn &&
    pt.sparse === updatedPoint.sparse &&
    pt.conv === updatedPoint.conv
  );
  
  if (pointIndex !== -1) {
    console.log('Found custom point at index:', pointIndex);
    // Update the point with new properties (like saved status)
    allPoints.value[pointIndex] = {
      ...allPoints.value[pointIndex],
      ...updatedPoint
    };
    console.log('Updated custom point:', allPoints.value[pointIndex]);
    updateChart();
  } else {
    console.log('Custom point not found for update');
  }
}

// Add method for clearing custom design points
function clearCustomPoints() {
  console.log('Clearing all custom points for new optimization run');
  
  // Remove custom points from allPoints
  allPoints.value = allPoints.value.filter(pt => 
    !(pt.source === 'Manual' || pt.label === 'Custom Design' || pt.label === 'Modified Design')
  );
  
  // Clear customPoints array
  customPoints.value = [];
  
  console.log('Custom points cleared. Remaining points:', allPoints.value.length);
  updateChart();
}

// Add method to set loaded run data flag
const setLoadedRunData = (isLoaded) => {
  console.log('=== setLoadedRunData CALLED ===');
  console.log('Previous hasLoadedRunData.value:', hasLoadedRunData.value);
  console.log('Setting to:', isLoaded);
  hasLoadedRunData.value = isLoaded;
  console.log('New hasLoadedRunData.value:', hasLoadedRunData.value);
  console.log('=== setLoadedRunData END ===');
};

// Add method to clear loaded run data
const clearLoadedRunData = () => {
  hasLoadedRunData.value = false;
  console.log('Cleared loaded run data flag');
};

// Add method to clear selected point
const clearSelectedPoint = () => {
  selectedPointIndex.value = null;
  updateChart();
};

// Add method to select a specific point
const selectPoint = (pointIndex) => {
  selectedPointIndex.value = pointIndex;
  updateChart();
  if (pointIndex !== null && allPoints.value[pointIndex]) {
    emit('point-selected', allPoints.value[pointIndex]);
  }
};

// Method to highlight points based on constraint data
const highlightPointsByConstraint = (highlightingData) => {
  console.log('Plot: highlightPointsByConstraint called with:', highlightingData);
  console.log('Plot: highlightingData type:', typeof highlightingData);
  console.log('Plot: highlightingData keys:', Object.keys(highlightingData || {}));
  
  if (highlightingData && highlightingData.highlighted_points) {
    console.log('Plot: highlighted_points array length:', highlightingData.highlighted_points.length);
    console.log('Plot: First few highlighted_points:', highlightingData.highlighted_points.slice(0, 3));
    
    // Extract indices of highlighted points
    const highlightedIndices = highlightingData.highlighted_points
      .map((point, index) => {
        console.log(`Plot: Point ${index}:`, point);
        return point.highlighted ? index : -1;
      })
      .filter(index => index !== -1);
    
    console.log('Plot: Setting highlighted points to:', highlightedIndices);
    console.log('Plot: Current allPoints length:', allPoints.value.length);
    highlightedPoints.value = highlightedIndices;
    
    // Refresh the chart to show highlighting
    if (chartInstance) {
      console.log('Plot: Updating chart with highlighting');
      chartInstance.data.datasets = buildChartData();
      chartInstance.update();
    } else {
      console.log('Plot: No chart instance available');
    }
  } else {
    console.log('Plot: No highlighting data or highlighted_points array');
  }
};

// Method to clear highlighting
const clearHighlighting = () => {
  console.log('Plot: Clearing highlighting');
  highlightedPoints.value = [];
  
  // Refresh the chart to remove highlighting
  if (chartInstance) {
    chartInstance.data.datasets = buildChartData();
    chartInstance.update();
  }
};

// Zoom methods
const zoomIn = () => {
  if (chartInstance) {
    chartInstance.zoom(1.2);
    chartInstance.update();
  }
};

const zoomOut = () => {
  if (chartInstance) {
    chartInstance.zoom(0.8);
    chartInstance.update();
  }
};

const resetZoom = () => {
  if (chartInstance) {
    chartInstance.resetZoom();
    chartInstance.update();
  }
};

// Expose methods and selected axes for parent component access
defineExpose({
    selectedXAxis,
    selectedYAxis,
    updateChartData,
    updateChart,
    getChartData,
    showPointPopup,
    closePointPopup,
    addCustomDesignPoint,
    updateCustomDesignPoint,
    clearCustomPoints,
    highlightPointsByConstraint,
    clearHighlighting,
    selectPoint,
    clearSelectedPoint,
    refreshPlot: async () => {
        console.log('Forcing plot refresh');
        const newData = await fetchChartData();
        updateChartData(newData);
    },
    enablePolling,
    setLoadedRunData,
    clearLoadedRunData,
    clearComparativeLoading: () => {
        isComparativeLoading.value = false;
        comparativeLoadingMessage.value = '';
    },
    zoomIn,
    zoomOut,
    resetZoom,
    toggleRegionSelection,
    applyRectangularRegion,
    clearRectangularRegion,
    clearAllRegions,
    applyParetoRegion,
    clearParetoRegion,
    startManualSelection,
    clearManualSelection,
    // Expose allPoints for direct access
    get allPoints() { return allPoints.value; },
    set allPoints(value) { allPoints.value = value; },
    // Expose hasSetInitialRestartPoints for direct access
    get hasSetInitialRestartPoints() { return hasSetInitialRestartPoints.value; },
    set hasSetInitialRestartPoints(value) { hasSetInitialRestartPoints.value = value; }
});

let refreshInterval = null;
let hasOptimizationRun = false; // Track if optimization has been run

function startPolling() {
  // Only start polling if a model is selected
  if (!props.model) {
    console.log('[Plot] Cannot start polling: no model selected');
    return;
  }
  
  if (refreshInterval) clearInterval(refreshInterval);
  const currentModel = props.model;
  const modelPrefix = currentModel === 'PISTIL' ? '[PISTIL]' : '[CASCADE]';
  console.log(`${modelPrefix} Starting polling for ${currentModel} model...`);
  
  refreshInterval = setInterval(async () => {
    console.log(`${modelPrefix} Polling for new data...`);
    const newData = await fetchChartData();
    console.log(`${modelPrefix} Polling returned data:`, newData ? newData.length : 'no data');
    if (newData && newData.length > 0) {
      console.log(`${modelPrefix} First few points from polling:`, newData.slice(0, 3));
    }
    console.log(`${modelPrefix} Current allPoints before update:`, allPoints.value.length);
    
    // Only update if we have data (not null)
    if (newData !== null) {
      updateChartData(newData);
      console.log(`${modelPrefix} Current allPoints after update:`, allPoints.value.length);
    } else {
      console.log(`${modelPrefix} No new data available, preserving existing data`);
    }
  }, 3000); // Poll every 3 seconds for real-time updates
}

// Add method to enable polling after optimization
function enablePolling() {
  hasOptimizationRun = true;
  const currentModel = props.model || 'CASCADE';
  const modelPrefix = currentModel === 'PISTIL' ? '[PISTIL]' : '[CASCADE]';
  console.log(`${modelPrefix} Polling enabled after optimization run`);
  // Only start polling if model is selected
  if (props.model) {
    startPolling();
  } else {
    console.log('[Plot] Cannot enable polling: no model selected');
  }
}

// Watch for axis changes and update chart
watch([selectedXAxis, selectedYAxis], () => {
  console.log('Axis selection changed - updating chart');
  if (chartInstance) {
    updateChart();
  }
});

onMounted(() => {
  createChart();
  // Clear any existing data on mount to ensure clean start
  allPoints.value = [];
  updateChart();
  // Don't start polling automatically - wait for model selection
  // Polling will start when model prop is set (via watcher)
  console.log('[Plot] Component mounted. Waiting for model selection before starting polling.');
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
});

watch(() => props.isComparative, () => {
  // Only start polling if model is already selected
  if (props.model) {
    console.log(`[${props.model}] Comparative mode changed, restarting polling`);
    startPolling();
  }
});

// Watch for model prop changes to start/restart polling when model is selected
watch(() => props.model, (newModel, oldModel) => {
  // Only start polling when a model is explicitly selected
  // Skip if model is null/undefined (no selection yet)

  if (!newModel) {
    console.log('[Plot] No model selected yet, not starting polling');
    // Stop polling if model is cleared
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      console.log('[Plot] Stopped polling (model cleared)');
    }
    return;
  }
  
  // Update axes immediately when model is selected (before points arrive)
  if (newModel === 'PISTIL') {
    availableAxes.value = pistilAxes;
    if (selectedXAxis.value === "Total time (ms)" || !pistilAxes.includes(selectedXAxis.value)) {
      selectedXAxis.value = "Latency per Token (ms)";
    }
    if (selectedYAxis.value === "Total Energy (mJ)" || !pistilAxes.includes(selectedYAxis.value)) {
      selectedYAxis.value = "Energy per Inference (mJ)";
    }
    console.log('[Plot] Updated axes for PISTIL model');
  } else if (newModel === 'CASCADE') {
    availableAxes.value = cascadeAxes;
    if (!cascadeAxes.includes(selectedXAxis.value)) {
      selectedXAxis.value = "Total time (ms)";
    }
    if (!cascadeAxes.includes(selectedYAxis.value)) {
      selectedYAxis.value = "Total Energy (mJ)";
    }
    console.log('[Plot] Updated axes for CASCADE model');
  }
  
  // Start polling when model is selected or changes
  if (newModel !== oldModel) {
    if (oldModel === null || oldModel === undefined) {
      // First time model is selected
      console.log(`[Plot] Model selected: ${newModel}. Starting polling.`);
    } else {
      // Model changed
      console.log(`[Plot] Model changed from ${oldModel} to ${newModel}`);
    }
    console.log(`[Plot] Starting polling for ${newModel === 'PISTIL' ? 'Pistil' : 'Cascade'} model`);
    startPolling();
  }
}, { immediate: false }); // Don't run immediately on mount

// Watch for currentRunId changes to restart polling and clear old points
watch(() => props.currentRunId, (newRunId, oldRunId) => {
  console.log('currentRunId changed from', oldRunId, 'to', newRunId);
  if (newRunId && newRunId !== oldRunId) {
    console.log('Restarting polling with new run ID:', newRunId);
    
    // Clear old points when switching to a new run (unless it's a restarted run)
    // Restarted runs should keep old points and append new ones
    // Only do this for CASCADE - Pistil has its own handling
    if (props.model !== 'PISTIL' && !newRunId.startsWith('restarted_run_')) {
      console.log('[CASCADE] Clearing old points for new run:', newRunId);
      // Keep only custom points, clear optimization points
      const customPointsToKeep = allPoints.value.filter(pt => 
        pt.type === 'custom' || pt.type === 'modified' || 
        pt.source === 'Manual' || pt.label === 'Custom Design' || 
        pt.label === 'Modified Design' || pt.algorithm === 'Custom Design'
      );
      allPoints.value = customPointsToKeep;
      console.log('[CASCADE] Cleared optimization points. Kept', customPointsToKeep.length, 'custom points');
      updateChart();
    } else if (props.model === 'PISTIL' && newRunId.startsWith('pistil_run_')) {
      // For Pistil, clear old Pistil points when switching runs
      console.log('[PISTIL] Clearing old points for new Pistil run:', newRunId);
      const customPointsToKeep = allPoints.value.filter(pt => 
        pt.type === 'custom' || pt.type === 'modified' || 
        pt.source === 'Manual' || pt.label === 'Custom Design' ||
        pt.model !== 'PISTIL'  // Keep non-Pistil points (custom points)
      );
      allPoints.value = customPointsToKeep;
      console.log('[PISTIL] Cleared old Pistil points. Kept', customPointsToKeep.length, 'custom points');
      updateChart();
    }
    
    startPolling();
  }
});

// Watch for customPoints prop changes and merge with allPoints
watch(() => props.customPoints, (newCustomPoints) => {
  console.log('Custom points prop changed:', newCustomPoints.length);
  
  // Remove existing custom points from allPoints
  allPoints.value = allPoints.value.filter(pt => 
    !(pt.type === 'custom' || pt.type === 'modified' || 
      pt.source === 'Manual' || pt.label === 'Custom Design' || 
      pt.label === 'Modified Design' || pt.algorithm === 'Custom Design')
  );
  
  // Add new custom points from props
  if (newCustomPoints && newCustomPoints.length > 0) {
    allPoints.value.push(...newCustomPoints);
    console.log('Merged custom points from props. Total points:', allPoints.value.length);
  }
  
  // Update chart if it exists
  if (chartInstance) {
    chartInstance.data.datasets = buildChartData();
    chartInstance.update();
  }
}, { deep: true });

// Watch for axis changes and update chart
watch([selectedXAxis, selectedYAxis], () => {
  if (chartInstance) {
    // Update axis titles
    chartInstance.options.scales.x.title.text = selectedXAxis.value;
    chartInstance.options.scales.y.title.text = selectedYAxis.value;
    chartInstance.update();
  }
});

const handlePointAction = () => {
    console.log("Point clicked:", selectedPoint.value);
    emit("point-message", selectedPoint.value);
    // Remove closing the popup
};

// Remove the handleModifyDesign and handleEvaluateModifiedDesign methods since they're now handled in App.vue
</script>

<template>
    <div class="chart-container" style="position: relative;">
        <div class="plot-scroll-container">
            <div class="plot-canvas-wrapper">
                <canvas ref="chartRef"></canvas>
                <div v-if="isEvaluatingDesign" class="plot-loading-overlay">
                    <div class="plot-loading-spinner"></div>
                    <div class="plot-loading-text">Evaluating design...</div>
                </div>
                <div v-if="isComparativeLoading" class="plot-loading-overlay">
                    <div class="plot-loading-spinner"></div>
                    <div class="plot-loading-text">{{ comparativeLoadingMessage }}</div>
                </div>
            </div>
        </div>
        <div class="axis_select">
            <label>Y Axis:
                <select v-model="selectedYAxis">
                    <option v-for="axis in availableAxes" :key="axis" :value="axis">{{ axis }}</option>
                </select>
            </label>

            <label>X Axis:
                <select v-model="selectedXAxis">
                    <option v-for="axis in availableAxes" :key="axis" :value="axis">{{ axis }}</option>
                </select>
            </label>
        </div>
        
        <!-- Legend -->
        <div class="plot-legend" ref="legendRef" @mousedown="startLegendDrag">
          <div v-for="entry in getLegendEntries()" :key="entry.key" class="legend-entry">
            <span class="legend-swatch" :style="{ backgroundColor: entry.color }"></span>
            <span class="legend-label">{{ entry.label }}</span>
          </div>
        </div>
        
        
    </div>
</template>

<style scoped>
.chart-container {
    width: 100%;
    min-height: 520px;
    height: 620px;
    padding-top: 20px;
    padding-bottom: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
}

.plot-scroll-container {
    width: 100%;
    height: calc(100% - 80px); /* Subtract space for axis_select at bottom */
    overflow: visible;
    position: relative;
    border: 1px solid #e0e6ed;
    border-radius: 8px;
    background: #fff;
    margin-bottom: 10px;
}

.plot-canvas-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.plot-canvas-wrapper canvas {
    display: block;
    cursor: crosshair; /* Default cursor for chart */
}

.plot-area {
    min-height: 520px;
    height: 620px;
}
.axis_select {
    display: flex;
    gap: 20px;
    width: 100%;
    align-items: center;
    justify-content: space-between;
}


.plot-legend {
  position: absolute;
  top: 18px;
  right: 24px;
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 0.75rem 1.25rem;
  min-width: 180px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: move;
  user-select: none;
}
.legend-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}
.legend-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #bbb;
  margin-right: 0.5rem;
}
.legend-selected {
  background: #FFD700;
  border: 2px solid #FFD700;
  box-shadow: 0 0 6px #FFD700;
}
.legend-label {
  color: #2d3748;
  font-weight: 500;
}
.legend-note {
  margin-top: 0.5rem;
  font-size: 0.95rem;
  color: #555;
}


.plot-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 8px;
}

.plot-loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #337aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.plot-loading-text {
  font-size: 1rem;
  color: #2d3748;
  font-weight: 500;
  text-align: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
