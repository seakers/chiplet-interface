<script setup>
import "../assets/styles.css";
import { onMounted, onUnmounted, ref } from "vue";
import { Chart, ScatterController, LinearScale, PointElement, Title, Tooltip } from "chart.js";
import axios from "axios";

Chart.register(ScatterController, LinearScale, PointElement, Title, Tooltip);

const chartRef = ref(null);
let chartInstance = null;
let intervalId = null;

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
                    backgroundColor: "black",
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
                    display: true,
                    text: "Scatter Plot",
                },
            },
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: "X Axis Label",
                        font: { size: 14 },
                    },
                },
                y: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "Y Axis Label",
                        font: { size: 14 },
                    },
                },
            },
        },
    });
};

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
});

</script>

<template>
    <div class="chart-container">
        <canvas ref="chartRef"></canvas>
    </div>
</template>

<style scoped>
.chart-container {
    width: 100%;
    height: 100%;
    padding-top: 20px;
    padding-bottom: 20px;
}
</style>
