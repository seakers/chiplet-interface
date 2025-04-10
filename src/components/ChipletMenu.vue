<template>
    <div class="chiplet-menu">
        <h3>Chiplet Menu</h3>
        <div class="input-group" v-for="(value, key) in inputs" :key="key">
            <!-- <label :for="key">{{ key }}</label> -->
            <label :for="key">
                <span class="color-box" :style="{ backgroundColor: colorMap[key] }"></span>
                {{ key }}
            </label>
            <input type="number" :id="key" v-model.number="inputs[key]" min="0" max="12" />
        </div>
        <button :disabled="!isSumValid || isRunning" @click="emitDesign">Evaluate Design</button>
        <p v-if="!isSumValid" class="warning">Total must sum to 12, there are {{ total }}</p>
        <div :style="{ paddingTop: isSumValid ? '10px' : '0' }" class="layout-box">
            <ChipletLayout :chipletColors="chipletColors" />
        </div>
    </div>
</template>

<script>
import axios from 'axios';
import ChipletLayout from "./ChipletLayout.vue";

export default {
    components: {
        ChipletLayout,
    },
    data() {
        return {
            inputs: {
                Attention: 0,
                GPU: 0,
                Sparse: 0,
                Convolution: 0,
            },
            isRunning: false,
            chipletColors: [
                "#9e9e9e", "#9e9e9e", "#9e9e9e", "#9e9e9e", "#9e9e9e", "#9e9e9e",
                "#9e9e9e", "#9e9e9e", "#9e9e9e", "#9e9e9e", "#9e9e9e", "#9e9e9e"
            ],
            colorMap: {
                Attention: "#f8cd42",
                GPU: "#8fbf80",
                Sparse: "#70adcd",
                Convolution: "#f7a42f",
                Default: "#9e9e9e"
            },
        };
    },
    computed: {
        total() {
            return Object.values(this.inputs).reduce((acc, val) => acc + val, 0);
        },
        isSumValid() {
            return this.total === 12;
        },
        chipletColors() {
            const colors = [];
            const colorEntries = Object.entries(this.inputs);

            if (this.total > 12) {
                return Array(12).fill(this.colorMap.Default);
            }

            for (const [type, count] of colorEntries) {
                const color = this.colorMap[type];
                for (let i = 0; i < count; i++) {
                    colors.push(color);
                }
            }

            // Fill remaining spots with gray
            while (colors.length < 12) {
                colors.push(this.colorMap.Default);
            }

            // Interleave colors
            const order = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11];
            const interleavedColors = order.map(i => colors[i]);

            return interleavedColors.slice(0, 12);
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

.color-box {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-right: 6px;
    vertical-align: middle;
    border-radius: 2px;
    border: 1px solid #ccc;
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