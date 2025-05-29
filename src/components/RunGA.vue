<template>
    <div>
        <form class="ga-form">
            <div class="ga-row">
                <div class="ga-field">
                    <label for="population">Population</label>
                    <input id="population" type="number" v-model.number="pop_size" placeholder="Example: 10">
                </div>
                <div class="ga-field">
                    <label for="generations">Generations</label>
                    <input id="generations" type="number" v-model.number="n_gen" placeholder="Example: 5">
                </div>
            </div>
            <div class="ga-section ga-trace-section">
                <label for="chiplet-type" class="ga-trace-label">Trace</label>
                <select id="chiplet-type" v-model="selectedTrace" class="ga-trace-select">
                    <!-- <option disabled value="">Select a chiplet</option> -->
                    <option v-for="item in traceOptions" :key="item" :value="item">
                        {{ item }}
                    </option>
                </select>
            </div>
            <div class="ga-section">
                <button 
                  @click.prevent="handleRunGA"
                  :disabled="isRunning"
                  :class="['minimal-btn', { 'clicked': buttonClicked }]"
                >Run GA</button>
            </div>
        </form>
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
            buttonClicked: false,
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
        },
        handleRunGA() {
            this.buttonClicked = true;
            this.$emit('run-ga');
            setTimeout(() => {
                this.buttonClicked = false;
            }, 1000);
        }
    },

};
</script>

<style scoped>
.ga-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
}
.ga-row {
    display: flex;
    gap: 1rem;
    width: 100%;
    justify-content: center;
}
.ga-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-width: 140px;
    width: 100%;
}
.ga-section {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    width: 100%;
}
.ga-trace-section {
    align-items: center;
    width: 100%;
}
.ga-trace-label {
    text-align: center;
    font-weight: 500;
    margin-bottom: 0.2rem;
    width: 100%;
}
.ga-trace-select {
    width: 100%;
    max-width: 290px;
    min-width: 140px;
    padding: 0.4rem 0.7rem;
    border: 1px solid #b3c6e0;
    border-radius: 4px;
    font-size: 1rem;
    margin-top: 0.2rem;
}
.ga-btn {
    width: 100%;
    max-width: 160px;
    padding: 0.6rem 0;
    border-radius: 5px;
    border: 1px solid #b3c6e0;
    background: #337aff;
    color: white;
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s;
    margin-top: 1rem;
}
.ga-btn:disabled {
    background: #b3c6e0;
    cursor: not-allowed;
}
.ga-btn:hover:enabled {
    background: #2356b8;
}
input {
    padding: 0.4rem 0.7rem;
    border: 1px solid #b3c6e0;
    border-radius: 4px;
    font-size: 1rem;
    width: 100%;
    max-width: 140px;
}
label {
    font-weight: 500;
    margin-bottom: 0.2rem;
}
.minimal-btn.clicked {
    background: #ff9800 !important;
    color: #fff !important;
    border-color: #ff9800 !important;
}
</style>