<script setup>
import "../assets/styles.css";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { Chart, ScatterController, LinearScale, PointElement, Title, Tooltip } from "chart.js";
import axios from "axios";

Chart.register(ScatterController, LinearScale, PointElement, Title, Tooltip);

const chartRef = ref(null);
let chartInstance = null;
const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);
const selectedPoint = ref(null);
const pointDropdownRef = ref(null);
const emit = defineEmits(["point-message"]);

const availableAxes = ref(["Total time (ms)", "Total Energy (mJ)", "Temperature (K)", "Latency (μs)"]); // etc.
const selectedXAxis = ref("Total time (ms)");
const selectedYAxis = ref("Total Energy (mJ)");

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
                {
                    label: "Scatter Dataset 2",
                    data: [{ 'x': 900, 'y': 100 }], // Initialize with no points
                    backgroundColor: ["purple"],
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

                    selectedPoint.value = dataPoint;
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
                display: true, // ✅ show the legend
                position: "top", // "top", "left", "bottom", "right"
                labels: {
                    font: {
                        size: 12,
                    },
                    color: "#333", // optional
                },
            },
        },
    });
};

watch([selectedXAxis, selectedYAxis], ([newX, newY]) => {
    if (chartInstance) {
        chartInstance.options.scales.x.title.text = newX;
        chartInstance.options.scales.y.title.text = newY;
        chartInstance.update();
    }
});

const updateChartData = (newChartData) => {
    if (chartInstance) {
        console.log("PLOT DATA");
        console.log(newChartData);
        chartInstance.data.datasets[0].data = newChartData;
        console.log("CHART DATA");
        console.log(chartInstance.data)
        chartInstance.update();
    }
};

// Expose the updateChartData method to the parent component
defineExpose({
    updateChartData,
});

onMounted(() => {
    createChart(); // Initialize chart with no points
    // Listen for clicks on the document
    document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
    // Clean up event listener
    document.removeEventListener("click", handleClickOutside);
});

const handlePointAction = () => {
    console.log("Point clicked:", selectedPoint.value);
    emit("point-message", selectedPoint.value);
    showDropdown.value = false;
};

const handleClickOutside = (event) => {
    // Check if the dropdown is open and the click is outside it
    const dropdownEl = pointDropdownRef.value;
    if (showDropdown.value && dropdownEl && !dropdownEl.contains(event.target)) {
        showDropdown.value = false;
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
        :style="{ top: dropdownY + 'px', left: dropdownX + 'px' }">
        <p><strong>Selected Point</strong></p>
        <p>X: {{ selectedPoint?.x }}</p>
        <p>Y: {{ selectedPoint?.y }}</p>
        <button @click="handlePointAction" class="point-button">Send to chat</button>
        <button @click="showDropdown = false" class="point-button">Close</button>
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
</style>
