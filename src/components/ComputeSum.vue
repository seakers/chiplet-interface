<template>
    <div>
        <input type="number" v-model.number="num1" placeholder="Number 1">
        <input type="number" v-model.number="num2" placeholder="Number 2">
        <button @click="fetchSum">Compute Sum</button>

        <div v-if="sumResult !== null">
            Sum: {{ sumResult }}
        </div>
    </div>
</template>

<script>
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
        fetchSum() {
            axios.get('http://127.0.0.1:8000/api/compute-sum/', {
                params: {
                    num1: this.num1,
                    num2: this.num2
                }
            })
                .then(response => {
                    this.sumResult = response.data.result;
                })
                .catch(error => {
                    console.error("Error fetching sum:", error);
                    this.sumResult = 'Error fetching sum';
                });
        }
    }
};
</script>