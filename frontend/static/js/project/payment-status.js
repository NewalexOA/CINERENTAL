/**
 * Payment Status Module
 * Handles payment status display and inline captcha verification
 */

/**
 * Get CSS class for payment status badge
 * @param {string} paymentStatus - Payment status value
 * @returns {string} CSS class name
 */
export function getPaymentStatusBadgeClass(paymentStatus) {
    const statusLower = (paymentStatus || '').toLowerCase();
    return `payment-status-badge payment-status-${statusLower}`;
}

/**
 * Get Russian label for payment status
 * @param {string} paymentStatus - Payment status value
 * @returns {string} Russian label
 */
export function getPaymentStatusLabel(paymentStatus) {
    const labels = {
        'PAID': 'Оплачен',
        'PARTIALLY_PAID': 'Частично оплачен',
        'UNPAID': 'Не оплачен'
    };
    return labels[paymentStatus] || paymentStatus;
}

/**
 * Initialize payment status changer
 * @param {number} projectId - Project ID
 * @param {function} onStatusChanged - Callback when status changes
 */
export function initPaymentStatusChanger(projectId, onStatusChanged) {
    const displayContainer = document.getElementById('paymentStatusDisplay');
    const formContainer = document.getElementById('paymentStatusForm');
    const changeBtn = document.getElementById('changePaymentStatusBtn');
    const saveBtn = document.getElementById('savePaymentStatusBtn');
    const cancelBtn = document.getElementById('cancelPaymentStatusBtn');
    const selectInput = document.getElementById('paymentStatusSelect');
    const captchaInput = document.getElementById('paymentCaptchaInput');
    const captchaDots = document.querySelectorAll('.captcha-dot');
    const captchaError = document.getElementById('paymentCaptchaError');
    const statusTextBadge = document.getElementById('paymentStatusText');
    const headerBadge = document.getElementById('payment-status-badge');
    const hiddenInput = document.getElementById('project-payment-status');

    if (!displayContainer || !formContainer) {
        console.warn('Payment status elements not found');
        return;
    }

    // Show form on change button click
    changeBtn.addEventListener('click', () => {
        displayContainer.style.display = 'none';
        formContainer.style.display = 'block';
        captchaInput.value = '';
        updateCaptchaDots(0);
        captchaInput.classList.remove('is-invalid');
        captchaInput.focus();
    });

    // Hide form on cancel
    cancelBtn.addEventListener('click', () => {
        formContainer.style.display = 'none';
        displayContainer.style.display = 'block';
        captchaInput.value = '';
        updateCaptchaDots(0);
        captchaInput.classList.remove('is-invalid');
    });

    // Update captcha dots as user types
    captchaInput.addEventListener('input', (e) => {
        // Only allow digits
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
        updateCaptchaDots(e.target.value.length);
        captchaInput.classList.remove('is-invalid');
    });

    // Submit on Enter key
    captchaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveBtn.click();
        }
    });

    // Save payment status
    saveBtn.addEventListener('click', async () => {
        const newStatus = selectInput.value;
        const captchaCode = captchaInput.value;

        if (captchaCode.length !== 4) {
            captchaInput.classList.add('is-invalid');
            captchaInput.focus();
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Сохранение...';

        try {
            const response = await fetch(`/api/v1/projects/${projectId}/payment-status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_status: newStatus,
                    captcha_code: captchaCode
                })
            });

            if (!response.ok) {
                const errorType = response.headers.get('X-Error-Type');
                if (errorType === 'CAPTCHA_ERROR') {
                    captchaInput.classList.add('is-invalid');
                    captchaInput.value = '';
                    updateCaptchaDots(0);
                    captchaInput.focus();
                    throw new Error('Неверный код подтверждения');
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка при обновлении статуса');
            }

            const updatedProject = await response.json();

            // Update UI
            updatePaymentStatusUI(updatedProject.payment_status, statusTextBadge, headerBadge, hiddenInput);

            // Hide form
            formContainer.style.display = 'none';
            displayContainer.style.display = 'block';
            captchaInput.value = '';
            updateCaptchaDots(0);

            // Show success toast
            showToast('Статус оплаты обновлен', 'success');

            // Call callback
            if (onStatusChanged) {
                onStatusChanged(updatedProject.payment_status);
            }

        } catch (error) {
            console.error('Error updating payment status:', error);
            if (!captchaInput.classList.contains('is-invalid')) {
                showToast(error.message, 'error');
            }
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Сохранить';
        }
    });

    /**
     * Update captcha dots based on input length
     * @param {number} filledCount - Number of filled dots
     */
    function updateCaptchaDots(filledCount) {
        captchaDots.forEach((dot, index) => {
            if (index < filledCount) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }

    /**
     * Update payment status in UI
     * @param {string} newStatus - New payment status
     * @param {HTMLElement} textBadge - Status text badge element
     * @param {HTMLElement} headerBadge - Header badge element
     * @param {HTMLElement} hiddenInput - Hidden input element
     */
    function updatePaymentStatusUI(newStatus, textBadge, headerBadge, hiddenInput) {
        const label = getPaymentStatusLabel(newStatus);
        const badgeClass = getPaymentStatusBadgeClass(newStatus);

        // Update text badge in card
        if (textBadge) {
            textBadge.className = `badge ${badgeClass} fs-6`;
            textBadge.textContent = label;
            textBadge.classList.add('updated');
            setTimeout(() => textBadge.classList.remove('updated'), 500);
        }

        // Update header badge
        if (headerBadge) {
            headerBadge.className = `badge ${badgeClass} fs-6 ms-2`;
            headerBadge.textContent = label;
            headerBadge.classList.add('updated');
            setTimeout(() => headerBadge.classList.remove('updated'), 500);
        }

        // Update hidden input
        if (hiddenInput) {
            hiddenInput.value = newStatus;
        }

        // Update select value
        if (selectInput) {
            selectInput.value = newStatus;
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Toast type (success, error)
     */
    function showToast(message, type) {
        // Use global toast function if available, otherwise create simple alert
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.toastr) {
            toastr[type](message);
        } else {
            // Fallback to simple notification
            const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
            const alertHtml = `
                <div class="alert ${alertClass} alert-dismissible fade show position-fixed"
                     style="top: 20px; right: 20px; z-index: 9999;" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', alertHtml);
            setTimeout(() => {
                const alert = document.querySelector('.alert.position-fixed');
                if (alert) alert.remove();
            }, 3000);
        }
    }
}
