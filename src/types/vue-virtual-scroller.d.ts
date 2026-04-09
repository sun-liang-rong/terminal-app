declare module 'vue-virtual-scroller' {
  import type { Component, DefineComponent } from 'vue'

  export interface ScrollerProps {
    items: any[]
    keyField?: string
    minItemSize?: number
    buffer?: number
    pageMode?: boolean
    poolSize?: number
  }

  export const DynamicScroller: DefineComponent<{
    items: any[]
    keyField?: string
    minItemSize: number
    buffer?: number
    pageMode?: boolean
    poolSize?: number
  }>

  export const DynamicScrollerItem: DefineComponent<{
    item: any
    active: boolean
    dataIndex?: number
    sizeDependencies?: any[]
  }>

  export const RecycleScroller: DefineComponent<ScrollerProps>
}
