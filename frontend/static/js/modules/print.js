/**
 * Print Module
 * Handles functionality related to print templates and page numbering
 */

const PrintModule = (function() {
    'use strict';

    /**
     * Initialize page numbering for print templates
     * Sets up current and total page numbers and handles print events
     */
    function initPageNumbering() {
        // Check if we're on a print template
        const pageInfoEl = document.querySelector('.page-info');

        if (!pageInfoEl) {
            return false; // Not a print template
        }

        // Set initial page numbers for browser view (not needed for print)
        const pageCurrentEl = document.querySelector('.page-current');
        const pageTotalEl = document.querySelector('.page-total');

        if (pageCurrentEl && pageTotalEl) {
            pageCurrentEl.textContent = '1';
            pageTotalEl.textContent = '1';
        }

        // Handle print events - Hide HTML page counter when printing
        window.addEventListener('beforeprint', function() {
            if (pageInfoEl) {
                pageInfoEl.style.display = 'none';
            }
        });

        window.addEventListener('afterprint', function() {
            if (pageInfoEl) {
                pageInfoEl.style.display = 'block';
            }
        });

        return true; // Successfully initialized
    }

    /**
     * Open a print window for given project
     * @param {string|number} projectId - ID of the project to print
     */
    function openProjectPrintWindow(projectId) {
        // Create a local loader for the print button
        const printBtn = document.getElementById('printProjectBtn');

        if (printBtn) {
            const originalContent = printBtn.innerHTML;

            // Disable button and show spinner
            printBtn.disabled = true;
            printBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Печать...';

            // Reset button after timeout as fallback
            const timeout = setTimeout(() => {
                if (printBtn) {
                    printBtn.disabled = false;
                    printBtn.innerHTML = originalContent;
                }
            }, 5000);

            // Handle window closed without loading
            const cleanup = function() {
                clearTimeout(timeout);
                if (printBtn) {
                    printBtn.disabled = false;
                    printBtn.innerHTML = originalContent;
                }
            };

            // Open a new print window
            const printWindow = window.open(`/projects/${projectId}/print`, '_blank');

            // Error handler if window couldn't be opened
            if (!printWindow) {
                cleanup();
                if (window.showToast) {
                    window.showToast('Не удалось открыть окно печати. Проверьте настройки блокировки всплывающих окон.', 'danger');
                }
                return;
            }

            // Listen for the page load event
            printWindow.addEventListener('load', function() {
                // Reset button state
                cleanup();

                // Call the print dialog after a small delay
                setTimeout(function() {
                    printWindow.print();
                }, 500);
            });

            // Handle window closed without loading
            printWindow.addEventListener('beforeunload', cleanup);
        } else {
            // If no button found, just open the window
            const printWindow = window.open(`/projects/${projectId}/print`, '_blank');
            if (printWindow) {
                printWindow.addEventListener('load', function() {
                    setTimeout(function() {
                        printWindow.print();
                    }, 500);
                });
            }
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize page numbering if we're on a print template
        initPageNumbering();

        // Attach event listener to print button if present
        const printBtn = document.getElementById('printProjectBtn');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                const projectId = this.dataset.projectId;
                openProjectPrintWindow(projectId);
            });
        }
    });

    // Public API
    return {
        initPageNumbering: initPageNumbering,
        openProjectPrintWindow: openProjectPrintWindow
    };
})();

// Make the module available globally
window.PrintModule = PrintModule;
