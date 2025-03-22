# JavaScript Libraries

Эта директория содержит сторонние JavaScript библиотеки, необходимые для работы приложения:

* `moment.min.js` - Библиотека для работы с датами и временем
* `daterangepicker.min.js` - Компонент для выбора диапазона дат

## Внимание

Эти файлы должны быть включены в Docker-образ при сборке. Они должны быть доступны по путям:

- `/app/frontend/static/js/lib/moment.min.js`
- `/app/frontend/static/js/lib/daterangepicker.min.js`

При изменении Docker-образа убедитесь, что эти файлы включены. 