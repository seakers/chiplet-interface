<template>
  <div class="app-container">
    <aside class="sidebar">
      <Sidebar :openWindows="openWindows" @select="handleSidebarSelect" />
    </aside>
    <main class="main-content">
      <header class="app-header">
        <h1>Chiplet Design Analysis</h1>
      </header>
      <div class="plot-container">
        <Plot ref="Plot" :isEvaluatingDesign="isEvaluatingDesign" @point-message="SendMessageWithPoint" @open-modify-design="handleOpenModifyDesign" />
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
              </div>
              <button class="close-btn" @click="openWindows[element] = false">×</button>
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
                v-on="element === 'modify-design' ? { 'evaluate-modified-design': handleEvaluateModifiedDesign, 'send-to-chat': handleSendToChat } : {}"
              />
            </div>
          </template>
        </Draggable>
      </div>
    </main>
    <aside class="chat-panel">
      <Chat ref="Chat" :chatOpen="true" />
    </aside>
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
import RuleMining from "./components/RuleMining.vue";
import DistanceCorrelation from "./components/DistanceCorrelation.vue";
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
    RuleMining,
    DistanceCorrelation,
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
      GAisRunning: false,
      isEvaluatingDesign: false,
      openWindows: {
        ga: false,
        chiplet: false,
        'data-mining': false,
        'rule-mining': false,
        'distance-correlation': false,
        'modify-design': false,
      },
      windowOrder: ['ga', 'chiplet', 'rule-mining', 'distance-correlation'],
      windowTitles: {
        ga: 'Genetic Algorithm',
        chiplet: 'Chiplet Menu',
        'rule-mining': 'Rule Mining',
        'distance-correlation': 'Distance Correlation Study',
        'modify-design': 'Modify Design',
      },
      windowComponents: {
        ga: 'RunGA',
        chiplet: 'ChipletMenu',
        'rule-mining': 'RuleMining',
        'distance-correlation': 'DistanceCorrelation',
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
      this.isEvaluatingDesign = true;
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
        // Only update the plot after backend response
        const evaluated = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
        const currentData = this.$refs.Plot.getChartData();
        const newData = [...currentData, {
          x: evaluated.x,
          y: evaluated.y,
          gpu: design.GPU,
          attn: design.Attention,
          sparse: design.Sparse,
          conv: design.Convolution,
          trace: design.trace,
          xLabel: design.xLabel,
          yLabel: design.yLabel,
        }];
        this.$refs.Plot.updateChartData(newData);
        // Keep the Modify Design window open and update its X and Y values
        this.modifyDesignProps = {
          ...this.modifyDesignProps,
          x: evaluated.x,
          y: evaluated.y,
        };
      } catch (error) {
        console.error("Error evaluating modified design:", error);
      } finally {
        this.isEvaluatingDesign = false;
      }
    },
    handleSendToChat(design) {
      // Use the same logic as SendMessageWithPoint
      this.SendMessageWithPoint({
        x: design.x,
        y: design.y,
        gpu: design.GPU,
        attn: design.Attention,
        sparse: design.Sparse,
        conv: design.Convolution,
        trace: design.trace
      });
    },
  },
};
</script>

<style>
.app-container {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #f5f8ff;
  border-right: 2px solid #b3c6e0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  padding: 2rem 1rem;
  gap: 1rem;
  z-index: 2;
}

.main-content {
  flex: 1;
  padding: 16px 24px;
  overflow: auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #f9fafd;
  border-left: none;
}

.app-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 1rem;
  text-align: center;
  margin-bottom: 1rem;
}

.plot-container {
  width: 100%;
  max-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
  background: white;
  height: 400px;
  margin: 0 auto 1rem auto;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  box-sizing: border-box;
}

.windows-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 0;
  justify-content: flex-start;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.floating-window {
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(44, 62, 80, 0.10);
  max-width: 340px;
  min-width: 220px;
  width: 100%;
  padding: 0 0 1rem 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  vertical-align: top;
  margin-bottom: 1rem;
  box-sizing: border-box;
  position: relative;
}

.chat-panel {
  width: 300px;
  flex-shrink: 0;
  background: #f5f8ff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  z-index: 2;
  padding: 0;
}

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
  grid-template-columns: 160px 1fr minmax(200px, 18vw);
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow-x: hidden;
}

.chat-sidebar {
  width: 100%;
  min-width: 200px;
  max-width: 320px;
  background: #f5f8ff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  z-index: 2;
}

.main-content {
  display: flex;
  flex-direction: column;
  padding: 1rem 0.5rem 1rem 0.5rem;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}

.plot-container {
  width: 100%;
  max-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
  background: white;
  height: 400px;
  margin: 0 auto 1rem auto;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  box-sizing: border-box;
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
  display: none;
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
  gap: 1rem;
  flex-wrap: wrap;
  margin: 0;
  justify-content: flex-start;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.floating-window {
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(44, 62, 80, 0.10);
  max-width: 340px;
  min-width: 220px;
  width: 100%;
  padding: 0 0 1rem 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  vertical-align: top;
  margin-bottom: 1rem;
  box-sizing: border-box;
}

.window-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e6ed;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 600;
  font-size: 1rem;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
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

.window {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin: 1rem;
  flex: 1;
  min-width: 400px;
  max-width: 800px;
  height: calc(100vh - 2rem);
  overflow-y: auto;
}

.window[data-window="Rule Mining"],
.window[data-window="Distance Correlation Study"] {
  max-width: 1600px;
}
</style>
