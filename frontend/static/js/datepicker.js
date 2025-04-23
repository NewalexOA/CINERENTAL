// Initialize datepickers
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelectorAll('.datepicker').length > 0) {
        $('.datepicker').daterangepicker({
            singleDatePicker: true,
            showDropdowns: true,
            locale: {
                format: 'DD.MM.YYYY'
            }
        });
    }
});
