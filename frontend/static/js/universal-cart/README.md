# Universal Cart - Модульная архитектура

## 📁 Структура проекта

```text
frontend/static/js/universal-cart/
├── index.js                    # 🚀 Основной загрузчик модулей
├── cart-ui.js                  # 🎛️ Главный UI координатор (упрощенный)
├── core/                       # 🏗️ Основные классы
│   ├── universal-cart.js       # Главный класс корзины (бизнес-логика)
│   └── cart-storage.js         # Управление хранением данных
├── ui/                         # 🎨 UI компоненты
│   ├── cart-templates.js       # HTML шаблоны
│   ├── cart-renderer.js        # Рендеринг элементов
│   └── cart-dialogs.js         # Модальные диалоги и уведомления
├── handlers/                   # ⚡ Обработчики событий
│   └── cart-event-handler.js   # События корзины и UI взаимодействия
├── config/                     # ⚙️ Конфигурации
│   └── cart-configs.js         # Конфигурации типов корзин
├── integration/                # 🔌 Интеграции с проектом
│   └── cart-integration.js     # Интеграция с project-equipment
└── tests/                      # 🧪 Тесты
    ├── unit/
    ├── integration/
    └── e2e/
```

## 🏛️ Архитектурные принципы

### ✅ Что улучшено

1. **Single Responsibility Principle** - каждый модуль отвечает за свою область
2. **Dependency Injection** - модули получают зависимости через конструктор
3. **Separation of Concerns** - бизнес-логика, UI и обработка событий разделены
4. **Модульность** - легко тестировать и заменять отдельные части
5. **Конфигурируемость** - настройки вынесены в отдельные файлы

### 🎯 Responsibilities (Ответственности модулей)

#### 🏗️ **Core Modules**

- **UniversalCart** - бизнес-логика корзины, управление данными
- **CartStorage** - сохранение/загрузка из localStorage

#### 🎨 **UI Modules**

- **CartUI** - координация UI, делегирование задач
- **CartTemplates** - генерация HTML шаблонов
- **CartRenderer** - рендеринг элементов UI
- **CartDialogs** - модальные окна и уведомления

#### ⚡ **Event Handling**

- **CartEventHandler** - обработка всех событий UI и корзины

#### ⚙️ **Configuration & Integration**

- **cart-configs.js** - конфигурации для разных типов корзин
- **cart-integration.js** - интеграция с остальной частью приложения

## 🚀 Использование

### Базовая инициализация

```javascript
// Ждем загрузки всех модулей
document.addEventListener('universalCartReady', async () => {
    // Создаем корзину
    const cart = new UniversalCart('equipment', {
        maxItems: 50,
        autoSave: true
    });

    // Создаем UI
    const cartUI = new CartUI(cart, {
        position: 'right',
        showCostInfo: true,
        animations: true
    });

    // Инициализируем
    await cartUI.init();

    // Корзина готова!
    console.log('Universal Cart initialized!');
});
```

### Добавление элементов

```javascript
// Добавить оборудование
cart.addItem({
    id: 123,
    name: 'Canon EOS R5',
    barcode: 'CAM001',
    category: 'Камеры',
    serial_number: 'R5001',
    daily_cost: 2500,
    replacement_cost: 350000
});
```

### Настройка интеграций

```javascript
// Слушаем основное действие корзины
document.addEventListener('cart:primaryAction', (e) => {
    const cartData = e.detail;
    // Добавить все в проект
    addToProject(cartData.items);
});
```

## 🔧 API Reference

### CartUI Methods

- `init()` - инициализация UI
- `show()` - показать корзину
- `hide()` - скрыть корзину
- `toggle()` - переключить видимость
- `render()` - перерисовать UI
- `showConfirmDialog(options)` - показать диалог подтверждения
- `showLoadingDialog(message)` - показать загрузку
- `destroy()` - очистить ресурсы

### CartRenderer Methods

- `renderItem(item)` - рендер элемента корзины
- `updateSummary(summaryElement)` - обновить сводку
- `updateBadge(badgeElement)` - обновить бейдж
- `updateItemsList(itemsListElement)` - обновить список
- `trackActivity(type, itemName)` - отследить активность

### CartEventHandler Methods

- `setupEventListeners(container, toggleButton)` - настроить события
- `cleanup()` - очистить обработчики

## 📊 Метрики улучшения

### До рефакторинга

- **cart-ui.js**: 1291 строка (43KB) - монолитный класс
- **Сложность**: Высокая - все в одном файле
- **Тестируемость**: Низкая - сложно изолировать логику
- **Повторное использование**: Невозможно

### После рефакторинга

- **CartUI**: 384 строки (10KB) - координатор
- **CartRenderer**: 220 строк (8KB) - только рендеринг
- **CartEventHandler**: 380 строк (13KB) - только события
- **CartDialogs**: 350 строк (12KB) - только диалоги
- **CartTemplates**: 363 строки (15KB) - только шаблоны

### 🎯 Результат

- ✅ **Модульность**: Каждый модуль имеет четкую ответственность
- ✅ **Тестируемость**: Можно тестировать каждый модуль отдельно
- ✅ **Сопровождаемость**: Легко найти и изменить нужную функциональность
- ✅ **Расширяемость**: Просто добавлять новые возможности
- ✅ **Переиспользование**: Модули можно использовать в других проектах

## 🧪 Тестирование

```javascript
// Пример unit теста для CartRenderer
describe('CartRenderer', () => {
    let cart, templates, renderer;

    beforeEach(() => {
        cart = new UniversalCart('test');
        templates = new CartTemplates();
        renderer = new CartRenderer(cart, templates);
    });

    it('should render item correctly', () => {
        const item = { id: 1, name: 'Test Item' };
        const html = renderer.renderItem(item);
        expect(html).toContain('Test Item');
    });
});
```

## 🔄 Миграция с старой версии

Если у вас есть код, использующий старую версию:

```javascript
// Старый способ
const cartUI = new CartUI(cart);

// Новый способ
const cartUI = new CartUI(cart, {
    showCostInfo: true,
    animations: true
});
await cartUI.init();
```

## 📈 Планы развития

1. **Lazy Loading** - загрузка модулей по требованию
2. **Web Components** - превращение в веб-компоненты
3. **TypeScript** - добавление типизации
4. **Микрофронтенды** - использование в качестве независимого модуля
5. **Дополнительные интеграции** - поддержка других фреймворков

---

**Автор**: ACT-Rental Team
**Дата создания**: 2025-12-21
**Версия**: 2.0.0 (Modular Architecture)
