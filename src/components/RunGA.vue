<template>
    <div>
        <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <div>
                <label for="population">Population</label><br>
                <input id="population" type="number" v-model.number="pop_size" placeholder="Example: 10">
            </div>
            <div>
                <label for="generations">Generations</label><br>
                <input id="generations" type="number" v-model.number="n_gen" placeholder="Example: 5">
            </div>
        </div>
        <div style="margin-top: 1rem;">
            <label for="chiplet-type">Trace</label><br>
            <select id="chiplet-type" v-model="selectedTrace">
                <!-- <option disabled value="">Select a chiplet</option> -->
                <option v-for="item in traceOptions" :key="item" :value="item">
                    {{ item }}
                </option>
            </select>
        </div>
        <button @click="$emit('run-ga')" :disabled="isRunning" style="margin-top: 1rem;">Run GA</button>
    </div>
</template>

<script>
import { ref } from "vue";
import axios from 'axios';

export default {
    props: {
        isRunning: {
            type: Boolean,
            default: false,
        }
    },
    data() {
        return {
            pop_size: 0,
            n_gen: 0,
            sumResult: null,
            selectedTrace: "",
            traceOptions: ["gpt-j-65536-weighted", "gpt-j-1024-weighted", "sd-test", "ogbn-products-test", "resnet50-test"],
        };
    },
    methods: {
        async callGABackend() {
            try {
                const response = await axios.get("http://127.0.0.1:8000/api/chart-data/", {
                    params: {
                        pop_size: this.pop_size,
                        n_gen: this.n_gen,
                        trace: this.selectedTrace,
                    }
                });
                console.log("RESPONSE DATA")
                console.log(response.data.data)
                return response.data.data
            } catch (error) {
                console.error("Error fetching chart data:", error);
            }
        }
    },

};
</script>