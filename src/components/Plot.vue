<script setup>
import "../assets/styles.css";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { Chart, ScatterController, LinearScale, PointElement, Title, Tooltip } from "chart.js";
import axios from "axios";
import ModifyDesignMenu from './ModifyDesignMenu.vue';

Chart.register(ScatterController, LinearScale, PointElement, Title, Tooltip);

const chartRef = ref(null);
let chartInstance = null;
const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);
const selectedPoint = ref(null);
const pointDropdownRef = ref(null);
const emit = defineEmits(["point-message", "open-modify-design"]);

const availableAxes = ref(["Total time (ms)", "Total Energy (mJ)", "Temperature (K)", "Latency (μs)"]); // etc.
const selectedXAxis = ref("Total time (ms)");
const selectedYAxis = ref("Total Energy (mJ)");

// Add state for modify design menu
const showModifyMenu = ref(false);
const modifyMenuProps = ref({
    initialGPU: 0,
    initialAttention: 0,
    initialSparse: 0,
    initialConvolution: 0,
    initialTrace: "",
});

const popupX = ref(0);
const popupY = ref(0);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const selectedPointId = ref(null);

const fetchChartData = async () => {
    try {
        const response = await axios.get("http://127.0.0.1:8000/api/chart-data/");
        return response.data.data;
    } catch (error) {
        console.error("Error fetching chart data:", error);
        return [];
    }
};

const createChart = () => {
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(chartRef.value, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Scatter Dataset",
                    data: [], // Initialize with no points
                    backgroundColor: ["black", "green", "blue", "red"],
                    pointRadius: 4,
                    pointHoverRadius: 8,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false,
                    text: "Scattered Data Points",
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const dataPoint = context.raw;
                            const xLabel = selectedXAxis.value || 'X';
                            const yLabel = selectedYAxis.value || 'Y';
                            const xVal = (typeof dataPoint.x === 'number') ? dataPoint.x.toFixed(2) : dataPoint.x;
                            const yVal = (typeof dataPoint.y === 'number') ? dataPoint.y.toFixed(2) : dataPoint.y;
                            // First line: axis names and values
                            const line1 = `${xLabel}: ${xVal}, ${yLabel}: ${yVal}`;
                            // Second line: chiplet types and numbers
                            const line2 = `GPU: ${dataPoint.gpu}, Attn: ${dataPoint.attn}, Sparse: ${dataPoint.sparse}, Conv: ${dataPoint.conv}`;
                            return [line1, line2]; // Return as array for multi-line tooltip
                        },
                    },
                },
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const canvasPosition = chartRef.value.getBoundingClientRect();
                    const datasetIndex = elements[0].datasetIndex;
                    const index = elements[0].index;
                    const dataPoint = chartInstance.data.datasets[datasetIndex].data[index];

                    // Set dropdown position (relative to canvas)
                    dropdownX.value = event.clientX - canvasPosition.left;
                    dropdownY.value = event.clientY - canvasPosition.top;

                    // Include all data point properties in the selectedPoint
                    selectedPoint.value = { ...dataPoint };
                    showDropdown.value = true;
                } else {
                    showDropdown.value = false;
                }
            },
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: "Total time (ms)",
                        font: { size: 14 },
                    },
                },
                y: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "Total Energy (mJ)",
                        font: { size: 14 },
                    },
                },
            },
            legend: {
                display: true,
                position: "top",
                labels: {
                    font: {
                        size: 12,
                        size: 12,
                    },
                    color: "#333",
                },
            },
        },
    });
};

const startInterval = () => {
    setInterval(async () => {
        try {
            const response = await axios.get("http://127.0.0.1:8000/api/update-data/");
            const newChartData = response.data.data;

            // Ensure data is in the correct format
            if (Array.isArray(newChartData) && newChartData.every(point => 'x' in point && 'y' in point)) {
                updateChartData(newChartData);
            } else {
                console.error("Invalid data format:", newChartData);
            }
        } catch (error) {
            console.error("Error fetching updated chart data:", error);
        }
    }, 10000);
};

startInterval();

watch([selectedXAxis, selectedYAxis], ([newX, newY]) => {
    if (chartInstance) {
        chartInstance.options.scales.x.title.text = newX;
        chartInstance.options.scales.y.title.text = newY;
        chartInstance.update();
    }
});

const updateChartData = (newChartData) => {
    if (chartInstance) {
        chartInstance.data.datasets[0].data = newChartData.map(point => ({ ...point }));
        chartInstance.update();
    }
};

const getChartData = () => {
    return chartInstance ? chartInstance.data.datasets[0].data : [];
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

defineExpose({
    updateChartData,
    getChartData,
    showPointPopup,
    closePointPopup,
});

onMounted(() => {
    createChart(); // Initialize chart with no points
    // Remove the document click listener since we want the popup to stay until manually closed
});

onUnmounted(() => {
    // Remove cleanup since we removed the listener
});

const handlePointAction = () => {
    console.log("Point clicked:", selectedPoint.value);
    emit("point-message", selectedPoint.value);
    // Remove closing the popup
};

const handleModifyDesign = () => {
    if (selectedPoint.value) {
        emit('open-modify-design', {
            initialGPU: selectedPoint.value.gpu ?? 0,
            initialAttention: selectedPoint.value.attn ?? 0,
            initialSparse: selectedPoint.value.sparse ?? 0,
            initialConvolution: selectedPoint.value.conv ?? 0,
            initialTrace: selectedPoint.value.trace ?? "",
            x: selectedPoint.value.x,
            y: selectedPoint.value.y,
            xLabel: selectedXAxis.value,
            yLabel: selectedYAxis.value,
        });
    }
};

const handleEvaluateModifiedDesign = async (design) => {
    // Call the same evaluation logic as ChipletMenu
    // For example, call the backend and update the plot
    try {
        // You may want to show a loading state here
        const response = await axios.get("http://127.0.0.1:8000/api/evaluate-point-inputs/", {
            params: {
                GPU: design.GPU,
                Attention: design.Attention,
                Sparse: design.Sparse,
                Convolution: design.Convolution,
                trace: design.trace,
            }
        });
        // Update the plot with the new data if needed
        if (response.data && response.data.data) {
            updateChartData(response.data.data);
        }
        showModifyMenu.value = false;
    } catch (error) {
        console.error("Error evaluating modified design:", error);
    }
};
</script>

<template>
    <div class="chart-container" style="position: relative;">
        <canvas ref="chartRef"></canvas>
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
    </div>

    <div v-if="showDropdown" ref="pointDropdownRef" class="chart-dropdown global-dropdown"
        :style="{ top: popupY + 'px', left: popupX + 'px', position: 'absolute', cursor: isDragging ? 'grabbing' : 'grab' }">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; cursor: grab;"
             @mousedown="startDrag">
            <p style="font-weight: bold; font-size: 1.3rem; margin-bottom: 0.5rem;">Selected Point</p>
            <button @click="showDropdown = false" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; margin-left: 1rem;">×</button>
        </div>
        <p>{{ selectedXAxis }}: {{ selectedPoint?.x !== undefined ? Number(selectedPoint.x).toFixed(2) : '' }}</p>
        <p>{{ selectedYAxis }}: {{ selectedPoint?.y !== undefined ? Number(selectedPoint.y).toFixed(2) : '' }}</p>
        <p style="font-size: 0.85em; color: #555; margin-top: 0.2em;">
          GPU: {{ selectedPoint?.gpu ?? '' }}, Attention: {{ selectedPoint?.attn ?? '' }}
        </p>
        <p style="font-size: 0.85em; color: #555; margin-top: -0.5em;">
          Sparse: {{ selectedPoint?.sparse ?? '' }}, Convolution: {{ selectedPoint?.conv ?? '' }}
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
            <button @click="handlePointAction" class="point-button">Send to chat</button>
            <button @click="handleModifyDesign" class="point-button">Modify design</button>
        </div>
    </div>
</template>

<style scoped>
.chart-container {
    width: 100%;
    height: 100%;
    padding-top: 20px;
    padding-bottom: 40px;
    /* padding-bottom: 20px; */
    display: flex;
    flex-direction: column;
    align-items: center;
}

.axis_select {
    display: flex;
    gap: 20px;
    width: 100%;
    align-items: center;
    justify-content: space-between;
}

.chart-dropdown {
    background: white;
    border: 1px solid #ccc;
    padding: 15px;
    padding-top: 0px;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    border-radius: 4px;
}

.global-dropdown {
    position: absolute;
    /* Or use `fixed` if you want it to stay visible on scroll */
}

.point-button {
    margin: 3px;
    padding: 5px 10px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.modify-design-modal {
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
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15);
  padding: 2rem 2.5rem 1.5rem 2.5rem;
  min-width: 340px;
  max-width: 95vw;
  position: relative;
}
</style>
