/**
 * Performance measurement utilities for the Vue3 frontend
 */

export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  itemCount: number
  viewMode: 'virtual' | 'standard'
  timestamp: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private startTime: number = 0

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startMeasurement(): void {
    this.startTime = performance.now()
  }

  endMeasurement(itemCount: number, viewMode: 'virtual' | 'standard'): PerformanceMetrics {
    const renderTime = performance.now() - this.startTime
    const memoryUsage = this.estimateMemoryUsage()

    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      itemCount,
      viewMode,
      timestamp: Date.now()
    }

    this.metrics.push(metrics)

    // Keep only last 10 measurements
    if (this.metrics.length > 10) {
      this.metrics.shift()
    }

    return metrics
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null
  }

  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  private estimateMemoryUsage(): number {
    if ('memory' in performance) {
      // Chrome-specific memory API
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
    }
    return 0 // Fallback for other browsers
  }

  logPerformanceData(): void {
    if (process.env.NODE_ENV === 'development') {
      const latest = this.getLatestMetrics()
      if (latest) {
        console.group('🚀 Performance Metrics')
        console.log(`Render Time: ${latest.renderTime.toFixed(2)}ms`)
        console.log(`Memory Usage: ${latest.memoryUsage}MB`)
        console.log(`Items Rendered: ${latest.itemCount}`)
        console.log(`View Mode: ${latest.viewMode}`)
        console.groupEnd()
      }
    }
  }

  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0
    const total = this.metrics.reduce((sum, metric) => sum + metric.renderTime, 0)
    return total / this.metrics.length
  }

  comparePerformance(): { improvement: number; baseline: number; current: number } | null {
    const virtualMetrics = this.metrics.filter(m => m.viewMode === 'virtual')
    const standardMetrics = this.metrics.filter(m => m.viewMode === 'standard')

    if (virtualMetrics.length === 0 || standardMetrics.length === 0) {
      return null
    }

    const avgVirtual = virtualMetrics.reduce((sum, m) => sum + m.renderTime, 0) / virtualMetrics.length
    const avgStandard = standardMetrics.reduce((sum, m) => sum + m.renderTime, 0) / standardMetrics.length

    const improvement = ((avgStandard - avgVirtual) / avgStandard) * 100

    return {
      improvement: Math.round(improvement * 100) / 100,
      baseline: Math.round(avgStandard * 100) / 100,
      current: Math.round(avgVirtual * 100) / 100
    }
  }

  reset(): void {
    this.metrics = []
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()
