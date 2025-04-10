<template>
    <div class="chiplet-menu">
        <h3>Chiplet Menu</h3>
        <div class="input-group" v-for="(value, key) in inputs" :key="key">
            <label :for="key">{{ key }}</label>
            <input type="number" :id="key" v-model.number="inputs[key]" min="0" max="12" />
        </div>
        <button :disabled="!isSumValid || isRunning" @click="emitDesign">Evaluate Design</button>
        <p v-if="!isSumValid" class="warning">Total must sum to 12, there are {{ total }}</p>
    </div>
</template>

<script>
import axios from 'axios';

export default {
    data() {
        return {
            inputs: {
                Attention: 0,
                GPU: 0,
                Sparse: 0,
                Convolution: 0,
            },
            isRunning: false,
        };
    },
    computed: {
        total() {
            return Object.values(this.inputs).reduce((acc, val) => acc + val, 0);
        },
        isSumValid() {
            return this.total === 12;
        },
    },
    methods: {
        emitDesign() {
            this.$emit("evaluate-chiplet");
        },
        async evaluate_point_input() {
            this.isRunning = true;
            try {
                console.log("In Confirm")
                console.log(this.inputs)
                const response = await axios.get("http://127.0.0.1:8000/api/evaluate-point-inputs/", {
                    params: {
                        ...this.inputs,
                        trace: "gpt-j-65536-weighted",
                    }
                });
                console.log("EVAL DATA")
                console.log(response.data.data)
                return response.data.data;
            } catch (error) {
                console.error("Error evaluating design: ", error)
            } finally {
                this.isRunning = false;
            }
        },
    },
};
</script>

<style scoped>
.chiplet-menu {
    border: 3px solid var(--primary-color);
    border-radius: 10px;
    padding: 20px;
    width: 250px;
    margin-top: 20px;
}

.input-group {
    display: flex;
    flex-direction: row;
    margin-bottom: 10px;
    justify-content: space-between;
}

.warning {
    color: red;
    font-size: 0.8em;
}

button {
    margin-top: 10px;
    padding: 6px 12px;
}
</style>