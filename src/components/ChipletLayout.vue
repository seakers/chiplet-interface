<template>
    <div class="chiplet-layout">
        <div v-for="(color, index) in chipletColors" :key="index" class="chiplet" :style="{ backgroundColor: color }">
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    chipletColors: {
        type: Array,
        required: true,
    },
});
</script>

<style scoped>
.chiplet-layout {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    background-color: #2d2d2d;
    padding: 8px;
    border-radius: 3px;
    width: 100%;
    box-sizing: border-box;
}

.chiplet {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 3px;
}
</style>