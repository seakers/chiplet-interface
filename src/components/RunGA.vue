<template>
    <div>
        <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <div>
                <label for="population">Population</label><br>
                <input
                    id="population"
                    type="number"
                    v-model.number="num1"
                    placeholder="Example: 10"
                >
            </div>
            <div>
                <label for="generations">Generations</label><br>
                <input
                    id="generations"
                    type="number"
                    v-model.number="num2"
                    placeholder="Example: 5"
                >
            </div>
        </div>
        <button @click="$emit('run-ga')" :disabled="isRunning" style="margin-top: 1rem">Run GA</button>
    </div>
</template>

<script>
import { ref } from "vue";
import axios from 'axios';

export default {
    props: {
        isRunning: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            num1: 0,
            num2: 0,
            sumResult: null,
        };
    },
    methods: {
        async callGABackend() {
            try {
                const response = await axios.get("http://127.0.0.1:8000/api/chart-data/", {
                    params: {
                        num1: this.num1,
                        num2: this.num2
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