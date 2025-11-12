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
  }
});

const availableAxes = ref(["Total time (ms)", "Total Energy (mJ)", "Temperature (K)", "Latency (μs)"]);
const selectedXAxis = ref("Total time (ms)");
const selectedYAxis = ref("Total Energy (mJ)");

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
  
  // Check point type first
  if (point.type === 'custom' || point.type === 'modified') {
    return customColor; // Purple for custom/modified points
  }
  
  // Check source for backward compatibility
  if (point.source === 'Manual' || point.label === 'Custom Design') {
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
      key = pt.algorithm ? `Genetic Algorithm (${pt.algorithm})` : 'Genetic Algorithm';
      label = pt.algorithm ? pt.algorithm : 'Genetic Algorithm';
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
        
        if (hasLoadedRunData.value && props.currentRunId && props.currentRunId.startsWith('loaded_run_')) {
            const tempFilePath = `/Users/ramyagotika/research-work/chiplet/chiplet-server/api/Evaluator/cascade/chiplet_model/dse/results/temp_points_${props.currentRunId}.csv`;
            params.file_path = tempFilePath;
            console.log('Polling with loaded run file path:', tempFilePath);
        } else if (props.currentRunId && props.currentRunId.startsWith('restarted_run_')) {
            // For restarted runs, poll the main points.csv (which will have new GA points)
            const restartedPath = `/Users/ramyagotika/research-work/chiplet/chiplet-server/api/Evaluator/cascade/chiplet_model/dse/results/${props.currentRunId}/points.csv`;
            params.file_path = restartedPath;
            console.log('Polling with restarted run file path:', restartedPath);
        } else {
            console.log('Using default polling (no specific run ID detected)');
        }
        
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
  // Filter out any undefined or malformed points
  const validPoints = allPoints.value.filter(pt => pt && typeof pt === 'object' && pt.x !== undefined && pt.y !== undefined);
  
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
    (!pt.type && !pt.source && !pt.label) // Default to optimization for backward compatibility
  );
  
  const customPoints = validPoints.filter(pt => 
    pt.type === 'custom' || 
    pt.type === 'modified' ||
    pt.source === 'Manual' || 
    pt.label === 'Custom Design' || 
    pt.label === 'Modified Design' ||
    pt.algorithm === 'Manual'
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
                        enabled: true,
                        mode: 'xy'
                    },
                    zoom: {
                        wheel: {
                            enabled: false,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
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
                
                // Find the global index in allPoints.value
                const globalIndex = allPoints.value.findIndex(pt => 
                  pt.x === pointData.x && pt.y === pointData.y &&
                  pt.gpu === pointData.gpu && pt.attn === pointData.attn &&
                  pt.sparse === pointData.sparse && pt.conv === pointData.conv
                );
                
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
                
                // Find the global index in allPoints.value
                const globalIndex = allPoints.value.findIndex(pt => 
                  pt.x === pointData.x && pt.y === pointData.y &&
                  pt.gpu === pointData.gpu && pt.attn === pointData.attn &&
                  pt.sparse === pointData.sparse && pt.conv === pointData.conv
                );
                
                hoveredPointIndex.value = globalIndex !== -1 ? globalIndex : null;
                // Emit hovered point data for design visualizer
                if (globalIndex !== -1) {
                  const pt = allPoints.value[globalIndex];
                  emit('point-hovered', pt);
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
    const newPoints = newChartData && newChartData.map
      ? newChartData.map(pt => ({
          ...pt,
          algorithm: pt.algorithm || 'Genetic Algorithm',
          trace: pt.trace || '',
        }))
      : [];
    console.log('Normal mode - Processing new points:', newPoints.length);
    console.log('Sample new point:', newPoints[0]);
    
    // Check if this is a loaded run (has loaded_from_backup flag)
    const isLoadedRun = newChartData && newChartData.loaded_from_backup;
    
    // Special handling for restarted runs - append new points instead of replacing
    if (props.currentRunId && props.currentRunId.startsWith('restarted_run_')) {
      console.log('Restarted run mode - appending new points to existing points');
      console.log('Current allPoints before processing:', allPoints.value.length);
      console.log('New points from polling:', newPoints.length);
      console.log('hasSetInitialRestartPoints:', hasSetInitialRestartPoints.value);
      
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
          console.log(`Added ${trulyNewPoints.length} new points to restarted run. Total points:`, allPoints.value.length);
        } else {
          console.log('No truly new points to add (all were duplicates)');
        }
      } else {
        console.log('No new points from polling, preserving existing points');
      }
      
      // Always update the chart after processing restarted run data
      updateChart();
      return; // Exit early to prevent normal processing
    } else {
      // Regular behavior for non-restarted runs
      // Only update if we have new data OR if this is not a loaded run
      // This prevents clearing loaded run data when polling returns empty data
      if (newPoints.length > 0 || !hasLoadedRunData.value) {
        allPoints.value = newPoints;
        // Restore custom points
        if (currentCustomPoints.length > 0) {
          allPoints.value.push(...currentCustomPoints);
          console.log('Restored custom points after normal update. Total points:', allPoints.value.length);
        }
        console.log('Normal mode - Total points after update:', allPoints.value.length);
      } else {
        console.log('Skipping update for loaded run with empty polling data');
        console.log('hasLoadedRunData.value:', hasLoadedRunData.value);
        console.log('newPoints.length:', newPoints.length);
      }
    }
  }
  
  console.log('All points after update:', allPoints.value.length);
  console.log('Sample points after update:', allPoints.value.slice(0, 2));
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

defineExpose({
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
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(async () => {
    console.log('Polling for new data...');
    const newData = await fetchChartData();
    console.log('Polling returned data:', newData ? newData.length : 'no data');
    console.log('First few points from polling:', newData ? newData.slice(0, 3) : 'no data');
    console.log('Current allPoints before update:', allPoints.value.length);
    
    // Only update if we have data (not null)
    if (newData !== null) {
      updateChartData(newData);
      console.log('Current allPoints after update:', allPoints.value.length);
    } else {
      console.log('No new data available, preserving existing data');
    }
  }, 3000); // Poll every 3 seconds for real-time updates
}

// Add method to enable polling after optimization
function enablePolling() {
  hasOptimizationRun = true;
  console.log('Polling enabled after optimization run');
  // Restart polling to ensure it's active
  startPolling();
}

onMounted(() => {
  createChart();
  // Clear any existing data on mount to ensure clean start
  allPoints.value = [];
  updateChart();
  startPolling();
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
});

watch(() => props.isComparative, () => {
  startPolling();
});

// Watch for currentRunId changes to restart polling
watch(() => props.currentRunId, (newRunId, oldRunId) => {
  console.log('currentRunId changed from', oldRunId, 'to', newRunId);
  if (newRunId && newRunId !== oldRunId) {
    console.log('Restarting polling with new run ID:', newRunId);
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
        <canvas ref="chartRef"></canvas>
        <div v-if="isEvaluatingDesign" class="plot-loading-overlay">
            <div class="plot-loading-spinner"></div>
            <div class="plot-loading-text">Evaluating design...</div>
        </div>
        <div v-if="isComparativeLoading" class="plot-loading-overlay">
            <div class="plot-loading-spinner"></div>
            <div class="plot-loading-text">{{ comparativeLoadingMessage }}</div>
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
