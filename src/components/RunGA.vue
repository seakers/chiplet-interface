<template>
    <div>
        <input type="number" v-model.number="num1" placeholder="Number 1">
        <input type="number" v-model.number="num2" placeholder="Number 2">
    </div>
</template>

<script>
import { ref } from "vue";
import axios from 'axios';

export default {
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
    }
};
</script>