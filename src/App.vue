<template>
  <div>
    <Header @toggle-window="toggleWindow" :openWindows="openWindows" />
    <div class="main-content-wrapper">
      <div class="main-flex">
        <!-- LEFT COLUMN -->
        <div class="left-col">
          <!-- Fixed Problem Formulation Section -->
          <div class="problem-formulation-section">
            <ProblemFormulation 
              ref="ProblemFormulation"
              @optimization-success="handleOptimizationSuccess"
              @data-mining-complete="handleDataMiningComplete"
              @report-generated="handleReportGenerated"
              @run-id-updated="handleRunIdUpdated"
              @view-changed="handleViewChanged"
            />
          </div>
          
          <div class="explorer-section" v-if="!isComparativeAnalysisActive">
            <div class="explorer-header">
              <h2 class="explorer-title">📈 Design Space Explorer</h2>
              <!-- Zoom Controls -->
              <div class="zoom-controls">
                <button @click="zoomIn" class="zoom-btn" title="Zoom In">
                  Zoom In
                </button>
                <button @click="zoomOut" class="zoom-btn" title="Zoom Out">
                  Zoom Out
                </button>
                <button @click="resetZoom" class="zoom-btn reset" title="Reset Zoom">
                  Reset
                </button>
              </div>
            </div>
            <Plot 
              ref="Plot" 
              :isComparative="isComparative" 
              :currentRunId="currentRunId" 
              :customPoints="customPoints"
              @point-selected="handlePointSelected" 
              @point-hovered="handlePointHovered" 
            />
          </div>
          
          <!-- Design Visualizer Section -->
          <div class="design-visualizer-section" v-if="!isComparativeAnalysisActive">
            <DesignVisualizer 
              :hoveredPoint="hoveredPoint"
              :selectedPoint="selectedPoint"
              :customPoint="customPoint"
              @evaluate-design="handleEvaluateDesign"
              @point-selected="handlePointSelected"
              @point-hovered="handlePointHovered"
            />
          </div>
          
          <!-- Docked windows area: always rendered -->
          <div class="dock-area">
            <draggable v-model="dockOrder" :options="{animation:150, direction:'horizontal'}" class="dock-row">
              <template #item="{element}">
                <component
                  :is="element"
                  v-if="openWindows[element]"
                  @close="closeWindow(element)"
                  class="dock-window"
                  :closable="true"
                  :filePath="element === 'DataMining' ? currentFilePath : null"
                  v-on="element === 'DataMining' ? { 'send-insights-to-chat': handleSendInsightsToChat } :
                        element === 'RunManager' ? { 'plot-run': handlePlotRun, 'plot-runs': handlePlotRuns, 'show-comparison': handleShowComparison } : {}"
                />
              </template>
            </draggable>
          </div>
        </div>
        <!-- RIGHT COLUMN (Chat) -->
        <div class="right-col">
          <div class="chat-scroll-wrap">
            <Chat ref="Chat" :chatOpen="true" @highlighting-response="handleHighlightingResponse" @run-id-updated="handleRunIdUpdated" />
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Design Modal -->
    <CustomDesignModal
      ref="CustomDesignModal"
      v-if="showCustomDesignModal"
      :key="`custom-design-modal-${customDesignModalKey}`"
      @close="showCustomDesignModal = false"
      @submit="handleSubmitCustomDesign"
    />
  </div>
</template>


<script>
import Header from './components/Header.vue';
import ProblemFormulation from './components/ProblemFormulation.vue';
import DataMining from './components/DataMining.vue';
import RunManager from './components/RunManager.vue';
import Plot from './components/Plot.vue';
import Chat from './components/Chat.vue';
import CustomDesignModal from './components/CustomDesignModal.vue';
import draggable from 'vuedraggable';
import { evaluatePointInputs, integrateCustomPointToGA, saveCustomPointToDataset } from './services/evaluation.js';
import { addInsightsContext, getPointContext, addEnhancedInsightsContext } from './services/chat.js';
import { generateOptimizationReport } from './services/analytics.js';
import DesignVisualizer from './components/DesignVisualizer.vue';

export default {
  components: {
    Header,
    ProblemFormulation,
    DataMining,
    RunManager,
    Plot,
    Chat,
    CustomDesignModal,
    draggable,
    DesignVisualizer,
  },
  data() {
    return {
      openWindows: {
        DataMining: false,
        RunManager: false,
      },
      dockOrder: ['DataMining', 'RunManager'],
      isComparative: false,
      isComparativeAnalysisActive: false, // Track if comparative analysis is active
      showCustomDesignModal: false,
      customDesignModalKey: 0,
      currentRunId: '', // Track current run ID for plot polling
      hoveredPoint: null,
      selectedPoint: null,
      customPoints: [], // Store custom design points persistently
      customPoint: null, // Store the most recently created custom point for comparison
    };
  },
  computed: {
    currentFilePath() {
      // Check if this is a loaded run and return the temporary file path
      if (this.currentRunId && this.currentRunId.startsWith('loaded_run_')) {
        return `/Users/ramyagotika/research-work/chiplet/chiplet-server/api/Evaluator/cascade/chiplet_model/dse/results/temp_points_${this.currentRunId}.csv`;
      }
      return null;
    }
  },
  methods: {
    toggleWindow(window) {
      if (!this.openWindows[window]) {
        this.openWindows[window] = true;
      }
      // Move to front of dockOrder
      const idx = this.dockOrder.indexOf(window);
      if (idx !== -1) {
        this.dockOrder.splice(idx, 1);
        this.dockOrder.unshift(window);
      }
    },
    closeWindow(window) {
      this.openWindows[window] = false;
    },
    handleOptimizationSuccess(response) {
      console.log('=== handleOptimizationSuccess CALLED ===');
      console.log('Response received:', response);
      console.log('Stack trace:', new Error().stack);
      
      // Check if this is a comparative analysis result - more comprehensive detection
      const isComparativeAnalysis = response && (
        response.runA || 
        response.runB || 
        response.mining ||
        response.comparative_study ||
        response.run_a_id ||
        response.run_b_id ||
        response.run_a_points ||
        response.run_b_points ||
        (response.status === 'success' && (response.runA || response.runB || response.comparative_study))
      );
      
      if (isComparativeAnalysis) {
        console.log('This is a comparative analysis result - not updating plot');
        console.log('Comparative analysis response keys:', Object.keys(response || {}));
        // For comparative analysis, don't update the plot or clear custom points
        // The comparative results should be handled by the ComparativeStudy component
        return;
      }
      
      // Only clear custom points if this is actually a new optimization run
      // Check if response contains optimization data (not just chat responses)
      const isOptimizationRun = response && (
        response.data || 
        response.plot_data || 
        response.run_a_results || 
        response.run_b_results ||
        (response.status === 'success' && (response.data || response.plot_data))
      );
      
      if (isOptimizationRun) {
        console.log('This is a real optimization run - clearing custom points');
        
        // Check if this is a loaded run
        const isLoadedRun = response.loaded_from_backup;
        
        if (isLoadedRun) {
          // For loaded runs, set the flag to prevent polling from clearing the data
          if (this.$refs.Plot && this.$refs.Plot.setLoadedRunData) {
            this.$refs.Plot.setLoadedRunData(true);
            console.log('Set loaded run data flag to prevent polling from clearing data');
          }
        } else {
          // For new optimization runs, clear the flag and custom points
          if (this.$refs.Plot && this.$refs.Plot.clearLoadedRunData) {
            this.$refs.Plot.clearLoadedRunData();
            console.log('Cleared loaded run data flag for new optimization');
          }
          
          // Clear custom points when starting a new optimization run
          this.customPoints = [];
          this.customPoint = null; // Clear the custom point comparison
            console.log('Clearing custom points for new optimization run');
        }
        
        // Set current run ID for polling
        if (response.run_directory && !this.currentRunId) {
          this.currentRunId = response.run_directory;
          console.log('Set current run ID for polling:', this.currentRunId);
        }
        
        // Fallback: if run ID is not set but available in response, set it
        if (!this.currentRunId && response.run_directory) {
          console.log('Fallback: Setting run ID from response:', response.run_directory);
          this.currentRunId = response.run_directory;
        }
        
        // Update plot data
        if (this.$refs.Plot && this.$refs.Plot.updateChartData) {
          console.log('Updating plot with new data');
          
          // Special handling for restarted runs - don't replace, just set initial data
          if (response.restarted_from_backup) {
            console.log('Restarted run detected - setting initial data without replacing');
            console.log('Setting initial points:', response.plot_data?.length || response.data?.length);
            if (response.plot_data) {
              this.$refs.Plot.allPoints = response.plot_data;
              this.$refs.Plot.updateChart();
              console.log('Initial points set, allPoints now has:', this.$refs.Plot.allPoints.length, 'points');
            } else if (response.data) {
              this.$refs.Plot.allPoints = response.data;
              this.$refs.Plot.updateChart();
              console.log('Initial points set, allPoints now has:', this.$refs.Plot.allPoints.length, 'points');
            }
          } else {
            // Normal behavior for new runs
            if (response.plot_data) {
              this.$refs.Plot.updateChartData(response.plot_data);
            } else if (response.data) {
              this.$refs.Plot.updateChartData(response.data);
            }
          }
        }
        
        // Force a refresh to ensure the plot updates
        if (this.$refs.Plot && this.$refs.Plot.refreshPlot) {
          console.log('Forcing plot refresh');
          setTimeout(() => {
            this.$refs.Plot.refreshPlot();
          }, 1000); // Wait 1 second for the file to be written
        }
        
        // Enable polling after successful optimization
        if (this.$refs.Plot && this.$refs.Plot.enablePolling) {
          console.log('Enabling polling after optimization');
          this.$refs.Plot.enablePolling();
        }
        
        if (response && response.plot_data && (response.plot_data.A || response.plot_data.B)) {
          this.isComparative = true;
          
          // Clear comparative loading state if data is available
          if (this.$refs.Plot && this.$refs.Plot.clearComparativeLoading) {
            this.$refs.Plot.clearComparativeLoading();
          }
        } else {
          this.isComparative = false;
        }
        
        // Show comparative summary in chat if available
        if (response && response.chat_summary && this.$refs.Chat && this.$refs.Chat.addRichChatMessage) {
          this.$refs.Chat.addRichChatMessage(
            response.chat_summary.message,
            response.chat_summary.summary_file
          );
        }
      } else {
        console.log('This is not a real optimization run - keeping custom points');
        console.log('Response type:', typeof response);
        console.log('Response keys:', response ? Object.keys(response) : 'no response');
      }
      
      console.log('=== handleOptimizationSuccess END ===');
    },
    
    // RunManager event handlers
    handlePlotRun(runData) {
      console.log('Plotting single run:', runData);
      if (this.$refs.Plot && this.$refs.Plot.loadRunData) {
        this.$refs.Plot.loadRunData(runData);
      }
    },
    
    handlePlotRuns(runsData) {
      console.log('Plotting multiple runs:', runsData);
      if (this.$refs.Plot && this.$refs.Plot.loadMultipleRuns) {
        this.$refs.Plot.loadMultipleRuns(runsData);
      }
    },
    
    handleShowComparison(comparisonData) {
      console.log('Showing comparison:', comparisonData);
      // You can implement comparison visualization here
      // For now, just log the data
      if (this.$refs.Chat) {
        this.$refs.Chat.addMessage(
          `Comparison loaded: ${comparisonData.run_a.run_name} vs ${comparisonData.run_b.run_name}`
        );
      }
    },
    handleSendInsightsToChat(insights, options = {}) {
      console.log('App.vue: handleSendInsightsToChat called with:', insights, 'options:', options);
      
      // Check if this is a silent context update (structured data)
      if (options.silent && typeof insights === 'object') {
        console.log('Silent context update - not displaying in chat UI');
        // Only add to AI context, don't display in chat
        addInsightsContext({ insights })
          .then(response => {
            console.log('Silent insights context added to AI:', response);
          })
          .catch(error => {
            console.error('Error adding silent insights context:', error);
          });
        return;
      }
      
      // Handle regular string messages
      if (typeof insights === 'string') {
        // First, display the insights in the chat UI
        if (this.$refs.Chat && this.$refs.Chat.addMessage) {
          console.log('Displaying insights in chat UI');
          this.$refs.Chat.addMessage(insights, 'chat');
        } else {
          console.error('Chat component or addMessage method not available');
        }
        
        // Then, add the insights to the AI's conversation context
        addInsightsContext({ insights })
          .then(response => {
            console.log('Insights context added to AI:', response);
          })
          .catch(error => {
            console.error('Error adding insights context:', error);
          });
      } else {
        console.error('Invalid insights format:', typeof insights);
      }
    },
    handleSubmitCustomDesign(design) {
      console.log('App.vue: handleSubmitCustomDesign called with:', design);
      
      // Evaluate the custom design
      this.evaluateCustomDesign(design);
    },
    async evaluateCustomDesign(design) {
      try {
        // Ensure we have a trace value
        const trace = design.trace || "gpt-j-65536-weighted";
        console.log('Evaluating custom design with trace:', trace);
        
        // Evaluate the custom design
        const response = await evaluatePointInputs({
          GPU: design.chiplets.GPU,
          Attention: design.chiplets.Attention,
          Sparse: design.chiplets.Sparse,
          Convolution: design.chiplets.Convolution,
          trace: trace,
        });
        
        console.log('Custom design evaluation response:', response);
        
        // Add the evaluated point to the plot
        if (response.data && this.$refs.Plot && this.$refs.Plot.addCustomDesignPoint) {
          console.log('Response data received:', response.data);
          
          const evaluatedPoint = {
            x: response.data.x,
            y: response.data.y,
            gpu: response.data.gpu,
            attn: response.data.attn,
            sparse: response.data.sparse,
            conv: response.data.conv,
            trace: response.data.trace,
            type: 'custom',
            label: 'Custom Design',
            source: 'Manual',
            algorithm: 'Custom Design'
          };
          
          console.log('Adding evaluated custom design point to plot:', evaluatedPoint);
          
          // Store the custom point in App.vue state for persistence
          this.customPoints.push(evaluatedPoint);
          console.log('Custom points stored in App.vue:', this.customPoints.length);
          
          // Set the custom point for comparison in Design Visualizer
          this.customPoint = evaluatedPoint;
          console.log('Custom point set for comparison (from modal):', evaluatedPoint);
          console.log('App.vue customPoint after setting (from modal):', this.customPoint);
          console.log('App.vue customPoints array length (from modal):', this.customPoints.length);
          
          // Add the point to the plot
          this.$refs.Plot.addCustomDesignPoint(evaluatedPoint);
        } else {
          console.error('Missing response data or plot reference');
        }
        
        console.log('Closing custom design modal');
        this.showCustomDesignModal = false;
      } catch (error) {
        console.error('Error evaluating custom design:', error);
        // You might want to show an error message to the user here
      }
    },
    handleHighlightingResponse(highlightingData) {
      console.log('App.vue: handleHighlightingResponse called with:', highlightingData);
      
      if (this.$refs.Plot && this.$refs.Plot.highlightPointsByConstraint) {
        console.log('Calling highlightPointsByConstraint on Plot component');
        this.$refs.Plot.highlightPointsByConstraint(highlightingData);
      } else {
        console.error('Plot component or highlightPointsByConstraint method not available');
      }
    },
    handleDataMiningComplete(dataMiningResults) {
      console.log('App.vue: handleDataMiningComplete called with:', dataMiningResults);
      
      // Show data mining results in chat
      if (this.$refs.Chat && this.$refs.Chat.addMessage) {
        const message = `Data mining analysis completed! Rule mining found ${dataMiningResults.ruleMining?.rules?.length || 0} rules, and distance correlation analysis is ready.`;
        this.$refs.Chat.addMessage(message, 'chat');
      }
      
      // Open the DataMining component window to show the results
      this.toggleWindow('DataMining');
    },
    handleReportGenerated(reportData) {
      console.log('App.vue: handleReportGenerated called with:', reportData);
      
      // Show report generation success in chat
      if (this.$refs.Chat && this.$refs.Chat.addMessage) {
        if (reportData.loaded_from_backup) {
          // For loaded runs, show web link if available
          if (reportData.web_link) {
            const message = `Previous Run Report generated successfully! You can view it here: http://localhost:8000${reportData.web_link}`;
            this.$refs.Chat.addMessage(message, 'chat');
          } else if (reportData.download_link) {
            const message = `Previous Run Report generated successfully! You can download it here: ${reportData.download_link}`;
            this.$refs.Chat.addMessage(message, 'chat');
          } else {
            // Fallback: show report content directly
            const message = `Report loaded from previous run:\n\n${reportData.report_content}`;
            this.$refs.Chat.addMessage(message, 'chat');
          }
        } else {
          // For current runs, show web link
          if (reportData.web_link) {
            const message = `Report generated successfully! You can view it here: http://localhost:8000${reportData.web_link}`;
            this.$refs.Chat.addMessage(message, 'chat');
          } else if (reportData.download_link) {
            // Fallback for old format
            const message = `Report generated successfully! You can download it here: ${reportData.download_link}`;
            this.$refs.Chat.addMessage(message, 'chat');
          } else {
            const message = `Report generated successfully!`;
            this.$refs.Chat.addMessage(message, 'chat');
          }
        }
      }
    },
    handleRunIdUpdated(runId) {
      console.log('=== App.vue: handleRunIdUpdated START ===');
      console.log('App.vue: handleRunIdUpdated called with:', runId);
      console.log('App.vue: Previous currentRunId:', this.currentRunId);
      this.currentRunId = runId;
      console.log('App.vue: Current run ID updated to:', this.currentRunId);
      console.log('App.vue: Plot ref exists:', !!this.$refs.Plot);
      
      // Force immediate plot refresh for restarted runs to show old points
      if (this.$refs.Plot && runId && runId.startsWith('restarted_run_')) {
        console.log('App.vue: Forcing immediate plot refresh for restarted run');
        this.$nextTick(() => {
          this.$refs.Plot.refreshPlot();
        });
      }
      
      // Enable Data Mining / Generate Report in ProblemFormulation when run comes from chat
      if (this.$refs.ProblemFormulation) {
        try {
          this.$refs.ProblemFormulation.hasOptimizationData = true;
          this.$refs.ProblemFormulation.currentRunId = runId;
        } catch (e) {
          console.warn('Could not set ProblemFormulation state from App:', e?.message || e);
        }
      }
      console.log('=== App.vue: handleRunIdUpdated END ===');
    },
    handleViewChanged(view) {
      console.log('App.vue: View changed to:', view);
      // Set comparative analysis active state based on view
      this.isComparativeAnalysisActive = view === 'comparative';
      console.log('App.vue: Comparative analysis active:', this.isComparativeAnalysisActive);
    },
    handlePointSelected(point) {
      console.log('App.vue: handlePointSelected called with:', point);
      this.selectedPoint = point;
      this.customPoint = null; // Clear custom point comparison when selecting a new point
      
      // Automatically send point context to chat
      this.sendPointContextToChat(point);
    },
    handlePointHovered(point) {
      this.hoveredPoint = point;
    },
    handleModifyDesign(design) {
      // This method is no longer needed since we handle modification in DesignVisualizer
      console.log('handleModifyDesign called but no longer used');
    },
    async handleEvaluateDesign(modifiedDesign) {
      console.log('App.vue: handleEvaluateDesign called with:', modifiedDesign);
      
      try {
        // Get the current trace (use default if not available)
        const trace = this.currentRunId ? 'gpt-j-65536-weighted' : 'gpt-j-65536-weighted';
        console.log('Evaluating modified design with trace:', trace);
        
        // First, evaluate the modified design to get performance metrics
        const response = await evaluatePointInputs({
          GPU: modifiedDesign.gpu,
          Attention: modifiedDesign.attn,
          Sparse: modifiedDesign.sparse,
          Convolution: modifiedDesign.conv,
          trace: trace
        });
        
        console.log('Modified design evaluation response:', response);
        
        if (response.data && this.$refs.Plot && this.$refs.Plot.addCustomDesignPoint) {
          // Create the evaluated point with custom design properties
          const evaluatedPoint = {
            x: response.data.x,
            y: response.data.y,
            gpu: modifiedDesign.gpu,
            attn: modifiedDesign.attn,
            sparse: modifiedDesign.sparse,
            conv: modifiedDesign.conv,
            trace: trace,
            type: 'custom',
            source: 'Manual',
            label: 'Custom Design',
            algorithm: 'Custom Design'
          };
          
          console.log('Adding evaluated modified design point to plot:', evaluatedPoint);
          
          // Store the custom point in App.vue state for persistence
          this.customPoints.push(evaluatedPoint);
          console.log('Custom points stored in App.vue:', this.customPoints.length);
          
          // Set the custom point for comparison in Design Visualizer
          this.customPoint = evaluatedPoint;
          console.log('Custom point set for comparison (from Design Visualizer):', evaluatedPoint);
          console.log('App.vue customPoint after setting (from Design Visualizer):', this.customPoint);
          
          // Add to plot as custom design
          this.$refs.Plot.addCustomDesignPoint(evaluatedPoint);
          
          // Automatically save the custom point to dataset after successful evaluation
          try {
            console.log('Automatically saving custom point to dataset...');
            const saveResponse = await saveCustomPointToDataset(evaluatedPoint);
            console.log('Custom point automatically saved to dataset:', saveResponse);
            
            // Mark the point as saved
            evaluatedPoint.saved = true;
            this.customPoint.saved = true;
            
            // Update the point in the plot to show it's saved
            this.$refs.Plot.updateCustomDesignPoint(evaluatedPoint);
            
            console.log('Custom point marked as saved and updated in plot');
          } catch (saveError) {
            console.error('Error automatically saving custom point:', saveError);
            // Don't fail the entire operation if saving fails
          }
          
          // Try to integrate the custom point into the GA if we have an active run
          if (this.currentRunId && !this.currentRunId.startsWith('loaded_run_')) {
            try {
              console.log('Attempting to integrate custom point into GA for run:', this.currentRunId);
              const integrationResponse = await integrateCustomPointToGA({
                run_id: this.currentRunId,
                custom_point: {
                  gpu: modifiedDesign.gpu,
                  attn: modifiedDesign.attn,
                  sparse: modifiedDesign.sparse,
                  conv: modifiedDesign.conv
                },
                current_generation: 0 // This could be tracked more precisely
              });
              
              console.log('GA integration response:', integrationResponse);
              
              if (integrationResponse.status === 'success') {
                console.log('Custom point successfully integrated into GA population');
                // The GA will continue running with the custom point included
              }
            } catch (integrationError) {
              console.log('Could not integrate into GA (this is normal for loaded runs):', integrationError.message);
              // This is expected for loaded runs or when GA is not running
            }
          }
          
          console.log('Modified design successfully added to plot and saved');
        }
      } catch (error) {
        console.error('Error evaluating modified design:', error);
        // You might want to show a user-friendly error message here
      }
    },
    async sendPointContextToChat(point) {
      try {
        // Prepare the summary context data
        const summaryInsights = `Selected design point: Execution Time: ${point.x}ms, Energy: ${point.y}mJ, GPU: ${point.gpu || 0}, Attention: ${point.attn || 0}, Sparse: ${point.sparse || 0}, Convolution: ${point.conv || 0}`;
        
        // Try to fetch detailed context if we have a run ID
        let detailedContext = null;
        if (this.currentRunId) {
          try {
            console.log('Fetching detailed point context...');
            const designName = `${point.gpu || 0}gpu${point.attn || 0}attn${point.sparse || 0}sparse${point.conv || 0}conv`;
            const contextResponse = await getPointContext({
              run_id: this.currentRunId,
              design: designName,
              gpu: point.gpu || 0,
              attn: point.attn || 0,
              sparse: point.sparse || 0,
              conv: point.conv || 0
            });
            
            if (contextResponse.context) {
              detailedContext = contextResponse.context;
              console.log('Detailed context fetched successfully');
            }
          } catch (error) {
            console.log('Detailed context not available for this point:', error.message);
            // Continue without detailed context - this is not a critical error
          }
        }
        
        // Send enhanced context to chat
        await addEnhancedInsightsContext({
          summary_insights: summaryInsights,
          detailed_context: detailedContext
        });
        
        console.log('Enhanced point context sent to chat');
      } catch (error) {
        console.error('Error sending enhanced point context to chat:', error);
        
        // Fallback to basic context if enhanced fails
        try {
          await addInsightsContext({
            insights: `Selected design point: Execution Time: ${point.x}ms, Energy: ${point.y}mJ, GPU: ${point.gpu || 0}, Attention: ${point.attn || 0}, Sparse: ${point.sparse || 0}, Convolution: ${point.conv || 0}`
          });
          console.log('Fallback: Basic point context sent to chat');
        } catch (fallbackError) {
          console.error('Error sending fallback context:', fallbackError);
        }
      }
    },
    
    // Zoom control methods
    zoomIn() {
      if (this.$refs.Plot && this.$refs.Plot.zoomIn) {
        this.$refs.Plot.zoomIn();
      }
    },
    
    zoomOut() {
      if (this.$refs.Plot && this.$refs.Plot.zoomOut) {
        this.$refs.Plot.zoomOut();
      }
    },
    
    resetZoom() {
      if (this.$refs.Plot && this.$refs.Plot.resetZoom) {
        this.$refs.Plot.resetZoom();
      }
    },
  },
};
</script>

<style>
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  height: 88px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem 1.25rem 2rem;
}
.header-title {
  font-size: 1.7rem;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 0.01em;
}
.header-actions {
  display: flex;
  gap: 1rem;
}
.header-btn {
  background: #e9ecef;
  color: #adb5bd;
  border: none;
  border-radius: 5px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: not-allowed;
  opacity: 0.7;
}
.main-content-wrapper {
  padding-top: 88px;
  background: #f9fafd;
  min-height: 100vh;
}
.main-flex {
  display: flex;
  flex-direction: row;
  gap: 0;
  width: 100vw;
  min-height: calc(100vh - 88px);
}
.left-col {
  flex: 2 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: #f9fafd;
  padding: 0;
}
.problem-formulation-section {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 2rem 2.5rem 2.5rem 2.5rem;
  margin: 32px 32px 2rem 32px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.problem-formulation-wrap {
  margin-bottom: 2rem;
  padding: 32px 32px 0 32px;
}
.explorer-section {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 2rem 2.5rem 2.5rem 2.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 32px;
  margin-right: 32px;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.design-visualizer-section {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 2rem 2.5rem 2.5rem 2.5rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 32px;
  margin-right: 32px;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 1.2rem;
}

.zoom-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}

.zoom-btn {
  min-width: 80px;
  height: 32px;
  border: 1px solid #e0e6ed;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 0 12px;
}

.zoom-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.zoom-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.zoom-btn.reset {
  /* Reset button uses same styling as other buttons */
}
.explorer-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}
.explorer-subtext {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}
.plot-area {
  min-height: 320px;
  margin-bottom: 0.5rem;
}
.plot-area-constrained {
  aspect-ratio: 4/3;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.axis-selectors {
  margin-top: 0.5rem;
}
.explorer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
.btn {
  display: inline-block;
  font-weight: 600;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1rem;
  transition: background 0.2s, box-shadow 0.2s;
  border: none;
  outline: none;
}
.btn-primary {
  background: #337aff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.10);
  cursor: pointer;
}
.btn-primary:hover {
  background: #2356b8;
}
.data-mining-section {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
.chiplet-menu-section {
  margin-top: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  padding: 1.5rem 1rem;
  max-width: 400px;
  align-self: flex-start;
  margin-left: 32px;
}
.chiplet-menu-label {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #2c3e50;
}
.right-col {
  flex: 1 1 0;
  min-width: 0;
  max-width: 380px;
  background: #f5f8ff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 88px);
  max-height: calc(100vh - 88px);
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
.chat-scroll-wrap {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.btn {
  display: inline-block;
  font-weight: 600;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1rem;
  transition: background 0.2s, box-shadow 0.2s;
  border: none;
  outline: none;
}
.btn-primary {
  background: #337aff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.10);
  cursor: pointer;
}
.btn-primary:hover {
  background: #2356b8;
}
.mt-4 {
  margin-top: 1.5rem;
}
.flex {
  display: flex;
}
.justify-end {
  justify-content: flex-end;
}
.gap-4 {
  gap: 1rem;
}
.px-4 {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}
.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.border-b {
  border-bottom: 1px solid #e0e0e0;
}
.font-semibold {
  font-weight: 600;
}
.text-gray-700 {
  color: #374151;
}
.bg-white {
  background: #fff;
}
.text-2xl {
  font-size: 1.5rem;
}
.font-bold {
  font-weight: 700;
}
.text-gray-800 {
  color: #2d3748;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.data-mining-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  padding: 2rem 2.5rem 2.5rem 2.5rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 32px;
  margin-right: 32px;
}
.data-mining-header {
  margin-bottom: 1.2rem;
}
.data-mining-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.2rem;
}
.data-mining-subtext {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}
.create-design-btn-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin: 1.5rem 32px 0 32px;
}
.create-design-btn {
  background: transparent;
  color: #337aff;
  font-weight: 600;
  font-size: 1rem;
  border: 1.5px solid #337aff;
  border-radius: 6px;
  padding: 0.45rem 1.1rem;
  box-shadow: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border 0.2s;
  margin-left: 0; /* Remove left margin so button hugs the right */
}
.create-design-btn.secondary {
  background: transparent;
  color: #337aff;
  border: 1.5px solid #337aff;
}
.create-design-btn.secondary:hover {
  background: #eaf1ff;
  color: #2356b8;
  border-color: #2356b8;
}
@media (max-width: 600px) {
  .flex-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .create-design-btn {
    width: 100%;
    margin-left: 0;
  }
  
  /* Mobile responsive design */
  .main-flex {
    flex-direction: column;
    width: 100%;
  }
  
  .left-col {
    flex: none;
    width: 100%;
    padding: 0;
  }
  
  .right-col {
    flex: none;
    width: 100%;
    height: 50vh;
    min-height: 300px;
  }
  
  .problem-formulation-section {
    margin: 16px 16px 1rem 16px;
    border-radius: 8px;
    padding: 1.5rem 1rem 1.5rem 1rem;
  }
  
  .explorer-section {
    margin: 0 16px 1rem 16px;
    padding: 1.5rem 1rem 1.5rem 1rem;
    border-radius: 8px;
  }
  
  .design-visualizer-section {
    margin: 0 16px 1rem 16px;
    padding: 1.5rem 1rem 1.5rem 1rem;
    border-radius: 8px;
  }
  
  .create-design-btn-wrap {
    margin: 1rem 16px 0 16px;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .dock-area {
    margin: 0 16px 1rem 16px;
  }
  
  .dock-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .dock-window {
    width: 100% !important;
    min-width: 100% !important;
  }
  
  .header-content {
    padding: 1rem;
  }
  
  .header-title {
    font-size: 1.4rem;
  }
  
  .header-tabs {
    gap: 0.25rem;
  }
  
  .header-tab {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

@media (min-width: 601px) and (max-width: 1024px) {
  /* Tablet responsive design */
  .main-flex {
    gap: 1rem;
  }
  
  .left-col {
    flex: 1.5 1 0;
  }
  
  .right-col {
    flex: 1 1 0;
  }
  
  .problem-formulation-section {
    margin: 24px 24px 1.5rem 24px;
    padding: 1.75rem 2rem 2rem 2rem;
  }
  
  .explorer-section {
    margin: 0 24px 1.5rem 24px;
    padding: 1.75rem 2rem 2rem 2rem;
  }
  
  .design-visualizer-section {
    margin: 0 24px 1.5rem 24px;
    padding: 1.75rem 2rem 2rem 2rem;
  }
  
  .create-design-btn-wrap {
    margin: 1.25rem 24px 0 24px;
  }
  
  .dock-area {
    margin: 0 24px 1.5rem 24px;
  }
  
  .header-content {
    padding: 1.25rem 1.5rem;
  }
  
  .header-title {
    font-size: 1.5rem;
  }
  
  .header-tab {
    padding: 0.55rem 1.25rem;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  /* Small mobile devices */
  .main-content-wrapper {
    padding-top: 120px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
  }
  
  .header-tabs {
    width: 100%;
    justify-content: center;
  }
  
  .problem-formulation-section {
    margin: 12px 12px 0.75rem 12px;
  }
  
  .explorer-section {
    margin: 0 12px 0.75rem 12px;
    padding: 1rem 0.75rem 1rem 0.75rem;
  }
  
  .design-visualizer-section {
    margin: 0 12px 0.75rem 12px;
    padding: 1rem 0.75rem 1rem 0.75rem;
  }
  
  .create-design-btn-wrap {
    margin: 0.75rem 12px 0 12px;
  }
  
  .dock-area {
    margin: 0 12px 0.75rem 12px;
  }
}
</style>
