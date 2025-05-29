<template>
  <div id="app">
    <header class="app-header">
      <h1>Chiplet Design Analysis</h1>
    </header>
    <div class="app-layout">
      <Sidebar :openWindows="openWindows" @select="handleSidebarSelect" />
      <div class="main-content">
        <div class="plot-container">
          <Plot ref="Plot" @point-message="SendMessageWithPoint" @open-modify-design="handleOpenModifyDesign" />
        </div>
        <div class="windows-row">
          <Draggable
            v-model="windowOrder"
            class="windows-row"
            :options="{animation:150, direction:'horizontal'}"
            :itemKey="element"
          >
            <template #item="{element}">
              <div v-if="openWindows[element]" class="floating-window">
                <div class="window-header">
                  <span>{{ windowTitles[element] }}</span>
                  <button class="close-btn" @click="openWindows[element] = false">×</button>
                </div>
                <component
                  v-if="element === 'ga'"
                  :is="windowComponents[element]"
                  ref="RunGA"
                  v-on="{ 'run-ga': RunGAMain }"
                />
                <component
                  v-else
                  :is="windowComponents[element]"
                  v-bind="element === 'modify-design' ? modifyDesignProps : {}"
                  v-on="element === 'modify-design' ? { 'evaluate-modified-design': handleEvaluateModifiedDesign } : {}"
                />
              </div>
            </template>
          </Draggable>
        </div>
        <button id="chat-toggle" @click="toggleChat">
          {{ chatOpen ? "Close Chat" : "Open Chat" }}
        </button>
        <Chat v-show="chatOpen" ref="Chat" :chatOpen="chatOpen" @toggle-chat="toggleChat" />
      </div>
    </div>
  </div>
</template>


<script>
import axios from "axios";
import Sidebar from './components/Sidebar.vue';
import RunGA from './components/RunGA.vue';
import Slider from "./components/Slider.vue";
import Plot from "./components/Plot.vue";
import Chat from "./components/Chat.vue";
import DragDrop from "./components/DragDrop.vue";
import ChipletMenu from "./components/ChipletMenu.vue";
import DataMining from "./components/DataMining.vue";
import Draggable from 'vuedraggable'
import ModifyDesignMenu from './components/ModifyDesignMenu.vue';
import "./assets/styles.css";

export default {
  components: {
    Sidebar,
    RunGA,
    Slider,
    Plot,
    Chat,
    DragDrop,
    ChipletMenu,
    DataMining,
    Draggable,
    ModifyDesignMenu
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
      openWindows: {
        ga: false,
        chiplet: false,
        'data-mining': false,
        'modify-design': false,
      },
      windowOrder: ['ga', 'chiplet', 'data-mining'],
      windowTitles: {
        ga: 'Genetic Algorithm',
        chiplet: 'Chiplet Menu',
        'data-mining': 'Data Mining',
        'modify-design': 'Modify Design',
      },
      windowComponents: {
        ga: 'RunGA',
        chiplet: 'ChipletMenu',
        'data-mining': 'DataMining',
        'modify-design': 'ModifyDesignMenu',
      },
      modifyDesignProps: null,
    };
  },
  computed: {
    openWindowList() {
      // Return an array of open window keys in the current order
      return this.windowOrder.filter(key => this.openWindows[key])
    }
  },
  methods: {
    handleSidebarSelect(selected) {
      this.openWindows[selected] = !this.openWindows[selected];
    },
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
      const exe = dataPoint.x
      const energy = dataPoint.y
      const gpu = dataPoint.gpu
      const attn = dataPoint.attn
      const sparse = dataPoint.sparse
      const conv = dataPoint.conv

      // Open the chat if it's not already open
      
      if (!this.chatOpen) {
        this.chatOpen = true;
        // Wait for Chat component to be mounted and $refs.Chat to exist
        await this.$nextTick();
      }
      this.$refs.Chat.gettingData = true

      await axios.get('http://127.0.0.1:8000/api/add-info/',
        {
          params: {
            exe: exe,
            energy: energy,
            gpu: gpu,
            attn: attn,
            sparse: sparse,
            conv: conv
          }
        }
      );

      const message = `I have received context on this design! I am ready to answer questions about it.`;

      this.$refs.Chat.gettingData = false
      this.$refs.Chat.chatMessage = message;
      this.$refs.Chat.assistantMessage();

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
    async evaluate_design_input() {
      try {
        const eval_data = await this.$refs.ChipletMenu.evaluate_point_input();
        console.log("Design evaluation confirmed.");
        this.$refs.Plot.updateChartData(eval_data);
      } catch (error) {
        console.error("Error confirming design evaluation:", error);
      }
    },
    handleOpenModifyDesign(data) {
      // Only one ModifyDesignMenu at a time
      this.openWindows['modify-design'] = true;
      this.modifyDesignProps = data;
      // Ensure it's the first window
      if (!this.windowOrder.includes('modify-design')) {
        this.windowOrder = ['modify-design', ...this.windowOrder];
      } else {
        this.windowOrder = ['modify-design', ...this.windowOrder.filter(w => w !== 'modify-design')];
      }
    },
    async handleEvaluateModifiedDesign(design) {
      try {
        // Call backend to get evaluated x/y for the new design
        const response = await axios.get("http://127.0.0.1:8000/api/evaluate-point-inputs/", {
          params: {
            GPU: design.GPU,
            Attention: design.Attention,
            Sparse: design.Sparse,
            Convolution: design.Convolution,
            trace: design.trace,
          }
        });
        // Assume response.data.data is an array with one point, or a single point object
        const evaluated = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
        const newPoint = {
          x: evaluated.x,
          y: evaluated.y,
          gpu: design.GPU,
          attn: design.Attention,
          sparse: design.Sparse,
          conv: design.Convolution,
          trace: design.trace,
          xLabel: design.xLabel,
          yLabel: design.yLabel,
        };
        const currentData = this.$refs.Plot.getChartData();
        const newData = [...currentData, newPoint];
        this.$refs.Plot.updateChartData(newData);
        // Keep the Modify Design window open and update its X and Y values
        this.modifyDesignProps = {
          ...this.modifyDesignProps,
          x: evaluated.x,
          y: evaluated.y,
        };
        // Do NOT show a popup for the new point
      } catch (error) {
        console.error("Error evaluating modified design:", error);
      }
    },
  },
};
</script>

<style>
.app-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 1rem;
  text-align: center;
}

.app-header h1 {
  margin: 0;
  font-size: 1.75rem;
  color: #2c3e50;
}

.app-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100vh;
  width: 100%;
  position: relative;
}

.main-content {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.plot-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: white;
  max-width: 900px;
  max-height: 600px;
  margin: 2rem auto 1rem auto;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

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

.windows-row {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  margin: 2rem 0 0 0;
  margin-left: 2.5rem;
  justify-content: flex-start;
  width: 100%;
}

.floating-window {
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(44, 62, 80, 0.10);
  max-width: 420px;
  min-width: 320px;
  width: 100%;
  padding: 0 0 1.5rem 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  vertical-align: top;
  margin-bottom: 2rem;
  box-sizing: border-box;
}

.window-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e6ed;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 1.15rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0 0.5rem;
  line-height: 1;
}

.close-btn:hover {
  color: #343a40;
}

/* Add padding to window content */
.floating-window > *:not(.window-header) {
  padding: 1.25rem 1.5rem 0 1.5rem;
}

@media (max-width: 900px) {
  .windows-row {
    flex-direction: column;
    margin-left: 0;
    gap: 1rem;
  }
  .floating-window {
    max-width: 98vw;
    min-width: 0;
  }
}
</style>
