# Universal Cart - Универсальная корзина для ACT-Rental

## 📖 Обзор

Universal Cart - это гибкая система корзины для временного хранения оборудования с поддержкой двух режимов отображения: **floating overlay** (плавающее окно) и **embedded inline** (встроенный блок). Система позволяет добавлять оборудование через поиск или сканер, управлять количеством и выполнять массовые операции.

## 🎯 Ключевые возможности

- ✅ **Два режима отображения**: floating overlay и embedded inline
- ✅ **Автоматическое определение режима** по наличию контейнера на странице
- ✅ **localStorage persistence** - сохранение состояния между сессиями
- ✅ **Конфигурируемые типы корзин** для разных страниц/операций
- ✅ **Интеграция с поиском оборудования** и сканером штрих-кодов
- ✅ **Управление количеством** с валидацией и ограничениями
- ✅ **Массовые операции** - добавление всей корзины в проект
- ✅ **Event-driven архитектура** с подписками и уведомлениями

## 📁 Структура проекта

```text
frontend/static/js/universal-cart/
├── index.js                    # 🚀 Главный загрузчик и автоинициализация
├── cart-ui.js                  # 🎛️ UI класс с поддержкой embedded/floating режимов
├── core/                       # 🏗️ Основные классы
│   ├── universal-cart.js       # Главный класс корзины (бизнес-логика)
│   └── cart-storage.js         # Управление localStorage с compression
├── ui/                         # 🎨 UI компоненты
│   ├── cart-templates.js       # HTML шаблоны для элементов
│   ├── cart-renderer.js        # Рендеринг и обновление UI
│   └── cart-dialogs.js         # Модальные диалоги и уведомления
├── handlers/                   # ⚡ Обработчики событий
│   └── cart-event-handler.js   # События UI и взаимодействия
├── config/                     # ⚙️ Конфигурации
│   └── cart-configs.js         # Настройки типов корзин (PROJECT_VIEW, etc.)
├── integration/                # 🔌 Интеграции
│   └── cart-integration.js     # Интеграция с project-equipment поиском
└── tests/                      # 🧪 Тесты
    └── universal-cart.test.js  # Unit тесты
```

## 🏗️ Архитектура

### Основные компоненты

#### 1. **UniversalCart** (core/universal-cart.js)

- Главный класс управления данными корзины
- Методы: `addItem()`, `removeItem()`, `updateQuantity()`, `clear()`
- Event emitter для уведомлений о изменениях
- Валидация и бизнес-логика

#### 2. **CartUI** (cart-ui.js)

- Координатор пользовательского интерфейса
- **Embedded mode**: встроенный блок на странице проекта
- **Floating mode**: плавающее overlay окно
- Автоматическое определение режима по наличию `#universalCartContainer`
- Методы: `init()`, `show()`, `hide()`, `render()`

#### 3. **CartStorage** (core/cart-storage.js)

- Управление localStorage с unique keys по типу корзины
- Компрессия данных для оптимизации
- Автоматическое сохранение изменений

#### 4. **CartEventHandler** (handlers/cart-event-handler.js)

- Обработка всех событий UI (клики, ввод, drag&drop)
- Разделение логики для embedded/floating режимов
- Предотвращение нежелательного скрытия в embedded режиме

#### 5. **CartIntegration** (integration/cart-integration.js)

- Интеграция с поиском оборудования
- Обработка массового выбора через чекбоксы
- Интеграция со сканером штрих-кодов

## 🎨 Режимы отображения

### 1. Embedded Mode (встроенный)

```html
<!-- На странице проекта между разделами -->
<div class="card mb-4 universal-cart-hidden" id="universalCartContainer">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">
            <i class="fas fa-shopping-cart me-2"></i>
            Корзина оборудования
        </h5>
        <div class="d-flex align-items-center">
            <span class="badge bg-primary me-3" id="cartItemCount">0 позиций</span>
            <button class="btn-close" id="closeCartBtn" title="Скрыть корзину"></button>
        </div>
    </div>
    <div class="card-body">
        <div id="cartContent"><!-- Cart items here --></div>
        <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
            <button type="button" class="btn btn-outline-secondary" id="clearCartBtn">
                Очистить корзину
            </button>
            <button type="button" class="btn btn-primary" id="addCartToProjectBtn">
                Добавить в проект
            </button>
        </div>
    </div>
</div>
```

**Особенности embedded режима:**

- Корзина встроена в поток страницы между разделами
- Автоматически показывается при добавлении товаров
- Кнопка закрытия не скрывает корзину полностью (остается в DOM)
- События "клик вне корзины" и "Escape" игнорируются

### 2. Floating Mode (плавающий)

- Overlay окно поверх контента
- Кнопка-тогглер для показа/скрытия
- Можно закрыть кликом вне корзины или Escape
- Позиционирование: fixed/absolute

## 🔧 Использование

### Автоматическая инициализация

```javascript
// Universal Cart автоматически инициализируется при загрузке страницы
// и определяет режим по URL и наличию контейнера

// Для проектов (/projects/\d+) автоматически выбирается PROJECT_VIEW_CONFIG
// Если найден #universalCartContainer - включается embedded режим
```

### Ручная инициализация

```javascript
// Импорт модуля
import './universal-cart/index.js';

// Доступ к экземпляру через window.universalCart
if (window.universalCart) {
    // Добавить товар
    window.universalCart.addItem({
        id: '123',
        name: 'Canon EOS R5',
        barcode: 'CAM001',
        category: 'Камеры',
        serial_number: 'R5001',
        quantity: 1
    });

    // Показать корзину
    window.universalCart.ui.show();
}
```

### Интеграция с поиском оборудования

```javascript
// Массовое добавление выбранного оборудования
function addSelectedEquipmentToCart() {
    const selectedRows = document.querySelectorAll('input[name="equipment_ids"]:checked');
    selectedRows.forEach(checkbox => {
        const equipmentData = extractEquipmentDataFromRow(checkbox.closest('tr'));
        window.universalCart.addItem(equipmentData);
    });
}
```

## ⚙️ Конфигурация

### Типы корзин (config/cart-configs.js)

#### PROJECT_VIEW_CONFIG

```javascript
const PROJECT_VIEW_CONFIG = {
    type: 'project_view',
    name: 'Добавить в проект',

    // Capacity settings
    maxItems: 50,
    maxQuantityPerItem: 10,

    // Storage settings
    enableStorage: true,
    autoSave: true,
    storageKey: 'act_rental_project_cart',

    // UI settings
    showQuantityControls: true,
    showRemoveButtons: true,
    showClearButton: true,
    showToggleButton: false,  // No toggle in embedded mode

    // Behavior settings
    allowDuplicates: false,
    autoShowOnAdd: true,
    hideOnEmpty: false,  // For debugging - normally true
    confirmBeforeClear: true,

    // Validation rules
    validation: {
        required: ['id', 'name'],
        unique: 'id',
        maxQuantity: 10
    },

    // UI text customization
    text: {
        title: 'Корзина оборудования',
        emptyMessage: 'Корзина пуста',
        addButton: 'Добавить в проект',
        clearButton: 'Очистить корзину',
        removeButton: 'Удалить',
        quantityLabel: 'Количество',
        totalLabel: 'Всего позиций'
    }
};
```

### Автоматическое определение типа корзины

```javascript
// В index.js
function detectCartType() {
    const currentPath = window.location.pathname;

    // Project view page
    if (currentPath.match(/\/projects\/\d+$/)) {
        return 'project_view';
    }

    // Equipment list page
    if (currentPath.includes('/equipment')) {
        return 'equipment_list';
    }

    return 'default';
}
```

## 🎛️ API Reference

### UniversalCart Methods

- `addItem(item)` - добавить товар в корзину
- `removeItem(itemId)` - удалить товар
- `updateQuantity(itemId, quantity)` - изменить количество
- `getItem(itemId)` - получить товар по ID
- `getItems()` - получить все товары
- `getItemCount()` - получить общее количество
- `clear()` - очистить корзину
- `on(event, callback)` - подписаться на событие

### CartUI Methods

- `init()` - инициализация UI
- `show()` - показать корзину
- `hide()` - скрыть корзину
- `toggle()` - переключить видимость
- `render()` - перерисовать содержимое
- `showConfirmDialog(options)` - показать диалог подтверждения
- `destroy()` - очистить ресурсы

### События

- `itemAdded` - товар добавлен в корзину
- `itemRemoved` - товар удален из корзины
- `itemUpdated` - количество товара изменено
- `cleared` - корзина очищена
- `error` - произошла ошибка

## 🐛 Отладка

### Debug режим

```javascript
// В конфигурации включен debug: true
const config = {
    debug: true,  // Включает подробное логирование
    // ...
};
```

### Логи в консоли

- `[UniversalCart]` - основная логика корзины
- `[CartUI]` - UI операции и рендеринг
- `[CartStorage]` - операции с localStorage
- `[CartEventHandler]` - обработка событий
- `[CartIntegration]` - интеграция с поиском/сканером

### Инспекция состояния

```javascript
// В DevTools Console
console.log('Cart instance:', window.universalCart);
console.log('Cart items:', window.universalCart.getItems());
console.log('Cart UI debug:', window.universalCart.ui.getDebugInfo());
```

## 🔄 Миграция и обновления

### Последние изменения

**v2.1.0 - Embedded Mode Support**:

- ✅ Добавлена поддержка embedded режима для страниц проектов
- ✅ Автоматическое определение режима по наличию контейнера
- ✅ Исправлены проблемы с нежелательным скрытием в embedded режиме
- ✅ Улучшена интеграция с project-equipment поиском
- ✅ Добавлены debug логи для troubleshooting

**Критические исправления:**

- 🐛 Fix: `CartUI.init()` не вызывался из конструктора - добавлен `await ui.init()`
- 🐛 Fix: Outside click и Escape скрывали embedded корзину - добавлены проверки `isEmbedded`
- 🐛 Fix: Кнопка закрытия вызывала `window.universalCart.hide()` вместо `ui.hide()`
- 🐛 Fix: Конфигурация `hideOnEmpty: true` скрывала корзину с товарами

### Планы развития

- [ ] **Web Components** - превращение в переиспользуемые компоненты
- [ ] **TypeScript** - добавление типизации для лучшей поддержки IDE
- [ ] **Тестирование** - расширение покрытия unit и integration тестами
- [ ] **Lazy Loading** - загрузка модулей по требованию
- [ ] **Accessibility** - улучшение поддержки screen readers и клавиатурной навигации

---

**Автор**: ACT-Rental Team
**Дата обновления**: 2025-06-26
**Версия**: 2.1.0 (Embedded Mode Support)
