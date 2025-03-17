import { createStore } from "vuex";
import axios from "axios";

export default createStore({
  state: {
    count: 10,
    scatterData: [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 5 },
      { x: 5, y: 6 },
    ], // Store scatter plot data
  },
  getters: {
    getScatterData: (state) => state.scatterData, // Getter for scatter data
  },
  mutations: {
    add(state) {
      state.count++;
    },
    subtract(state) {
      state.count--;
    },
    setScatterData(state, data) {
      state.scatterData = data; // Update scatter data
    },
  },
  actions: {
    callWithDelay(context) {
      setTimeout(() => {
        context.commit("add");
      }, 1000);
    },
    async fetchScatterData({ commit }) {
      try {
        const response = await axios.get("/api/get_scatter_data"); // Fetch data from backend
        commit("setScatterData", response.data); // Store data in Vuex
      } catch (error) {
        console.error("Error fetching scatter data:", error);
      }
    },
  },
  modules: {},
});
