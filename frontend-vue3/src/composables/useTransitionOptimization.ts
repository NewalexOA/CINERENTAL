/**
 * Transition Optimization Composable
 * GPU-accelerated transitions, animation batching, and performance monitoring
 */

import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

interface TransitionConfig {
  duration?: number
  easing?: string
  useGPU?: boolean
  batchUpdates?: boolean
  fallbackDuration?: number
}

interface AnimationMetrics {
  totalAnimations: number
  gpuAnimations: number
  batchedAnimations: number
  averageDuration: number
  droppedFrames: number
}

interface AnimationTask {
  id: string
  element: HTMLElement
  animation: () => Promise<void>
  priority: 'high' | 'medium' | 'low'
  startTime?: number
}

/**
 * Advanced transition optimization with GPU acceleration and batching
 */
export function useTransitionOptimization(defaultConfig: TransitionConfig = {}) {
  const {
    duration = 300,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
    useGPU = true,
    batchUpdates = true,
    fallbackDuration = 1000
  } = defaultConfig

  // State
  const animationQueue = ref<AnimationTask[]>([])
  const isProcessing = ref(false)
  const metrics = ref<AnimationMetrics>({
    totalAnimations: 0,
    gpuAnimations: 0,
    batchedAnimations: 0,
    averageDuration: 0,
    droppedFrames: 0
  })

  let frameId: number | null = null
  let performanceObserver: PerformanceObserver | null = null

  /**
   * Initialize performance monitoring for animations
   */
  const initializePerformanceMonitoring = (): void => {
    if ('PerformanceObserver' in window) {
      performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.startsWith('animation-')) {
            updateAnimationMetrics(entry.duration)
          }
        })
      })

      performanceObserver.observe({ entryTypes: ['measure'] })
    }
  }

  /**
   * Update animation performance metrics
   */
  const updateAnimationMetrics = (duration: number): void => {
    metrics.value.totalAnimations++
    metrics.value.averageDuration =
      (metrics.value.averageDuration * (metrics.value.totalAnimations - 1) + duration) /
      metrics.value.totalAnimations

    // Detect dropped frames (animations taking significantly longer than expected)
    if (duration > fallbackDuration) {
      metrics.value.droppedFrames++
    }
  }

  /**
   * Create GPU-accelerated transition with comprehensive fallback
   */
  const createGPUTransition = (
    element: HTMLElement,
    properties: Record<string, string | number>,
    config: TransitionConfig = {}
  ): Promise<void> => {
    const transitionDuration = config.duration || duration
    const transitionEasing = config.easing || easing
    const shouldUseGPU = config.useGPU !== false && useGPU

    return new Promise((resolve, reject) => {
      const animationId = `animation-${Date.now()}-${Math.random()}`
      const startTime = performance.now()

      // Mark start of animation measurement
      performance.mark(`${animationId}-start`)

      // Prepare element for GPU acceleration
      if (shouldUseGPU) {
        element.style.willChange = Object.keys(properties).join(', ')
        metrics.value.gpuAnimations++
      }

      // Apply transition properties
      const transitionProperty = Object.keys(properties).join(', ')
      element.style.transition = `${transitionProperty} ${transitionDuration}ms ${transitionEasing}`

      // Store original values for cleanup
      const originalStyles: Record<string, string> = {}
      Object.keys(properties).forEach(key => {
        originalStyles[key] = element.style.getPropertyValue(key)
      })

      // Apply new values
      Object.entries(properties).forEach(([key, value]) => {
        element.style.setProperty(key, String(value))
      })

      // Handle transition completion
      const cleanup = (success: boolean = true) => {
        // Measure animation completion
        performance.mark(`${animationId}-end`)
        performance.measure(animationId, `${animationId}-start`, `${animationId}-end`)

        // Clean up styles
        element.style.transition = ''
        if (shouldUseGPU) {
          element.style.willChange = 'auto'
        }

        // Remove event listeners
        element.removeEventListener('transitionend', onTransitionEnd)
        element.removeEventListener('transitioncancel', onTransitionCancel)

        if (timeoutId) clearTimeout(timeoutId)

        if (success) {
          resolve()
        } else {
          reject(new Error('Transition was cancelled or timed out'))
        }
      }

      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.target === element) {
          cleanup(true)
        }
      }

      const onTransitionCancel = () => {
        cleanup(false)
      }

      // Set up event listeners
      element.addEventListener('transitionend', onTransitionEnd, { once: true })
      element.addEventListener('transitioncancel', onTransitionCancel, { once: true })

      // Fallback timeout
      const timeoutId = setTimeout(() => {
        console.warn(`Transition timeout for element:`, element)
        cleanup(false)
      }, transitionDuration + 100)
    })
  }

  /**
   * Batch multiple transitions for optimal performance
   */
  const batchTransitions = (
    transitions: Array<{
      element: HTMLElement
      properties: Record<string, string | number>
      config?: TransitionConfig
    }>
  ): Promise<void[]> => {
    if (!batchUpdates || transitions.length <= 1) {
      return Promise.all(
        transitions.map(({ element, properties, config }) =>
          createGPUTransition(element, properties, config)
        )
      )
    }

    metrics.value.batchedAnimations += transitions.length

    return new Promise(async (resolve, reject) => {
      try {
        // Group transitions by duration for better synchronization
        const transitionGroups = new Map<number, typeof transitions>()

        transitions.forEach((transition) => {
          const transitionDuration = transition.config?.duration || duration
          if (!transitionGroups.has(transitionDuration)) {
            transitionGroups.set(transitionDuration, [])
          }
          transitionGroups.get(transitionDuration)!.push(transition)
        })

        // Execute groups in parallel but synchronized
        const groupPromises = Array.from(transitionGroups.entries()).map(
          async ([groupDuration, groupTransitions]) => {
            // Use RAF to ensure all transitions start in the same frame
            return new Promise<void[]>((groupResolve) => {
              requestAnimationFrame(async () => {
                const promises = groupTransitions.map(({ element, properties, config }) =>
                  createGPUTransition(element, properties, { ...config, duration: groupDuration })
                )
                const results = await Promise.all(promises)
                groupResolve(results)
              })
            })
          }
        )

        const results = await Promise.all(groupPromises)
        resolve(results.flat())
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Queue animation for batch processing
   */
  const queueAnimation = (
    id: string,
    element: HTMLElement,
    animation: () => Promise<void>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void => {
    const task: AnimationTask = {
      id,
      element,
      animation,
      priority
    }

    animationQueue.value.push(task)

    // Sort by priority
    animationQueue.value.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 }
      return priorities[b.priority] - priorities[a.priority]
    })

    if (!isProcessing.value) {
      scheduleAnimationProcessing()
    }
  }

  /**
   * Process queued animations with RAF synchronization
   */
  const processAnimationQueue = async (): Promise<void> => {
    if (isProcessing.value || animationQueue.value.length === 0) return

    isProcessing.value = true
    const batch = animationQueue.value.splice(0, 5) // Process in small batches

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(async () => {
          const promises = batch.map(task => {
            task.startTime = performance.now()
            return task.animation()
          })

          await Promise.all(promises)
          resolve()
        })
      })
    } catch (error) {
      console.error('Animation batch processing error:', error)
    } finally {
      isProcessing.value = false

      // Continue processing if more animations queued
      if (animationQueue.value.length > 0) {
        scheduleAnimationProcessing()
      }
    }
  }

  /**
   * Schedule animation processing with RAF
   */
  const scheduleAnimationProcessing = (): void => {
    if (frameId) return

    frameId = requestAnimationFrame(() => {
      processAnimationQueue()
      frameId = null
    })
  }

  /**
   * Optimized fade transition
   */
  const fadeTransition = (
    element: HTMLElement,
    opacity: number,
    config: TransitionConfig = {}
  ): Promise<void> => {
    return createGPUTransition(element, { opacity }, {
      ...config,
      useGPU: true // Always use GPU for opacity changes
    })
  }

  /**
   * Optimized slide transition using transform3d
   */
  const slideTransition = (
    element: HTMLElement,
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
    config: TransitionConfig = {}
  ): Promise<void> => {
    const transforms = {
      up: `translate3d(0, -${distance}px, 0)`,
      down: `translate3d(0, ${distance}px, 0)`,
      left: `translate3d(-${distance}px, 0, 0)`,
      right: `translate3d(${distance}px, 0, 0)`
    }

    return createGPUTransition(element, {
      transform: transforms[direction]
    }, {
      ...config,
      useGPU: true
    })
  }

  /**
   * Scale transition with GPU acceleration
   */
  const scaleTransition = (
    element: HTMLElement,
    scale: number,
    config: TransitionConfig = {}
  ): Promise<void> => {
    return createGPUTransition(element, {
      transform: `scale3d(${scale}, ${scale}, 1)`
    }, {
      ...config,
      useGPU: true
    })
  }

  /**
   * Height transition with layout optimization
   */
  const heightTransition = (
    element: HTMLElement,
    height: string | number,
    config: TransitionConfig = {}
  ): Promise<void> => {
    // Measure current height to minimize layout shifts
    const currentHeight = element.getBoundingClientRect().height

    return createGPUTransition(element, {
      height: typeof height === 'number' ? `${height}px` : height
    }, {
      ...config,
      useGPU: false // Height changes can't use GPU acceleration
    })
  }

  /**
   * Staggered animation for lists
   */
  const staggeredTransition = (
    elements: HTMLElement[],
    transitionFn: (element: HTMLElement, index: number) => Promise<void>,
    staggerDelay: number = 50
  ): Promise<void[]> => {
    const promises = elements.map((element, index) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          transitionFn(element, index).then(resolve)
        }, index * staggerDelay)
      })
    })

    return Promise.all(promises)
  }

  /**
   * Create spring-based transition with physics simulation
   */
  const springTransition = (
    element: HTMLElement,
    from: Record<string, number>,
    to: Record<string, number>,
    config: {
      tension?: number
      friction?: number
      precision?: number
    } = {}
  ): Promise<void> => {
    const { tension = 170, friction = 26, precision = 0.01 } = config

    return new Promise((resolve) => {
      const startTime = performance.now()
      let animationFrame: number

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000

        Object.entries(to).forEach(([property, targetValue]) => {
          const startValue = from[property] || 0
          const currentValue = springFunction(elapsed, startValue, targetValue, tension, friction)

          element.style.setProperty(property, `${currentValue}px`)
        })

        // Continue animation until values are close enough to target
        const isComplete = Object.entries(to).every(([property, targetValue]) => {
          const currentValue = parseFloat(element.style.getPropertyValue(property))
          return Math.abs(currentValue - targetValue) < precision
        })

        if (isComplete) {
          // Set final values
          Object.entries(to).forEach(([property, value]) => {
            element.style.setProperty(property, `${value}px`)
          })
          resolve()
        } else {
          animationFrame = requestAnimationFrame(animate)
        }
      }

      animationFrame = requestAnimationFrame(animate)
    })
  }

  /**
   * Spring physics calculation
   */
  const springFunction = (
    t: number,
    start: number,
    end: number,
    tension: number,
    friction: number
  ): number => {
    const angularFreq = Math.sqrt(tension / 1)
    const dampingRatio = friction / (2 * Math.sqrt(tension * 1))

    if (dampingRatio < 1) {
      const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio * dampingRatio)
      const A = start - end
      const B = (dampingRatio * angularFreq * A) / dampedFreq

      return end + Math.exp(-dampingRatio * angularFreq * t) *
             (A * Math.cos(dampedFreq * t) + B * Math.sin(dampedFreq * t))
    } else {
      return end + (start - end) * (1 + angularFreq * t) * Math.exp(-angularFreq * t)
    }
  }

  /**
   * Detect animation capability and fallback
   */
  const detectAnimationSupport = (): {
    supportsTransforms: boolean
    supportsGPU: boolean
    reducedMotion: boolean
  } => {
    const testElement = document.createElement('div')
    testElement.style.transform = 'translateZ(0)'

    return {
      supportsTransforms: 'transform' in testElement.style,
      supportsGPU: testElement.style.transform.includes('translateZ'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }

  /**
   * Create adaptive transition that respects user preferences
   */
  const adaptiveTransition = (
    element: HTMLElement,
    properties: Record<string, string | number>,
    config: TransitionConfig = {}
  ): Promise<void> => {
    const capabilities = detectAnimationSupport()

    // Respect reduced motion preference
    if (capabilities.reducedMotion) {
      // Apply changes immediately without animation
      Object.entries(properties).forEach(([key, value]) => {
        element.style.setProperty(key, String(value))
      })
      return Promise.resolve()
    }

    // Use appropriate transition method based on capabilities
    const adaptedConfig = {
      ...config,
      useGPU: config.useGPU !== false && capabilities.supportsGPU,
      duration: capabilities.supportsGPU ? config.duration || duration : (config.duration || duration) * 0.5
    }

    return createGPUTransition(element, properties, adaptedConfig)
  }

  // Initialize performance monitoring
  initializePerformanceMonitoring()

  // Cleanup
  onBeforeUnmount(() => {
    if (frameId) {
      cancelAnimationFrame(frameId)
    }
    if (performanceObserver) {
      performanceObserver.disconnect()
    }
  })

  return {
    // Core transition methods
    createGPUTransition,
    batchTransitions,
    queueAnimation,
    adaptiveTransition,

    // Specific transitions
    fadeTransition,
    slideTransition,
    scaleTransition,
    heightTransition,
    springTransition,

    // Advanced features
    staggeredTransition,

    // State
    isProcessing: computed(() => isProcessing.value),
    queueLength: computed(() => animationQueue.value.length),
    metrics: computed(() => metrics.value),

    // Utilities
    detectAnimationSupport
  }
}

/**
 * Specialized hook for list item transitions
 */
export function useListTransitions() {
  const transitionOpt = useTransitionOptimization()

  const animateListChange = (
    container: HTMLElement,
    changes: {
      added: HTMLElement[]
      removed: HTMLElement[]
      moved: Array<{ element: HTMLElement; from: number; to: number }>
    },
    duration: number = 300
  ): Promise<void> => {
    const transitions: Array<{
      element: HTMLElement
      properties: Record<string, string | number>
      config?: TransitionConfig
    }> = []

    // Animate removed items
    changes.removed.forEach(element => {
      transitions.push({
        element,
        properties: { opacity: 0, transform: 'scale3d(0.8, 0.8, 1)' },
        config: { duration: duration * 0.8 }
      })
    })

    // Animate added items
    changes.added.forEach(element => {
      // Set initial state
      element.style.opacity = '0'
      element.style.transform = 'scale3d(0.8, 0.8, 1)'

      transitions.push({
        element,
        properties: { opacity: 1, transform: 'scale3d(1, 1, 1)' },
        config: { duration }
      })
    })

    // Animate moved items
    changes.moved.forEach(({ element, from, to }) => {
      const offset = (to - from) * element.offsetHeight
      transitions.push({
        element,
        properties: { transform: `translate3d(0, ${offset}px, 0)` },
        config: { duration }
      })
    })

    return transitionOpt.batchTransitions(transitions).then(() => {
      // Clean up removed elements
      changes.removed.forEach(element => element.remove())
    })
  }

  return {
    animateListChange
  }
}
