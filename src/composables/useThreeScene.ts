/**
 * useThreeScene.ts - Three.js 场景逻辑 composable
 * 
 * 封装 Three.js 场景的初始化和管理逻辑
 * 
 * 功能：
 * - 初始化 Scene、Camera、Renderer
 * - 创建 World 对象（参考平面网格 + 坐标轴）
 * - 集成 OrbitControls 实现摄像机控制
 * - 响应窗口调整，更新 canvas 尺寸和摄像机宽高比
 */
import { type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * useThreeScene 选项接口
 */
export interface UseThreeSceneOptions {
  container: Ref<HTMLElement | null>
}

/**
 * useThreeScene 返回值接口
 */
export interface UseThreeSceneReturn {
  /** 初始化场景 */
  init: () => void
  /** 清理资源 */
  dispose: () => void
  /** 获取场景对象 */
  getScene: () => THREE.Scene | null
  /** 获取摄像机对象 */
  getCamera: () => THREE.PerspectiveCamera | null
  /** 获取控制器对象 */
  getControls: () => OrbitControls | null
  /** 获取 World 对象 */
  getWorld: () => THREE.Group | null
  /** 添加对象到场景 */
  addToScene: (object: THREE.Object3D) => void
  /** 从场景移除对象 */
  removeFromScene: (object: THREE.Object3D) => void
  /** 设置 World 可见性 */
  setWorldVisible: (visible: boolean) => void
}

/**
 * 场景状态接口
 */
interface SceneState {
  scene: THREE.Scene | null
  camera: THREE.PerspectiveCamera | null
  renderer: THREE.WebGLRenderer | null
  controls: OrbitControls | null
  world: THREE.Group | null
  ambientLight: THREE.AmbientLight | null
  directionalLight: THREE.DirectionalLight | null
  animationId: number | null
}

/**
 * 配置常量
 */
const CONFIG = {
  // 场景配置
  scene: {
    backgroundColor: 0x1a1a2e
  },
  // 摄像机配置
  camera: {
    fov: 45,
    near: 0.01,
    far: 100,
    position: { x: 2, y: 1.5, z: 3 }
  },
  // 渲染器配置
  renderer: {
    antialias: true
  },
  // 控制器配置
  controls: {
    enableDamping: true,
    dampingFactor: 0.05,
    minDistance: 0.5,
    maxDistance: 50,
    enablePan: true,
    target: { x: 0, y: 0.5, z: 0 }  // 默认看向模型中心偏上
  },
  // World 配置
  world: {
    // 网格平面配置
    grid: {
      size: 4,
      divisions: 20,
      colorCenterLine: 0x444444,
      colorGrid: 0x333333
    },
    // 坐标轴配置
    axes: {
      size: 1
    }
  },
  // 光照配置
  lighting: {
    ambient: {
      color: 0xffffff,
      intensity: 0.6
    },
    directional: {
      color: 0xffffff,
      intensity: 0.8,
      position: { x: 5, y: 10, z: 7 }
    }
  }
} as const

/**
 * Three.js 场景管理 composable
 * 
 * @param options - 配置选项，包含容器元素引用
 * @returns 场景管理方法
 */
export function useThreeScene(options: UseThreeSceneOptions): UseThreeSceneReturn {
  const { container } = options

  // 场景状态
  const state: SceneState = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    world: null,
    ambientLight: null,
    directionalLight: null,
    animationId: null
  }

  /**
   * 创建 World 对象
   * 包含参考平面网格和坐标轴
   */
  function createWorld(): THREE.Group {
    const world = new THREE.Group()
    world.name = 'World'

    // 创建网格平面
    const gridHelper = new THREE.GridHelper(
      CONFIG.world.grid.size,
      CONFIG.world.grid.divisions,
      CONFIG.world.grid.colorCenterLine,
      CONFIG.world.grid.colorGrid
    )
    gridHelper.name = 'GridHelper'
    world.add(gridHelper)

    // 创建坐标轴（禁用深度测试避免 Z-fighting 闪烁）
    const axesHelper = new THREE.AxesHelper(CONFIG.world.axes.size)
    axesHelper.name = 'AxesHelper'
    // 设置渲染顺序，确保坐标轴在网格之上
    axesHelper.renderOrder = 1
    // 禁用深度测试，彻底解决 Z-fighting 问题
    axesHelper.traverse((child) => {
      if (child instanceof THREE.Line) {
        const material = child.material as THREE.LineBasicMaterial
        material.depthTest = false
      }
    })
    world.add(axesHelper)

    return world
  }

  /**
   * 初始化 Three.js 场景
   */
  function init(): void {
    if (!container.value) {
      console.warn('useThreeScene: 容器元素不存在，无法初始化场景')
      return
    }

    const containerElement = container.value
    const width = containerElement.clientWidth
    const height = containerElement.clientHeight

    // 1. 创建场景
    state.scene = new THREE.Scene()
    state.scene.background = new THREE.Color(CONFIG.scene.backgroundColor)

    // 2. 创建摄像机
    const aspect = width / height
    state.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      aspect,
      CONFIG.camera.near,
      CONFIG.camera.far
    )
    state.camera.position.set(
      CONFIG.camera.position.x,
      CONFIG.camera.position.y,
      CONFIG.camera.position.z
    )

    // 3. 创建渲染器
    state.renderer = new THREE.WebGLRenderer({
      antialias: CONFIG.renderer.antialias
    })
    state.renderer.setSize(width, height)
    state.renderer.setPixelRatio(window.devicePixelRatio)
    containerElement.appendChild(state.renderer.domElement)

    // 4. 创建 World 对象（网格 + 坐标轴）
    state.world = createWorld()
    state.scene.add(state.world)

    // 5. 添加光照系统
    state.ambientLight = new THREE.AmbientLight(
      CONFIG.lighting.ambient.color,
      CONFIG.lighting.ambient.intensity
    )
    state.scene.add(state.ambientLight)

    state.directionalLight = new THREE.DirectionalLight(
      CONFIG.lighting.directional.color,
      CONFIG.lighting.directional.intensity
    )
    state.directionalLight.position.set(
      CONFIG.lighting.directional.position.x,
      CONFIG.lighting.directional.position.y,
      CONFIG.lighting.directional.position.z
    )
    state.scene.add(state.directionalLight)

    // 6. 初始化 OrbitControls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement)
    state.controls.enableDamping = CONFIG.controls.enableDamping
    state.controls.dampingFactor = CONFIG.controls.dampingFactor
    state.controls.minDistance = CONFIG.controls.minDistance
    state.controls.maxDistance = CONFIG.controls.maxDistance
    state.controls.enablePan = CONFIG.controls.enablePan
    state.controls.target.set(
      CONFIG.controls.target.x,
      CONFIG.controls.target.y,
      CONFIG.controls.target.z
    )
    state.controls.update()

    // 7. 添加窗口调整事件监听器
    window.addEventListener('resize', handleResize)

    // 8. 启动渲染循环
    animate()

    console.log('useThreeScene: 场景初始化完成')
  }

  /**
   * 处理窗口调整事件
   */
  function handleResize(): void {
    if (!container.value || !state.camera || !state.renderer) {
      return
    }

    const width = container.value.clientWidth
    const height = container.value.clientHeight

    state.camera.aspect = width / height
    state.camera.updateProjectionMatrix()
    state.renderer.setSize(width, height)
  }

  /**
   * 渲染循环
   */
  function animate(): void {
    state.animationId = requestAnimationFrame(animate)
    
    if (state.controls) {
      state.controls.update()
    }
    
    if (state.renderer && state.scene && state.camera) {
      state.renderer.render(state.scene, state.camera)
    }
  }

  /**
   * 清理 Three.js 资源
   */
  function dispose(): void {
    if (state.animationId !== null) {
      cancelAnimationFrame(state.animationId)
      state.animationId = null
    }

    window.removeEventListener('resize', handleResize)

    if (state.controls) {
      state.controls.dispose()
      state.controls = null
    }

    if (state.renderer) {
      state.renderer.dispose()
      if (state.renderer.domElement.parentElement) {
        state.renderer.domElement.parentElement.removeChild(state.renderer.domElement)
      }
      state.renderer = null
    }

    if (state.scene) {
      state.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      state.scene = null
    }

    state.camera = null
    state.world = null
    state.ambientLight = null
    state.directionalLight = null

    console.log('useThreeScene: 资源已清理')
  }

  function getScene(): THREE.Scene | null {
    return state.scene
  }

  function getCamera(): THREE.PerspectiveCamera | null {
    return state.camera
  }

  function getControls(): OrbitControls | null {
    return state.controls
  }

  function getWorld(): THREE.Group | null {
    return state.world
  }

  function addToScene(object: THREE.Object3D): void {
    if (state.scene) {
      state.scene.add(object)
    } else {
      console.warn('useThreeScene: 场景未初始化，无法添加对象')
    }
  }

  function removeFromScene(object: THREE.Object3D): void {
    if (state.scene) {
      state.scene.remove(object)
    }
  }

  /**
   * 设置 World 可见性
   */
  function setWorldVisible(visible: boolean): void {
    if (state.world) {
      state.world.visible = visible
    }
  }

  return {
    init,
    dispose,
    getScene,
    getCamera,
    getControls,
    getWorld,
    addToScene,
    removeFromScene,
    setWorldVisible
  }
}
