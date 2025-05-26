<template>
  <div class="sidebar">
    <div class="sidebar-title">Design Menu</div>
    <div class="sidebar-divider"></div>
    <button @click="$emit('select', 'ga')">Genetic Algorithm</button>
    <button @click="$emit('select', 'chiplet')">Chiplet Menu</button>
    <button @click="$emit('select', 'data-mining')">Data Mining</button>
  </div>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: #f5f8ff;
  border-right: 2px solid #b3c6e0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  padding: 2rem 1rem;
  gap: 1rem;
}
.sidebar-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
  text-align: left;
}
.sidebar-divider {
  height: 3px;
  background: #337aff;
  margin-bottom: 1rem;
  border-radius: 2px;
}
.sidebar button {
  background: #337aff;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: background 0.2s;
}
.sidebar button:hover {
  background: #2356b8;
}
</style> 