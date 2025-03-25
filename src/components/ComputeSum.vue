<template>
    <div>
        <input type="number" v-model.number="num1" placeholder="Number 1">
        <input type="number" v-model.number="num2" placeholder="Number 2">
        <button @click="fetchSum">Run GA</button>

        <div v-if="sumResult !== null">
            Sum: {{ sumResult }}
        </div>
    </div>
</template>

<script>
import { ref } from "vue";
import axios from 'axios';
import Plot from "./Plot.vue";

export default {
    components: {
        Plot
    },
    data() {
        return {
            num1: 0,
            num2: 0,
            sumResult: null,
            scatterPlotRef: ref(null)
        };
    },
    methods: {
        fetchSum() {
            try {
                const response = axios.get("http://127.0.0.1:8000/api/chart-data/", {
                    params: {
                        num1: this.num1,
                        num2: this.num2
                    }
                });
                newData = response.data.data;
                updateChartData(newData)
            } catch (error) {
                console.error("Error fetching chart data:", error);
                return [];
            }
        }
    }
};
</script>