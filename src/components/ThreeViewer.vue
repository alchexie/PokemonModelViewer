<script setup lang="ts">
/**
 * ThreeViewer.vue - 3D 查看器组件
 * 
 * 负责：
 * - 创建和管理 canvas 容器
 * - 初始化 Three.js 场景
 * - 处理组件生命周期
 * 
 * Requirements: 2.1
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useThreeScene } from '../composables/useThreeScene'

// Canvas 容器元素引用
const containerRef = ref<HTMLDivElement | null>(null)

// 使用 Three.js 场景 composable
const { init, dispose } = useThreeScene({
  container: containerRef
})

onMounted(() => {
  // 初始化 Three.js 场景
  init()
  console.log('ThreeViewer mounted, container:', containerRef.value)
})

onUnmounted(() => {
  // 清理 Three.js 资源
  dispose()
  console.log('ThreeViewer unmounted')
})
</script>

<template>
  <div ref="containerRef" class="three-viewer-container">
    <!-- Three.js 将在此容器中创建 canvas 元素 -->
  </div>
</template>

<style scoped>
.three-viewer-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background-color: #1a1a2e;
}

/* 确保 Three.js 创建的 canvas 填满容器 */
.three-viewer-container :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
