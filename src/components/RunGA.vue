<template>
    <div>
        <input type="number" v-model.number="num1" placeholder="Population Size">
        <input type="number" v-model.number="num2" placeholder="Number of Generations">
        <button @click="fetchSum" :disabled="isRunning">Run GA</button>
    </div>
</template>

<script>
import axios from 'axios';


export default {
    data() {
        return {
            num1: 0,
            num2: 0,
            isRunning: false, // Prevent automatic execution
        };
    },
    methods: {
        async fetchSum() {
            if (this.isRunning) return; // Prevent duplicate execution
            this.isRunning = true;

            try {
                const response = await axios.get('http://127.0.0.1:8000/api/chart-data/', {
                    params: { num1: this.num1, num2: this.num2 }
                });

                console.log("GA run completed:", response.data);
                this.$emit("onRunGA"); // Notify parent to update Plot
            } catch (error) {
                console.error("Error running GA:", error);
            } finally {
                this.isRunning = false; // Allow re-running after completion
            }
        }
    }
};
</script>
