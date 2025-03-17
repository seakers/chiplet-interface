<template>
    <div class="slider-container">
        <label>{{ label }}</label>
        <input type="range" :min="min" :max="max" :step="step" v-model="sliderValue"
            @input="$emit('update:modelValue', sliderValue)" />
        <span>{{ sliderValue }}</span>
    </div>
</template>

<script>
import "../assets/styles.css";

export default {
    props: {
        label: String,
        modelValue: Number,
        min: {
            type: Number,
            default: 0
        },
        max: {
            type: Number,
            default: 100
        },
        step: {
            type: Number,
            default: 1
        }
    },
    data() {
        return {
            sliderValue: this.modelValue
        };
    },
    watch: {
        modelValue(newValue) {
            this.sliderValue = newValue;
        }
    }
};
</script>

<style>
.slider-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 10px;
}

/* input[type="range"] {
    width: 300px;
    color: var(--primary-color);
    background: var(--primary-color);
} */

/* Custom slider styles */
input[type="range"] {
    appearance: none;
    width: 100%;
    width: 300px;
    height: 6px;
    border-radius: 5px;
    background: var(--primary-color);
    /* Use CSS variable */
    outline: none;
    opacity: 0.9;
    transition: 0.3s;
    margin: 10px;
}

/* Change color on hover */
input[type="range"]:hover {
    opacity: 1;
}

/* Custom styling for the slider thumb (circle) */
input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: black;
    /* Thumb color */
    cursor: pointer;
    transition: 0.3s;
}
</style>