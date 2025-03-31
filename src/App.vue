<template>
  <div id="app">
    <div id="title-div">
      <h1>{{ title }}</h1>
    </div>

    <div id="main-container">
      <!-- Left Column (Sliders) -->
      <div id="left-column">
        <!-- <button id="run-ga" @click="RunGAMain">
          Run GA
        </button> -->
        <RunGA ref="RunGA" @run-ga="RunGAMain" :isRunning="GAisRunning" />
        <!-- <Slider :label="filter1" v-model="filterA" />
        <Slider :label="filter2" v-model="filterB" /> -->
        <button @click="evaluate_design" style="margin: 5px;">Evaluate Design</button>
        <DragDrop ref="DragDrop" />
      </div>

      <!-- Middle Column (Plot) -->
      <div id="middle-column">
        <div id="plot-container">
          <Plot ref="Plot" @point-message="SendMessageWithPoint"/>
        </div>
      </div>

      <!-- Right Column (Chat) -->
      <div id="right-column">
        <button id="chat-toggle" @click="toggleChat">
          {{ chatOpen ? "Close Chat" : "Open Chat" }}
        </button>
        <Chat v-show="chatOpen" ref="Chat" :chatOpen="chatOpen" @toggle-chat="toggleChat" />
      </div>
    </div>
    <div id="second-container">
      <!-- <button @click="evaluate_design" style="margin: 5px;">Evaluate Design</button>
      <DragDrop ref="DragDrop" /> -->
    </div>
  </div>
</template>


<script>
import axios from "axios";
import RunGA from './components/RunGA.vue';
import Slider from "./components/Slider.vue";
import Plot from "./components/Plot.vue";
import Chat from "./components/Chat.vue";
import DragDrop from "./components/DragDrop.vue";
import "./assets/styles.css";

export default {
  components: {
    RunGA,
    Slider,
    Plot,
    Chat,
    DragDrop,
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
      GAisRunning: false,
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
    async RunGAMain() {
      this.GAisRunning = true;
      try {
        const gaData = await this.$refs.RunGA.callGABackend();
        console.log("DATA MAIN")
        console.log(gaData)
        this.$refs.Plot.updateChartData(gaData);
      } catch (error) {
        console.error("Error running GA:", error);
      } finally {
        this.GAisRunning = false;
      }
    },
    async SendMessageWithPoint(dataPoint) {
      // UPDATE THIS TO SEND A MESSAGE
      const message = `Tell me about: ${dataPoint.x}, ${dataPoint.y}`;

      // Open the chat if it's not already open
      if (!this.chatOpen) {
        this.chatOpen = true;
        // Wait for Chat component to be mounted and $refs.Chat to exist
        await this.$nextTick();
      }

      this.$refs.Chat.chatMessage = message;
      this.$refs.Chat.sendMessage();

      // this.$refs.Chat.messages.push({ text: `GA Data: ${x}, ${y} `, sender: "user" });
      // this.$refs.Chat.sendMessage(); // maybe this way?
    },
    async evaluate_design() {
      try {
        const eval_data = await this.$refs.DragDrop.evaluate_point();
        console.log("Design evaluation confirmed.");
        this.$refs.Plot.updateChartData(eval_data);
      } catch (error) {
        console.error("Error confirming design evaluation:", error);
      }
    },
  },
};
</script>

<style>
/* General App Styling */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  height: 100%;
  /* Full height */
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
  align-items: stretch;
  /* Make all columns the same height */
  border-top: 3px solid var(--primary-color);
  border-bottom: 3px solid var(--primary-color);
}

/* Three-column layout */
#second-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 5px;
}

/* Left Column - Sliders */
#left-column {
  width: 25%;
  /* Reduce width to give more space to the middle */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

/* Middle Column - Plot */
#middle-column {
  width: 50%;
  /* Make the middle section larger */
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--background-color);
  outline: 3px solid var(--primary-color);
  padding: 20px;
}

/* Right Column - Chat */
#right-column {
  width: 25%;
  /* Reduce width */
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Adjust Plot Size */
#plot-container {
  width: 800px;
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
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
