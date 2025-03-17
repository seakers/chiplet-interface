<script setup>
import "../assets/styles.css";

import { onMounted, ref, watch } from "vue";
import { Chart, ScatterController, LinearScale, PointElement, Title, Tooltip } from "chart.js";

Chart.register(ScatterController, LinearScale, PointElement, Title, Tooltip);

const props = defineProps({
    chartData: {
        type: Array,
        default: () => [
            { x: 1, y: 1 },
            { x: 2, y: 3 },
            { x: 3, y: 2 },
            { x: 4, y: 5 },
            { x: 5, y: 3 },
        ],
    },
});

const chartRef = ref(null);
let chartInstance = null;

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
                    data: props.chartData, // Expects an array of { x, y } objects
                    backgroundColor: "black",
                    pointRadius: 4, // Change this value to adjust the point size
                    pointHoverRadius: 8, // Optional: Change hover effect size
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: "Scatter Plot", // Chart Title
                },
            },
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: "X Axis Label", // X Axis Label
                        font: { size: 14 },
                    },
                },
                y: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "Y Axis Label", // Y Axis Label
                        font: { size: 14 },
                    },
                },
            },
        },
    });
};

onMounted(createChart);
watch(() => props.chartData, createChart, { deep: true });
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
