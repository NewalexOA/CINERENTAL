/**
 * Performance testing utilities for virtual scrolling implementation
 */

import type { EquipmentResponse, EquipmentStatus } from '@/types/equipment'

/**
 * Generate mock equipment data for performance testing
 */
export function generateMockEquipment(count: number): EquipmentResponse[] {
  const statuses: EquipmentStatus[] = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'BROKEN', 'RETIRED']
  const categories = [
    'Cameras', 'Lenses', 'Lighting', 'Audio', 'Grip', 'Monitors',
    'Storage', 'Power', 'Cable', 'Accessories'
  ]

  const equipment: EquipmentResponse[] = []

  for (let i = 1; i <= count; i++) {
    const categoryName = categories[Math.floor(Math.random() * categories.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const replacementCost = Math.floor(Math.random() * 50000) + 500

    equipment.push({
      id: i,
      name: `Equipment Item ${i.toString().padStart(4, '0')}`,
      description: `Professional ${categoryName.toLowerCase()} equipment for rental. High-quality item suitable for professional productions.`,
      replacement_cost: replacementCost,
      barcode: `${(1000000000 + i).toString()}${String(i % 99).padStart(2, '0')}`, // 11-digit format
      serial_number: status !== 'AVAILABLE' ? `SN${i.toString().padStart(8, '0')}` : undefined,
      category_id: Math.floor(Math.random() * 10) + 1,
      category_name: categoryName,
      status,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      notes: Math.random() > 0.7 ? `Special handling required for ${categoryName.toLowerCase()}` : undefined,
      active_projects: status === 'RENTED' ? [{
        id: Math.floor(Math.random() * 100) + 1,
        name: `Project ${Math.floor(Math.random() * 100) + 1}`,
        start_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }] : [],
      daily_cost: Math.floor(replacementCost * 0.01), // 1% of replacement cost
      image_url: Math.random() > 0.5 ? `https://picsum.photos/400/300?random=${i}` : undefined,
      quantity: categoryName === 'Cable' || categoryName === 'Accessories' ? Math.floor(Math.random() * 50) + 1 : 1,
      purchase_date: new Date(Date.now() - Math.random() * 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
  }

  return equipment
}

/**
 * Performance measurement utilities
 */
export class PerformanceTracker {
  private measurements: Record<string, number[]> = {}

  start(label: string): void {
    if (!this.measurements[label]) {
      this.measurements[label] = []
    }
    performance.mark(`${label}-start`)
  }

  end(label: string): number {
    performance.mark(`${label}-end`)
    performance.measure(label, `${label}-start`, `${label}-end`)

    const entries = performance.getEntriesByName(label)
    const latestEntry = entries[entries.length - 1]
    const duration = latestEntry.duration

    this.measurements[label].push(duration)

    // Clean up marks and measures
    performance.clearMarks(`${label}-start`)
    performance.clearMarks(`${label}-end`)
    performance.clearMeasures(label)

    return duration
  }

  getAverageTime(label: string): number {
    const measurements = this.measurements[label] || []
    if (measurements.length === 0) return 0

    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length
  }

  getStats(label: string) {
    const measurements = this.measurements[label] || []
    if (measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 }
    }

    const avg = this.getAverageTime(label)
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)

    return { avg, min, max, count: measurements.length }
  }

  getAllStats() {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {}

    for (const label of Object.keys(this.measurements)) {
      stats[label] = this.getStats(label)
    }

    return stats
  }

  reset(): void {
    this.measurements = {}
    performance.clearMarks()
    performance.clearMeasures()
  }
}

/**
 * Memory usage estimation
 */
export function getMemoryUsageEstimate(itemCount: number): {
  itemsInMemory: number
  estimatedMB: number
  improvement: string
} {
  const virtualScrollingItemsInMemory = Math.min(itemCount, 30) // Virtual scrolling keeps ~30 items
  const standardItemsInMemory = itemCount // Standard keeps all items

  const bytesPerItem = 2048 // Rough estimate: 2KB per equipment item

  const virtualMemoryMB = (virtualScrollingItemsInMemory * bytesPerItem) / (1024 * 1024)
  const standardMemoryMB = (standardItemsInMemory * bytesPerItem) / (1024 * 1024)

  const improvement = standardMemoryMB > 0
    ? `${Math.round((standardMemoryMB / virtualMemoryMB) * 100) / 100}x better`
    : '1x'

  return {
    itemsInMemory: virtualScrollingItemsInMemory,
    estimatedMB: Math.round(virtualMemoryMB * 100) / 100,
    improvement
  }
}

/**
 * Simulate API delay for realistic testing
 */
export function simulateApiDelay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
