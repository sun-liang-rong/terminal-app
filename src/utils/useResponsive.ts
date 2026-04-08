// 响应式布局 Hook
import { ref, onMounted, onUnmounted, computed } from 'vue'

// 断点定义
export const BREAKPOINTS = {
  xs: 480,   // 超小屏
  sm: 640,   // 小屏
  md: 768,   // 中屏
  lg: 900,   // 大屏 (侧边栏折叠点)
  xl: 1200,  // 超大屏
  xxl: 1536  // 超超大屏
} as const

// 窗口尺寸状态
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

// 更新窗口尺寸
const updateWindowSize = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

// 监听器计数
let listenerCount = 0

// 响应式断点计算
export const useResponsive = () => {
  const isXs = computed(() => windowWidth.value < BREAKPOINTS.xs)
  const isSm = computed(() => windowWidth.value >= BREAKPOINTS.xs && windowWidth.value < BREAKPOINTS.sm)
  const isMd = computed(() => windowWidth.value >= BREAKPOINTS.sm && windowWidth.value < BREAKPOINTS.md)
  const isLg = computed(() => windowWidth.value >= BREAKPOINTS.md && windowWidth.value < BREAKPOINTS.lg)
  const isXl = computed(() => windowWidth.value >= BREAKPOINTS.lg && windowWidth.value < BREAKPOINTS.xl)
  const isXxl = computed(() => windowWidth.value >= BREAKPOINTS.xl)

  // 组合断点
  const isMobile = computed(() => windowWidth.value < BREAKPOINTS.md)
  const isTablet = computed(() => windowWidth.value >= BREAKPOINTS.md && windowWidth.value < BREAKPOINTS.lg)
  const isDesktop = computed(() => windowWidth.value >= BREAKPOINTS.lg)

  // 侧边栏是否应该折叠
  const shouldCollapseSidebar = computed(() => windowWidth.value < BREAKPOINTS.lg)

  // 标签栏高度（小屏减小）
  const tabbarHeight = computed(() => {
    if (windowWidth.value < BREAKPOINTS.sm) return 36
    if (windowWidth.value < BREAKPOINTS.md) return 40
    return 42
  })

  // 是否显示次要信息
  const showSecondaryInfo = computed(() => windowWidth.value >= BREAKPOINTS.md)

  // 命令面板宽度
  const commandPaletteWidth = computed(() => {
    if (windowWidth.value < BREAKPOINTS.sm) return '90vw'
    if (windowWidth.value < BREAKPOINTS.md) return 400
    if (windowWidth.value < BREAKPOINTS.xl) return 500
    return 600
  })

  onMounted(() => {
    if (listenerCount === 0) {
      window.addEventListener('resize', updateWindowSize)
    }
    listenerCount++
  })

  onUnmounted(() => {
    listenerCount--
    if (listenerCount === 0) {
      window.removeEventListener('resize', updateWindowSize)
    }
  })

  return {
    // 尺寸
    windowWidth,
    windowHeight,

    // 断点
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isXxl,

    // 组合断点
    isMobile,
    isTablet,
    isDesktop,

    // 布局计算
    shouldCollapseSidebar,
    tabbarHeight,
    showSecondaryInfo,
    commandPaletteWidth,

    // 断点值
    BREAKPOINTS
  }
}

// 导出类型
export type ResponsiveState = ReturnType<typeof useResponsive>