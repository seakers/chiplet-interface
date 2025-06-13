<template>
  <div class="problem-formulation">
    <div class="formulation-header">
      <h3>Problem Formulation</h3>
    </div>
    <div class="formulation-content"></div>
  </div>
</template>

<script>
export default {
  name: 'ProblemFormulation',
  data() {
    return {
      // Empty for now
    }
  },
  methods: {
    saveFormulation() {
      // To be implemented based on requirements
      this.$emit('save-formulation', {});
    }
  }
}
</script>

<style scoped>
.problem-formulation {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  width: 100%;
  /* max-width: 800px; */
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
  height: 100%;
  max-height: 100%;
}

.formulation-header {
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.formulation-header h3 {
  margin: 0;
  font-size: 1.4rem;
  color: #2c3e50;
}

.formulation-content {
  min-height: 100px;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 