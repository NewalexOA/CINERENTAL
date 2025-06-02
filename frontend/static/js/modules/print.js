/**
 * Print Module
 * Handles functionality related to print templates and page numbering
 */

const PrintModule = (function() {
    'use strict';

    /**
     * Generate filename for PDF based on project data
     * @param {Object} projectData - Project data object
     * @returns {string} - Generated filename
     */
    function generatePDFFilename(projectData) {
        if (!projectData) return 'project_document';

        const projectName = projectData.name || 'Проект';
        const clientName = projectData.client?.name || projectData.clientName || 'Клиент';
        const startDate = projectData.start_date || projectData.startDate;
        const endDate = projectData.end_date || projectData.endDate;

        // Format dates
        let dateRange = '';
        if (startDate && endDate) {
            const start = formatDateForFilename(startDate);
            const end = formatDateForFilename(endDate);
            dateRange = `${start}-${end}`;
        } else if (startDate) {
            dateRange = formatDateForFilename(startDate);
        } else {
            dateRange = 'Без_даты';
        }

        // Combine all parts
        const filename = `${projectName}_${clientName}_${dateRange}`;

        return sanitizeFilename(filename);
    }

    /**
     * Format date for filename (DD.MM.YYYY format)
     * @param {string|Date} dateValue - Date to format
     * @returns {string} - Formatted date
     */
    function formatDateForFilename(dateValue) {
        if (!dateValue) return '';

        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return '';

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            return `${day}.${month}.${year}`;
        } catch (e) {
            console.warn('Error formatting date for filename:', e);
            return '';
        }
    }

    /**
     * Sanitize filename by removing/replacing invalid characters
     * @param {string} filename - The filename to sanitize
     * @returns {string} - Sanitized filename
     */
    function sanitizeFilename(filename) {
        if (!filename) return 'document';

        // Replace invalid characters with safe alternatives
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')  // Invalid file characters
            .replace(/\s+/g, '_')           // Multiple spaces to single underscore
            .replace(/_{2,}/g, '_')         // Multiple underscores to single
            .replace(/^_+|_+$/g, '')        // Remove leading/trailing underscores
            .substring(0, 200);             // Limit length to prevent issues
    }

    /**
     * Update document title with generated filename
     * @param {Object} projectData - Project data for filename generation
     */
    function updateDocumentTitleWithProject(projectData) {
        try {
            const generatedFilename = generatePDFFilename(projectData);
            if (generatedFilename) {
                document.title = generatedFilename;

                // Update title element if it exists
                const titleElement = document.getElementById('document-title');
                if (titleElement) {
                    titleElement.textContent = generatedFilename;
                }
            }
        } catch (e) {
            console.warn('Error updating document title:', e);
        }
    }

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

            // Update document title for PDF filename
            updateDocumentTitleFromPageData();
        });

        window.addEventListener('afterprint', function() {
            if (pageInfoEl) {
                pageInfoEl.style.display = 'block';
            }
        });

        return true; // Successfully initialized
    }

    /**
     * Extract project data from the current page
     * @returns {Object|null} - Project data or null if not available
     */
    function extractProjectDataFromPage() {
        try {
            // Get data from body data attributes (most reliable method)
            const bodyElement = document.body;
            if (bodyElement) {
                const projectName = bodyElement.getAttribute('data-project-name');
                const clientName = bodyElement.getAttribute('data-client-name');
                const startDate = bodyElement.getAttribute('data-start-date');
                const endDate = bodyElement.getAttribute('data-end-date');

                if (projectName || clientName) {
                    return {
                        name: projectName || '',
                        clientName: clientName || '',
                        startDate: startDate || '',
                        endDate: endDate || ''
                    };
                }
            }

            // Fallback: Try to extract from visible elements
            const projectTitle = document.querySelector('.project-title');
            const clientDetail = document.querySelector('.detail-value');
            const periodDetail = document.querySelectorAll('.detail-value')[2]; // Third detail-value is period

            let projectName = '';
            let clientName = '';
            let dateRange = '';

            if (projectTitle && projectTitle.textContent) {
                projectName = projectTitle.textContent.replace('ПРОЕКТ: ', '').trim();
            }

            if (clientDetail && clientDetail.textContent) {
                // Extract client name (before phone if present)
                clientName = clientDetail.textContent.split(' | ')[0].trim();
            }

            if (periodDetail && periodDetail.textContent) {
                dateRange = periodDetail.textContent.trim();
                // Try to parse dates from the range
                const dateParts = dateRange.split(' - ');
                if (dateParts.length === 2) {
                    // Convert DD.MM.YYYY to YYYY-MM-DD for JavaScript Date parsing
                    const parseRussianDate = (dateStr) => {
                        const parts = dateStr.trim().split('.');
                        if (parts.length === 3) {
                            return `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                        return dateStr;
                    };

                    return {
                        name: projectName,
                        clientName: clientName,
                        startDate: parseRussianDate(dateParts[0]),
                        endDate: parseRussianDate(dateParts[1])
                    };
                }
            }

            if (projectName || clientName) {
                return {
                    name: projectName,
                    clientName: clientName,
                    dateRange: dateRange
                };
            }

            return null;
        } catch (e) {
            console.warn('Error extracting project data from page:', e);
            return null;
        }
    }

    /**
     * Generate filename using extracted project data
     * @returns {string} - Generated filename
     */
    function generateFilenameFromPageData() {
        const projectData = extractProjectDataFromPage();
        if (!projectData) {
            return 'project_document';
        }

        // Use the existing generatePDFFilename logic but with extracted data
        return generatePDFFilename(projectData);
    }

    /**
     * Update document title with generated filename for PDF saving
     */
    function updateDocumentTitleFromPageData() {
        try {
            const generatedFilename = generateFilenameFromPageData();
            if (generatedFilename && generatedFilename !== 'project_document') {
                document.title = generatedFilename;

                // Update title element if it exists
                const titleElement = document.getElementById('document-title');
                if (titleElement) {
                    titleElement.textContent = generatedFilename;
                }

                console.log('Updated document title for PDF:', generatedFilename);
            }
        } catch (e) {
            console.warn('Error updating document title from page data:', e);
        }
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

        // Auto-update filename on page load if we're on print page
        updateDocumentTitleFromPageData();
    });

    // Public API
    return {
        initPageNumbering: initPageNumbering,
        openProjectPrintWindow: openProjectPrintWindow,
        generatePDFFilename: generatePDFFilename,
        sanitizeFilename: sanitizeFilename,
        formatDateForFilename: formatDateForFilename,
        updateDocumentTitleWithProject: updateDocumentTitleWithProject
    };
})();

// Make the module available globally
window.PrintModule = PrintModule;
