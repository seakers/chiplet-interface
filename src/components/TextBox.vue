<template>
    <div class="card text-center shadow-lg p-4 mb-4 bg-light rounded d-flex flex-column align-items-center">
        <div class="card-body text-center">
            <p class="card-text text-primary font-weight-bold">{{ text }}</p>
            <div class="d-flex justify-content-center mt-3 w-100">
                <input v-model="inputValue" type="text" class="form-control me-2 text-center"
                    placeholder="Enter text..." style="max-width: 300px;">
                <button @click="submit" class="btn btn-primary">Submit</button>
            </div>
        </div>
    </div>
</template>

<script>
import "../assets/styles.css";

export default {
    props: {
        text: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            inputValue: ""
        };
    },
    methods: {
        submit() {
            this.$emit('submit', this.inputValue);
            this.inputValue = "";
        }
    }
};
</script>

<style>
.card {
    max-width: 500px;
    margin: auto;
    font-size: 18px;
    font-weight: bold;
    color: #333;
}

.d-flex {
    display: flex;
    align-items: center;
}

.justify-content-center {
    justify-content: center;
}

.text-center {
    text-align: center;
}

.me-2 {
    margin-right: 10px;
}
</style>