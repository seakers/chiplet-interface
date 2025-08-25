<template>
  <header class="cdo-header">
    <div class="header-left">
      <span class="header-title">Chiplet Design Optimizer</span>
    </div>
  </header>
</template>

<script>
export default {
  name: 'Header',
  props: {
    openWindows: Object
  }
};
</script>

<style scoped>
.cdo-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  min-height: 64px;
  box-sizing: border-box;
}
.header-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 0.01em;
}
</style> 