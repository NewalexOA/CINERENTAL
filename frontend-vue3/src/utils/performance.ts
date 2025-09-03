/**
 * Enhanced performance measurement utilities for the Vue3 frontend with advanced bundle tracking
 */

export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  itemCount: number
  viewMode: 'virtual' | 'standard'
  timestamp: number
}

export interface ChunkLoadMetrics {
  chunkName: string
  loadTime: number
  size?: number
  gzipSize?: number
  timestamp: number
  route?: string
  retryCount?: number
  error?: string
}

export interface BundleMetrics {
  initialBundleSize: number
  totalChunksLoaded: number
  totalLoadTime: number
  criticalChunksTime: number
  timestamp: number
}

export interface ResourceTiming {
  name: string
  type: 'script' | 'css' | 'image' | 'other'
  duration: number
  transferSize: number
  timestamp: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private chunkMetrics: ChunkLoadMetrics[] = []
  private bundleMetrics: BundleMetrics[] = []
  private resourceTimings: ResourceTiming[] = []
  private startTime: number = 0
  private initialLoadTime: number = 0

  // Enhanced performance budget thresholds (in milliseconds)
  private readonly PERFORMANCE_BUDGETS = {
    chunkLoad: 1000,      // Max chunk load time
    renderTime: 100,       // Max component render time
    memoryWarning: 50,     // Memory usage warning (MB)
    criticalPath: 2000,    // Critical path budget
    // New budget categories
    initialBundle: 200,    // Initial bundle size (KB)
    vendorBundle: 500,     // Vendor bundle size (KB)
    asyncChunk: 150,       // Async chunk size (KB)
    totalMemory: 100,      // Total memory usage (MB)
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  constructor() {
    this.initializeResourceObserver()
    this.trackInitialLoad()
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
    this.chunkMetrics = []
    this.bundleMetrics = []
    this.resourceTimings = []
    // Clear session storage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('budget-violations')
      sessionStorage.removeItem('bundle-violations')
      sessionStorage.removeItem('chunk-errors')
    }
  }

  // Bundle-specific tracking methods

  /**
   * Track chunk loading performance with enhanced metrics
   */
  trackChunkLoad(chunkName: string, loadTime: number, route?: string, size?: number, gzipSize?: number): void {
    const chunkMetric: ChunkLoadMetrics = {
      chunkName,
      loadTime,
      size,
      gzipSize,
      timestamp: Date.now(),
      route,
    }

    this.chunkMetrics.push(chunkMetric)

    // Keep only last 20 chunk metrics
    if (this.chunkMetrics.length > 20) {
      this.chunkMetrics.shift()
    }

    // Enhanced performance budget checking with context
    if (loadTime > this.PERFORMANCE_BUDGETS.chunkLoad) {
      const severity = loadTime > this.PERFORMANCE_BUDGETS.chunkLoad * 2 ? 'CRITICAL' : 'WARNING'
      console.warn(`${severity}: Chunk '${chunkName}' took ${loadTime.toFixed(2)}ms (budget: ${this.PERFORMANCE_BUDGETS.chunkLoad}ms)${route ? ` on route: ${route}` : ''}`)

      // Track budget violations
      if (import.meta.env.DEV) {
        this.trackBudgetViolation('chunk-load', chunkName, loadTime, this.PERFORMANCE_BUDGETS.chunkLoad)
      }
    }

    if (import.meta.env.DEV) {
      console.log(`📦 Chunk loaded: ${chunkName} (${loadTime.toFixed(2)}ms)`)
    }
  }

  /**
   * Enhanced chunk loading with retry logic, error tracking, and bundle analysis integration
   */
  async trackAsyncChunkLoad<T>(chunkName: string, loader: () => Promise<T>, route?: string): Promise<T> {
    const startTime = performance.now()
    let attempt = 0
    const maxAttempts = 3

    while (attempt < maxAttempts) {
      try {
        const result = await loader()
        const loadTime = performance.now() - startTime

        // Estimate chunk size from network timing if available
        const size = this.estimateChunkSize(chunkName)
        const gzipSize = this.estimateGzipSize(chunkName)

        this.trackChunkLoad(chunkName, loadTime, route, size, gzipSize)

        // Enhanced success logging with bundle analysis
        if (attempt > 0) {
          console.log(`📦 Chunk '${chunkName}' loaded on attempt ${attempt + 1}`)
        }

        // Track chunk loading success for bundle optimization insights
        this.trackChunkSuccess(chunkName, loadTime, size, route)

        return result
      } catch (error) {
        attempt++
        console.error(`Failed to load chunk '${chunkName}' (attempt ${attempt}/${maxAttempts}):`, error)

        if (attempt === maxAttempts) {
          this.trackChunkError(chunkName, error as Error)
          throw error
        }

        // Exponential backoff with jitter to avoid thundering herd
        const backoffTime = Math.pow(2, attempt) * 100 + Math.random() * 100
        await new Promise(resolve => setTimeout(resolve, backoffTime))
      }
    }

    throw new Error(`Failed to load chunk '${chunkName}' after ${maxAttempts} attempts`)
  }

  /**
   * Track chunk loading errors
   */
  private trackChunkError(chunkName: string, error: Error): void {
    const errorMetric = {
      chunkName,
      error: error.message,
      timestamp: Date.now(),
      stack: error.stack,
    }

    if (import.meta.env.DEV) {
      console.error('🚨 Chunk loading error:', errorMetric)
    }

    // Store for analytics
    const errors = JSON.parse(sessionStorage.getItem('chunk-errors') || '[]')
    errors.push(errorMetric)
    sessionStorage.setItem('chunk-errors', JSON.stringify(errors.slice(-10)))
  }

  /**
   * Estimate chunk size from performance timing with enhanced accuracy
   */
  private estimateChunkSize(chunkName: string): number {
    const resources = performance.getEntriesByType('resource')
    for (const resource of resources) {
      const entry = resource as PerformanceResourceTiming
      if (entry.name.includes(chunkName) && (entry as any).transferSize) {
        return Math.round((entry as any).transferSize / 1024) // KB
      }
    }
    return 0
  }

  /**
   * Estimate gzip size from performance timing
   */
  private estimateGzipSize(chunkName: string): number {
    const resources = performance.getEntriesByType('resource')
    for (const resource of resources) {
      const entry = resource as PerformanceResourceTiming
      if (entry.name.includes(chunkName) && (entry as any).encodedBodySize) {
        return Math.round((entry as any).encodedBodySize / 1024) // KB
      }
    }
    return 0
  }

  /**
   * Track chunk loading success for optimization insights
   */
  private trackChunkSuccess(chunkName: string, loadTime: number, size?: number, route?: string): void {
    const successMetric = {
      chunkName,
      loadTime,
      size,
      route,
      timestamp: Date.now(),
      cacheHit: loadTime < 50, // Assume cache hit if very fast
    }

    if (import.meta.env.DEV) {
      console.log(`✅ Chunk success: ${chunkName} (${loadTime.toFixed(2)}ms${size ? `, ${size}KB` : ''})`)
    }

    // Store for analytics and optimization suggestions
    const successes = JSON.parse(sessionStorage.getItem('chunk-successes') || '[]')
    successes.push(successMetric)
    sessionStorage.setItem('chunk-successes', JSON.stringify(successes.slice(-20)))
  }

  /**
   * Initialize resource performance observer
   */
  private initializeResourceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.js') || entry.name.includes('.css')) {
            const resourceTiming: ResourceTiming = {
              name: this.extractFileName(entry.name),
              type: entry.name.includes('.js') ? 'script' : 'css',
              duration: entry.duration,
              transferSize: (entry as any).transferSize || 0,
              timestamp: Date.now(),
            }

            this.resourceTimings.push(resourceTiming)

            // Keep only last 50 resource timings
            if (this.resourceTimings.length > 50) {
              this.resourceTimings.shift()
            }
          }
        }
      })

      observer.observe({ entryTypes: ['resource'] })
    }
  }

  /**
   * Track initial application load
   */
  private trackInitialLoad(): void {
    if (document.readyState === 'complete') {
      this.captureInitialMetrics()
    } else {
      window.addEventListener('load', () => {
        this.captureInitialMetrics()
      })
    }
  }

  /**
   * Capture initial bundle metrics
   */
  private captureInitialMetrics(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    this.initialLoadTime = navigation.loadEventEnd - (navigation.fetchStart || 0)

    const bundleMetric: BundleMetrics = {
      initialBundleSize: this.estimateInitialBundleSize(),
      totalChunksLoaded: 1, // Initial bundle
      totalLoadTime: this.initialLoadTime,
      criticalChunksTime: this.initialLoadTime,
      timestamp: Date.now(),
    }

    this.bundleMetrics.push(bundleMetric)

    if (import.meta.env.DEV) {
      console.group('🚀 Initial Bundle Metrics')
      console.log(`Initial Load Time: ${this.initialLoadTime.toFixed(2)}ms`)
      console.log(`Estimated Bundle Size: ${bundleMetric.initialBundleSize.toFixed(2)}KB`)
      console.groupEnd()
    }
  }

  /**
   * Extract filename from URL
   */
  private extractFileName(url: string): string {
    return url.split('/').pop()?.split('?')[0] || 'unknown'
  }

  /**
   * Estimate initial bundle size from resource timings
   */
  private estimateInitialBundleSize(): number {
    const resources = performance.getEntriesByType('resource')
    let totalSize = 0

    for (const resource of resources) {
      const entry = resource as PerformanceResourceTiming
      if (entry.name.includes('.js') && (entry as any).transferSize) {
        totalSize += (entry as any).transferSize
      }
    }

    return totalSize / 1024 // Convert to KB
  }

  /**
   * Get chunk loading statistics
   */
  getChunkMetrics(): ChunkLoadMetrics[] {
    return [...this.chunkMetrics]
  }

  /**
   * Get bundle performance summary
   */
  getBundleMetrics(): BundleMetrics[] {
    return [...this.bundleMetrics]
  }

  /**
   * Get resource timing data
   */
  getResourceTimings(): ResourceTiming[] {
    return [...this.resourceTimings]
  }

  /**
   * Calculate average chunk load time
   */
  getAverageChunkLoadTime(): number {
    if (this.chunkMetrics.length === 0) return 0
    const total = this.chunkMetrics.reduce((sum, metric) => sum + metric.loadTime, 0)
    return total / this.chunkMetrics.length
  }

  /**
   * Track budget violations for analytics
   */
  private trackBudgetViolation(type: string, metric: string, value: number, threshold: number): void {
    const violation = { type, metric, value, threshold, timestamp: Date.now() }
    const violations = JSON.parse(sessionStorage.getItem('budget-violations') || '[]')
    violations.push(violation)
    sessionStorage.setItem('budget-violations', JSON.stringify(violations.slice(-50)))
  }

  /**
   * Suggest performance optimizations based on violations
   */
  private suggestOptimizations(violations: any[]): void {
    const suggestions = new Set<string>()

    violations.forEach(v => {
      if (v.type === 'chunk-load') {
        suggestions.add('💡 Consider code splitting or lazy loading for heavy components')
        suggestions.add('💡 Check if chunk contains unnecessary dependencies')
      }
      if (v.type === 'render-time') {
        suggestions.add('💡 Use virtual scrolling for large lists')
        suggestions.add('💡 Implement component memoization with v-memo')
      }
    })

    if (suggestions.size > 0) {
      console.group('💡 Performance Optimization Suggestions')
      suggestions.forEach(suggestion => console.log(suggestion))
      console.groupEnd()
    }
  }

  /**
   * Get performance budget violations with enhanced data
   */
  getBudgetViolations(): Array<{
    type: string
    metric: string
    value: number
    threshold: number
    severity: 'warning' | 'critical'
    timestamp?: number
  }> {
    const violations = []

    // Check chunk load violations
    for (const chunk of this.chunkMetrics) {
      if (chunk.loadTime > this.PERFORMANCE_BUDGETS.chunkLoad) {
        violations.push({
          type: 'chunk-load',
          metric: chunk.chunkName,
          value: chunk.loadTime,
          threshold: this.PERFORMANCE_BUDGETS.chunkLoad,
          severity: (chunk.loadTime > this.PERFORMANCE_BUDGETS.chunkLoad * 2 ? 'critical' : 'warning') as 'critical' | 'warning',
          timestamp: chunk.timestamp,
        })
      }

      // Check chunk size violations
      if (chunk.size && chunk.size > this.PERFORMANCE_BUDGETS.asyncChunk) {
        violations.push({
          type: 'chunk-size',
          metric: chunk.chunkName,
          value: chunk.size,
          threshold: this.PERFORMANCE_BUDGETS.asyncChunk,
          severity: (chunk.size > this.PERFORMANCE_BUDGETS.asyncChunk * 2 ? 'critical' : 'warning') as 'critical' | 'warning',
          timestamp: chunk.timestamp,
        })
      }
    }

    // Check render time violations
    for (const metric of this.metrics) {
      if (metric.renderTime > this.PERFORMANCE_BUDGETS.renderTime) {
        violations.push({
          type: 'render-time',
          metric: metric.viewMode,
          value: metric.renderTime,
          threshold: this.PERFORMANCE_BUDGETS.renderTime,
          severity: (metric.renderTime > this.PERFORMANCE_BUDGETS.renderTime * 2 ? 'critical' : 'warning') as 'critical' | 'warning',
          timestamp: metric.timestamp,
        })
      }

      // Check memory violations
      if (metric.memoryUsage > this.PERFORMANCE_BUDGETS.memoryWarning) {
        violations.push({
          type: 'memory-usage',
          metric: `${metric.itemCount} items`,
          value: metric.memoryUsage,
          threshold: this.PERFORMANCE_BUDGETS.memoryWarning,
          severity: (metric.memoryUsage > this.PERFORMANCE_BUDGETS.totalMemory ? 'critical' : 'warning') as 'critical' | 'warning',
          timestamp: metric.timestamp,
        })
      }
    }

    return violations
  }

  /**
   * Calculate bundle efficiency score (0-10)
   */
  private calculateBundleEfficiency(bundleMetric: BundleMetrics): number {
    let score = 10

    // Penalize large initial bundle
    if (bundleMetric.initialBundleSize > this.PERFORMANCE_BUDGETS.initialBundle) {
      score -= Math.min(3, (bundleMetric.initialBundleSize - this.PERFORMANCE_BUDGETS.initialBundle) / 50)
    }

    // Penalize slow load times
    if (bundleMetric.totalLoadTime > this.PERFORMANCE_BUDGETS.criticalPath) {
      score -= Math.min(3, (bundleMetric.totalLoadTime - this.PERFORMANCE_BUDGETS.criticalPath) / 500)
    }

    // Reward efficient chunking
    if (bundleMetric.totalChunksLoaded > 5) {
      score += Math.min(2, (bundleMetric.totalChunksLoaded - 5) * 0.2)
    }

    return Math.max(0, Math.min(10, score))
  }

  /**
   * Log comprehensive performance report
   */
  logPerformanceReport(): void {
    if (import.meta.env.DEV) {
      console.group('📊 Performance Report')

      // Render performance
      const latest = this.getLatestMetrics()
      if (latest) {
        console.log(`Current Render: ${latest.renderTime.toFixed(2)}ms`)
        console.log(`Memory Usage: ${latest.memoryUsage}MB`)
      }

      // Chunk loading performance
      const avgChunkTime = this.getAverageChunkLoadTime()
      console.log(`Average Chunk Load: ${avgChunkTime.toFixed(2)}ms`)
      console.log(`Total Chunks Loaded: ${this.chunkMetrics.length}`)

      // Budget violations
      const violations = this.getBudgetViolations()
      if (violations.length > 0) {
        console.warn('📊 Performance Budget Violations:')
        violations.forEach(v => {
          const severity = v.value > v.threshold * 2 ? '🚨' : '⚠️'
          console.warn(`  ${severity} ${v.type}: ${v.metric} (${v.value.toFixed(2)}ms > ${v.threshold}ms)`)
        })

        // Suggest optimizations
        this.suggestOptimizations(violations)
      }

      // Enhanced bundle analysis
      const bundleMetrics = this.getBundleMetrics()
      if (bundleMetrics.length > 0) {
        const latest = bundleMetrics[bundleMetrics.length - 1]
        if (latest) {
          console.log(`Initial Bundle: ${latest.initialBundleSize.toFixed(2)}KB`)
          console.log(`Total Load Time: ${latest.totalLoadTime.toFixed(2)}ms`)
          console.log(`Chunks Loaded: ${latest.totalChunksLoaded}`)

          // Bundle efficiency analysis
          const efficiency = this.calculateBundleEfficiency(latest)
          console.log(`Bundle Efficiency: ${efficiency.toFixed(1)}/10`)
        }
      }

      // Memory analysis
      const currentMemory = this.estimateMemoryUsage()
      if (currentMemory > 0) {
        console.log(`Current Memory: ${currentMemory}MB`)
        if (currentMemory > this.PERFORMANCE_BUDGETS.memoryWarning) {
          console.warn(`⚠️ Memory usage above warning threshold (${this.PERFORMANCE_BUDGETS.memoryWarning}MB)`)
        }
      }

      console.groupEnd()
    }
  }

  /**
   * Create performance warning for bundle size with severity levels
   */
  checkBundleSize(bundleSize: number, threshold: number = 250): void {
    if (bundleSize > threshold) {
      const severity = bundleSize > threshold * 2 ? '🚨 CRITICAL' : '⚠️ WARNING'
      console.warn(`${severity} Bundle size: ${bundleSize.toFixed(2)}KB exceeds ${threshold}KB threshold`)

      // Track bundle size violations for analytics
      if (import.meta.env.DEV) {
        this.trackBundleSizeViolation(bundleSize, threshold)
      }
    }
  }

  /**
   * Track bundle size violations for analysis
   */
  private trackBundleSizeViolation(actual: number, threshold: number): void {
    const violation = {
      type: 'bundle-size-violation',
      actual,
      threshold,
      excess: actual - threshold,
      timestamp: Date.now(),
    }

    // Store in session storage for dev analysis
    const violations = JSON.parse(sessionStorage.getItem('bundle-violations') || '[]')
    violations.push(violation)
    sessionStorage.setItem('bundle-violations', JSON.stringify(violations.slice(-20)))
  }

  /**
   * Get comprehensive performance analytics
   */
  getPerformanceAnalytics(): {
    chunks: ChunkLoadMetrics[]
    bundleViolations: any[]
    chunkErrors: any[]
    summary: {
      totalChunks: number
      avgLoadTime: number
      slowestChunk: ChunkLoadMetrics | null
      fastestChunk: ChunkLoadMetrics | null
      errorRate: number
    }
  } {
    const violations = JSON.parse(sessionStorage.getItem('bundle-violations') || '[]')
    const errors = JSON.parse(sessionStorage.getItem('chunk-errors') || '[]')

    const slowestChunk = this.chunkMetrics.length > 0 ? this.chunkMetrics.reduce((prev, current) =>
      (prev.loadTime > current.loadTime) ? prev : current) : null

    const fastestChunk = this.chunkMetrics.length > 0 ? this.chunkMetrics.reduce((prev, current) =>
      (prev.loadTime < current.loadTime) ? prev : current) : null

    return {
      chunks: this.chunkMetrics,
      bundleViolations: violations,
      chunkErrors: errors,
      summary: {
        totalChunks: this.chunkMetrics.length,
        avgLoadTime: this.getAverageChunkLoadTime(),
        slowestChunk,
        fastestChunk,
        errorRate: errors.length / Math.max(this.chunkMetrics.length, 1) * 100
      }
    }
  }

  /**
   * Clear all performance data
   */
  clearAnalytics(): void {
    this.reset()
    sessionStorage.removeItem('bundle-violations')
    sessionStorage.removeItem('chunk-errors')
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): string {
    const analytics = this.getPerformanceAnalytics()
    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      analytics
    }

    return JSON.stringify(exportData, null, 2)
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// Enhanced memory trend tracking with adaptive intervals
if (import.meta.env.DEV) {
  let memoryTrackingInterval = 30000 // Start with 30 seconds

  const adaptiveMemoryTracking = () => {
    performanceMonitor.trackMemoryTrend()

    // Adjust tracking frequency based on memory usage
    const currentMemory = performanceMonitor.estimateMemoryUsage()
    if (currentMemory > 100) {
      memoryTrackingInterval = 10000 // Track every 10 seconds if high memory
    } else if (currentMemory > 50) {
      memoryTrackingInterval = 20000 // Track every 20 seconds if medium memory
    } else {
      memoryTrackingInterval = 30000 // Normal tracking interval
    }
  }

  // Initial tracking
  adaptiveMemoryTracking()

  // Set up adaptive interval
  const scheduleNext = () => {
    setTimeout(() => {
      adaptiveMemoryTracking()
      scheduleNext()
    }, memoryTrackingInterval)
  }

  scheduleNext()
}

/**
 * Utility function to create async component with performance tracking
 */
export function createTrackedAsyncComponent(
  chunkName: string,
  loader: () => Promise<any>,
  fallbackComponent?: any
) {
  return {
    loader: () => performanceMonitor.trackAsyncChunkLoad(chunkName, loader),
    loadingComponent: fallbackComponent,
    delay: 200,
    timeout: 10000,
    errorComponent: {
      template: `
        <div class="async-error p-4 border border-red-300 bg-red-50 rounded-lg">
          <h3 class="text-red-800 font-medium">Failed to load ${chunkName}</h3>
          <p class="text-red-600 text-sm mt-1">Please try refreshing the page.</p>
          <button
            @click="$emit('retry')"
            class="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      `
    },
  }
}

/**
 * Performance monitoring composable for Vue components
 */
export function usePerformanceMonitoring() {
  return {
    trackChunkLoad: (chunkName: string, loadTime: number, route?: string) => {
      performanceMonitor.trackChunkLoad(chunkName, loadTime, route)
    },

    trackAsyncLoad: async <T>(chunkName: string, loader: () => Promise<T>) => {
      return performanceMonitor.trackAsyncChunkLoad(chunkName, loader)
    },

    getAnalytics: () => performanceMonitor.getPerformanceAnalytics(),

    exportData: () => performanceMonitor.exportPerformanceData(),

    clearData: () => performanceMonitor.clearAnalytics(),
  }
}
