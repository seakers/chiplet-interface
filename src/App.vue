<template>
  <div id="app">
    <div id="title-div">
      <h1>{{ title }}</h1>
    </div>

    <div id="main-container">
      <!-- Left Column (Sliders) -->
      <div id="left-column">
        <ComputeSum />
        <Slider :label="filter1" v-model="filterA" />
        <Slider :label="filter2" v-model="filterB" />
      </div>

      <!-- Middle Column (Plot) -->
      <div id="middle-column">
        <div id="plot-container">
          <Plot />
        </div>
      </div>

      <!-- Right Column (Chat) -->
      <div id="right-column">
        <button id="chat-toggle" @click="toggleChat">
          {{ chatOpen ? "Close Chat" : "Open Chat" }}
        </button>
        <Chat v-if="chatOpen" :chatOpen="chatOpen" @toggle-chat="toggleChat" />
      </div>
    </div>

    <p>{{ status }}</p>
  </div>
</template>


<script>
import axios from "axios";
import ComputeSum from './components/ComputeSum.vue';
import Slider from "./components/Slider.vue";
import Plot from "./components/Plot.vue";
import Chat from "./components/Chat.vue";
import "./assets/styles.css";

export default {
  components: {
    ComputeSum,
    Slider,
    Plot,
    Chat,
  },
  data() {
    return {
      title: "Chiplet Design Analysis",
      filterA: [0, 100],
      filterB: [0, 100],
      nStack: null,
      tsvPitch: null,
      status: "",
      filter1: "Latency (ns)",
      filter2: "W3d (ns)",
      chatOpen: false, // Chat visibility state
    };
  },
  methods: {
    submit() {
      this.status = "Processing... Results will be updated soon!";
      axios
        .post("/api/run_hisim_analysis", {
          N_stack: this.nStack,
          tsv_pitch: this.tsvPitch,
        })
        .then((response) => {
          this.status = response.data.message;
        })
        .catch((error) => {
          console.error("Error running analysis:", error);
          this.status = "An error occurred.";
        });
    },
    toggleChat() {
      this.chatOpen = !this.chatOpen;
    },
  },
};
</script>

<style>
/* General App Styling */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  height: 100%; /* Full height */
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

#title-div {
  height: 100px;
}

/* Three-column layout */
#main-container {
  display: flex;
  align-items: stretch; /* Make all columns the same height */
  border-top: 3px solid var(--primary-color);
  border-bottom: 3px solid var(--primary-color);
}

/* Left Column - Sliders */
#left-column {
  width: 20%; /* Reduce width to give more space to the middle */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px;
}

/* Middle Column - Plot */
#middle-column {
  width: 60%; /* Make the middle section larger */
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--background-color);
  padding: 20px;
}

/* Right Column - Chat */
#right-column {
  width: 20%; /* Reduce width */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

/* Adjust Plot Size */
#plot-container {
  width: 800px;
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Button to Open Chat */
#chat-toggle {
  position: absolute;
  top: 10px;
  right: 20px;
  padding: 10px 15px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

/* Flexbox layout for Filters & Plot */
#filters-plot {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-left: 60px;
  padding-right: 60px;
}

/* Sliders (Left Side) */
#filters {
  display: flex;
  flex-direction: column;
  gap: 30px;
  width: 20%;
}
</style>
