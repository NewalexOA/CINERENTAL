/**
 * Performance test script for virtual scrolling
 * Run this in browser console to test virtual scrolling performance
 */

const testVirtualScrolling = () => {
  console.log('🧪 Testing Virtual Scrolling Performance...');

  // Check if we're on the equipment list page
  if (!window.location.href.includes('/equipment')) {
    console.warn('Navigate to /equipment page first');
    return;
  }

  // Test data
  const testResults = {
    virtual: [],
    standard: []
  };

  const runTest = async (mode, iterations = 3) => {
    console.log(`Testing ${mode} mode (${iterations} iterations)...`);

    for (let i = 0; i < iterations; i++) {
      // Switch to the test mode
      const modeSelect = document.querySelector('select');
      if (modeSelect) {
        modeSelect.value = mode;
        modeSelect.dispatchEvent(new Event('change'));
      }

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Measure performance
      const start = performance.now();

      // Scroll test
      const container = document.querySelector('.virtual-container') ||
                       document.querySelector('.equipment-list-view');
      if (container) {
        // Simulate scrolling
        for (let scroll = 0; scroll < 5; scroll++) {
          container.scrollTop = scroll * 300;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const end = performance.now();
      const renderTime = end - start;

      testResults[mode].push({
        iteration: i + 1,
        renderTime,
        memoryUsage: performance.memory ?
          Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A'
      });

      console.log(`${mode} iteration ${i + 1}: ${renderTime.toFixed(2)}ms`);
    }
  };

  const runAllTests = async () => {
    await runTest('virtual');
    await runTest('standard');

    // Calculate averages
    const virtualAvg = testResults.virtual.reduce((sum, test) =>
      sum + test.renderTime, 0) / testResults.virtual.length;
    const standardAvg = testResults.standard.reduce((sum, test) =>
      sum + test.renderTime, 0) / testResults.standard.length;

    // Calculate improvement
    const improvement = ((standardAvg - virtualAvg) / standardAvg * 100);

    console.log('\n📊 Performance Test Results:');
    console.log('================================');
    console.log(`Virtual Mode Average: ${virtualAvg.toFixed(2)}ms`);
    console.log(`Standard Mode Average: ${standardAvg.toFixed(2)}ms`);
    console.log(`Performance Improvement: ${improvement.toFixed(1)}%`);
    console.log(`Target Met: ${improvement >= 400 ? '✅' : '❌'} (Target: 5x faster = 400% improvement)`);

    // Memory usage comparison
    const virtualMemory = testResults.virtual[testResults.virtual.length - 1].memoryUsage;
    const standardMemory = testResults.standard[testResults.standard.length - 1].memoryUsage;

    if (virtualMemory !== 'N/A' && standardMemory !== 'N/A') {
      const memoryReduction = ((standardMemory - virtualMemory) / standardMemory * 100);
      console.log(`Memory Usage - Virtual: ${virtualMemory}MB, Standard: ${standardMemory}MB`);
      console.log(`Memory Reduction: ${memoryReduction.toFixed(1)}%`);
      console.log(`Memory Target Met: ${memoryReduction >= 200 ? '✅' : '❌'} (Target: 3x reduction = 200% improvement)`);
    }

    console.log('\n📋 Detailed Results:', testResults);
  };

  runAllTests().catch(console.error);
};

// Auto-run if script is loaded
if (typeof window !== 'undefined') {
  window.testVirtualScrolling = testVirtualScrolling;
  console.log('🚀 Virtual scrolling test loaded. Run testVirtualScrolling() to start.');
}
