<template>
    <div class="drag-drop-container">
        <div class="item-menu">
            <h3>Chiplet Menu</h3>
            <div v-for="item in items" :key="item" class="draggable" draggable="true" @dragstart="onDragStart(item)">
                {{ item }}
            </div>
        </div>

        <div class="drop-zone" @dragover.prevent @drop="onDrop">
            <h3>Drop Box</h3>
            <div v-if="dropItems.length === 0" class="empty-placeholder">Drop chiplets here</div>
            <div v-for="(item, index) in dropItems" :key="index" class="dropped-item">
                {{ item }}
            </div>
        </div>
    </div>
</template>

<script>
import { ref } from "vue";
import axios from 'axios';

export default {
    data() {
        return {
            items: ["Attention", "Convolution", "GPU", "Sparse"],
            dropItems: [],
            draggingItem: null,
        };
    },
    methods: {
        onDragStart(item) {
            this.draggingItem = item;
        },
        onDrop() {
            if (this.draggingItem) {
                this.dropItems.push(this.draggingItem);
                this.draggingItem = null;
            }
        },
        async evaluate_point() {
            try {
                console.log("In Confirm")
                console.log(this.dropItems)
                const response = await axios.get("http://127.0.0.1:8000/api/evaluate-point/", {
                    params: {
                        chiplets: this.dropItems,
                        trace: "gpt-j-65536-weighted",
                    }
                });
                console.log("EVAL DATA")
                console.log(response.data.data)
                return response.data.data;
            } catch (error) {
                console.error("Error evaluating design: ", error)
            }
            // this.dropItems = [];
            // You can also emit or send this to a backend
            // this.$emit("confirm-order", this.dropItems);
        },
    },
};
</script>

<style scoped>
.drag-drop-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 20px;
}

.item-menu {
    border: 1px solid #ccc;
    padding: 10px;
    width: 300px;
}

.draggable {
    padding: 10px;
    margin: 5px 0;
    background: #f0f0f0;
    cursor: grab;
    border: 1px solid #bbb;
    border-radius: 4px;
}

.drop-zone {
    border: 2px dashed #aaa;
    padding: 20px;
    width: 300px;
    min-height: 100px;
    background: #fafafa;
    text-align: center;
}

.empty-placeholder {
    color: #aaa;
}

.dropped-item {
    padding: 8px;
    background: #cce5ff;
    margin: 4px 0;
    border-radius: 3px;
}
</style>