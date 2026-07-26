# ТЗ: Сохранение состояния страницы Проектов

**Проект**: CINERENTAL v0.16.x
**Модуль**: Frontend React — страница Projects
**Приоритет**: High
**Ветка**: `feature/frontend-migration`

---

## 1. Описание проблемы

Страница «Проекты» (`/projects`) теряет все пользовательские настройки при навигации: фильтры, поисковый запрос, текущая страница, размер страницы, выбранный клиент и состояние свёрнутости групп карточек. После перехода на детальную страницу проекта и нажатия «Назад» в браузере пользователь видит страницу с дефолтными настройками вместо тех, что он выставил.

## 2. Цель

Обеспечить полное сохранение и восстановление настроек страницы Проектов при любом типе навигации:

- Кнопки «Назад» / «Вперёд» в браузере
- Обновление страницы (F5)
- Переход через сайдбар
- Закрытие и повторное открытие браузера
- Прямые ссылки с параметрами

## 3. Стек

- React 18, TypeScript 5.9
- React Router v6 (`useSearchParams`)
- TanStack Query v5
- Existing: `useLocalStorage`, `useDebounce` hooks

## 4. Архитектурное решение

**Двойная персистенция: URL + localStorage.**

| Источник | Назначение | Приоритет |
|----------|-----------|-----------|
| URL search params | Back/Forward, F5, прямые ссылки | 1 (высший) |
| localStorage | Свежая навигация (сайдбар, закрытие браузера) | 2 |
| Schema defaults | Fallback при отсутствии данных | 3 |

Номер страницы (`page`) сохраняется ТОЛЬКО в URL, но НЕ в localStorage — устаревший номер страницы после изменения данных может показать пустые результаты.

---

## 5. Разбивка на задачи

### Задача 1. Создание хука `useUrlState`

**Файл**: `frontend-react/src/hooks/useUrlState.ts` (новый)
**Зависимости**: нет
**Оценка сложности**: высокая

#### Описание

Создать generic TypeScript-хук, оборачивающий `useSearchParams` из React Router v6 со следующими характеристиками:

#### Функциональные требования

1. **Schema-based API**: хук принимает схему параметров с типами (`string` | `number`), значениями по умолчанию и опциональным флагом `persist: false`
2. **Типобезопасность**: TypeScript автоматически выводит типы значений из схемы:
   - `{ type: 'number', default: 1 }` → `number`
   - `{ type: 'number', default: null }` → `number | null`
   - `{ type: 'string', default: '' }` → `string`
   - `{ type: 'string', default: null }` → `string | null`
3. **Чистые URL**: значения по умолчанию не записываются в URL (`/projects` = все дефолты)
4. **Сохранение чужих параметров**: `setParams` модифицирует только ключи из схемы, UTM-метки и прочие параметры сохраняются
5. **Защита от NaN**: `?page=abc` → fallback на значение по умолчанию. Проверка `raw === null` ДО вызова `Number()` (потому что `Number(null) === 0`)
6. **Только batch-API**: единственный метод записи — `setParams(updates)`. Отдельного `setParam` нет, т.к. `setSearchParams` React Router НЕ очерёдизирует вызовы — два последовательных вызова в одном обработчике перезаписывают друг друга
7. **`replace: true` по умолчанию**: изменения фильтров не засоряют историю браузера
8. **localStorage sync** (при наличии `storageKey`):
   - При каждом `setParams` — сохранение не-дефолтных значений в localStorage (кроме параметров с `persist: false`)
   - Очистка ключа localStorage (`removeItem`) когда все значения дефолтные
   - При монтировании с пустым URL — синхронное восстановление из localStorage
   - При монтировании с URL-параметрами — URL имеет приоритет, localStorage игнорируется
   - Обработка поврежденных данных: `try/catch` + `removeItem`

#### Нефункциональные требования

1. **Без двойного API-запроса при монтировании**: значения резолвятся синхронно в `useMemo` при первом рендере. URL-бар синхронизируется через `useLayoutEffect` (до отрисовки). TanStack Query получает корректные параметры с первого рендера
2. **Стабильность `setParams`**: обёрнут в `useCallback` со стабильными зависимостями — используется как зависимость в effects
3. **Стабильность схемы**: `useRef` внутри хука для защиты от нестабильных ссылок на объект схемы
4. **Определение «свежей навигации»**: `schemaKeys.some(key => searchParams.has(key))` — устойчиво к UTM-параметрам и другим не-схемным ключам в URL

#### Типовая система

```typescript
// Условный тип для вывода nullable/non-nullable:
// null extends D['default'] — НЕ наоборот
type InferType<D extends ParamDef> =
  null extends D['default']
    ? (D['type'] extends 'number' ? number | null : string | null)
    : (D['type'] extends 'number' ? number : string);

// values — readonly, setParams принимает Partial<MutableValues<S>> с -readonly
```

#### API хука

```typescript
const { values, setParams } = useUrlState(schema, { storageKey?: string });
```

#### Критерии приёмки

- [ ] Схема с `as const` корректно выводит типы для всех комбинаций (string/number, nullable/non-nullable)
- [ ] Дефолтные значения не появляются в URL
- [ ] Невалидные числовые параметры (`?page=abc`) возвращают дефолт
- [ ] `Number(null)` ловушка обработана (`raw === null` проверяется первым)
- [ ] localStorage записывается при каждом `setParams` (кроме `persist: false` полей)
- [ ] При пустом URL восстановление из localStorage — один API-запрос, без мерцания
- [ ] При URL с параметрами — localStorage игнорируется
- [ ] Поврежденный JSON в localStorage → fallback на дефолты, ключ удаляется
- [ ] `setParams` референциально стабилен между рендерами
- [ ] Чужие URL-параметры (UTM и пр.) не удаляются
- [ ] `npm run build` проходит без ошибок TypeScript

---

### Задача 2. Рефакторинг `PaginationControls`

**Файл**: `frontend-react/src/components/ui/pagination-controls.tsx`
**Зависимости**: нет (выполнять параллельно с Задачей 1)
**Оценка сложности**: низкая

#### Описание

Убрать внутренний вызов `onPageChange(1)` при смене размера страницы. Ответственность за сброс страницы переносится на вызывающий компонент.

#### Изменение

```typescript
// Было (строки 38-41):
onValueChange={(val) => {
    onPageSizeChange(Number(val));
    onPageChange(1);        // ← удалить
}}

// Стало:
onValueChange={(val) => {
    onPageSizeChange(Number(val));
}}
```

#### Причина

React Router's `setSearchParams` не очерёдизирует функциональные обновления как `useState`. Два вызова в одном обработчике — второй перезаписывает первый. При использовании `useUrlState` вызов `onPageSizeChange` и `onPageChange` — это два отдельных `setSearchParams`, что приводит к потере изменения `size`.

#### Затронутые компоненты (обязательный аудит)

После удаления внутреннего `onPageChange(1)`, ВСЕ потребители должны самостоятельно сбрасывать страницу:

| Файл | Текущий `onPageSizeChange` | Необходимое изменение |
|------|--------------------------|----------------------|
| `features/projects/pages/ProjectsPage.tsx` | `setSize` | Будет `setParams({ size, page: 1 })` (Задача 3) |
| `features/equipment/pages/EquipmentPage.tsx` | `setSize` | `(s) => { setSize(s); setPage(1); }` |
| `features/bookings/pages/BookingsPage.tsx` | `setSize` | `(s) => { setSize(s); setPage(1); }` |
| `features/clients/pages/ClientsPage.tsx` | `setPageSize` | `(s) => { setPageSize(s); setPage(1); }` |
| `features/equipment/components/EquipmentPicker.tsx` | `setSize` | `(s) => { setSize(s); setPage(1); }` |

#### Критерии приёмки

- [ ] `onPageChange(1)` удалён из `PaginationControls`
- [ ] Все 5 потребителей обновлены — при смене размера страницы пагинация сбрасывается на 1
- [ ] Ручная проверка: на каждой странице (Equipment, Bookings, Clients, Projects, EquipmentPicker) смена размера страницы сбрасывает на первую страницу
- [ ] `npm run build` проходит без ошибок

---

### Задача 3. Интеграция `useUrlState` в страницу Проектов

**Файл**: `frontend-react/src/features/projects/pages/ProjectsPage.tsx`
**Зависимости**: Задача 1, Задача 2
**Оценка сложности**: средняя

#### Описание

Заменить `useState`-управление фильтрами на `useUrlState` с localStorage-персистенцией.

#### 3.1 Схема параметров

Определить как module-level константу (после строки 66):

```typescript
const projectsUrlSchema = {
  page:          { type: 'number', default: 1, persist: false },
  size:          { type: 'number', default: 20 },
  search:        { type: 'string', default: '' },
  status:        { type: 'string', default: '' },
  paymentStatus: { type: 'string', default: '' },
  clientId:      { type: 'number', default: null },
  clientName:    { type: 'string', default: null },
} as const;
```

`page` имеет `persist: false` — не сохраняется в localStorage.

#### 3.2 Замена useState

**Удалить**: `page`, `size`, `search`, `status`, `paymentStatus`, `clientId`, `selectedClientName` — 7 вызовов `useState`.

**Заменить на**:
```typescript
const { values: urlState, setParams } = useUrlState(projectsUrlSchema, {
  storageKey: 'projects-filters',
});
const { page, size, status, paymentStatus, clientId, clientName: selectedClientName } = urlState;
```

**Оставить без изменений**: `clientPopoverOpen`, `clientSearch`, `debouncedClientSearch`, `viewMode`.

#### 3.3 Debounced search с ref guard

Поисковый ввод требует:
- Мгновенной обратной связи при наборе (локальный state)
- Обновления URL через 300мс debounce
- Восстановления из URL при навигации назад/вперёд

Ref guard (`lastCommittedSearch`) предотвращает бесконечные циклы между двумя effects и «прыжки» input'а под React 18 StrictMode:

```typescript
const [searchInput, setSearchInput] = useState(urlState.search);
const debouncedSearch = useDebounce(searchInput, 300);
const lastCommittedSearch = useRef(urlState.search);

// Effect 1: Debounced input → URL
useEffect(() => {
  if (debouncedSearch !== lastCommittedSearch.current) {
    lastCommittedSearch.current = debouncedSearch;
    setParams({ search: debouncedSearch, page: 1 });
  }
}, [debouncedSearch, setParams]);

// Effect 2: URL → local input (browser back/forward only)
useEffect(() => {
  if (urlState.search !== lastCommittedSearch.current) {
    lastCommittedSearch.current = urlState.search;
    setSearchInput(urlState.search);
  }
}, [urlState.search]);
```

#### 3.4 Обновление обработчиков

| Элемент | Обработчик |
|---------|-----------|
| Поисковый input | `value={searchInput}`, `onChange → setSearchInput(e.target.value)` |
| Фильтр статуса | `setParams({ status: val === 'all' ? '' : val, page: 1 })` |
| Фильтр оплаты | `setParams({ paymentStatus: val === 'all' ? '' : val, page: 1 })` |
| Выбор клиента | `setParams({ clientId: client.id, clientName: client.name, page: 1 })` |
| Сброс клиента | `setParams({ clientId: null, clientName: null, page: 1 })` |
| Смена страницы | `setParams({ page: p })` |
| Смена размера | `setParams({ size: s, page: 1 })` |

#### Критерии приёмки

- [ ] 7 вызовов `useState` заменены на один `useUrlState`
- [ ] URL обновляется при изменении любого фильтра
- [ ] Дефолтные значения не появляются в URL
- [ ] Смена любого фильтра сбрасывает page на 1
- [ ] Поиск: ввод отзывчивый, URL обновляется через 300мс после паузы
- [ ] Поиск: при навигации назад input восстанавливается без «прыжков»
- [ ] Browser Back из `/projects/42` → все фильтры и пагинация восстановлены
- [ ] Клик по сайдбару → фильтры из localStorage, page = 1
- [ ] F5 → полное восстановление из URL
- [ ] Прямая ссылка `/projects?status=ACTIVE` → URL приоритетнее localStorage

---

### Задача 4. Персистенция состояния групп карточек

**Файл**: `frontend-react/src/features/projects/pages/ProjectsPage.tsx`
**Зависимости**: нет (выполнять параллельно с Задачами 1-3)
**Оценка сложности**: низкая

#### Описание

Сохранять состояние развёрнутости/свёрнутости групп статусов в режиме карточек через `useLocalStorage`.

#### Изменения

**1. Добавить состояние в `ProjectsPage`:**

```typescript
const [groupExpanded, setGroupExpanded] = useLocalStorage<Record<string, boolean>>(
  'projects-card-groups',
  { DRAFT: true, ACTIVE: true, COMPLETED: false, CANCELLED: false }
);
```

Именование `groupExpanded` (true = развёрнуто) напрямую маппится на `isOpen` Collapsible — без двойного отрицания.

**2. Сделать `StatusGroup` контролируемым:**

```typescript
// Было:
interface StatusGroupProps {
  // ...
  defaultOpen?: boolean;
}
function StatusGroup({ defaultOpen = true }: StatusGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
}

// Стало:
interface StatusGroupProps {
  // ...
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
function StatusGroup({ isOpen, onOpenChange }: StatusGroupProps) {
  // внутренний useState удалён
}
```

**3. Обновить рендеринг:**

```typescript
<StatusGroup
  key={statusKey}
  status={statusKey}
  projects={groupedProjects[statusKey] || []}
  onNavigate={handleNavigate}
  isOpen={groupExpanded[statusKey] ?? true}
  onOpenChange={(open) => setGroupExpanded(prev => ({ ...prev, [statusKey]: open }))}
/>
```

`?? true` — новые значения enum по умолчанию развёрнуты.

#### Критерии приёмки

- [ ] Свёрнутость/развёрнутость групп сохраняется в localStorage
- [ ] После навигации и возврата — состояние групп восстановлено
- [ ] Переключение table/card и обратно — состояние сохранено
- [ ] Новый статус (если добавят в enum) — по умолчанию развёрнут (`?? true`)
- [ ] `StatusGroup` — полностью контролируемый компонент (без внутреннего state для open/close)

---

### Задача 5. Тестирование

**Зависимости**: Задачи 1–4
**Оценка сложности**: высокая

#### 5.1 Настройка тестовой инфраструктуры

В проекте `frontend-react` **отсутствует тестовый фреймворк** — нет vitest, jest, testing-library. Необходимо настроить с нуля.

**Установить зависимости:**

```bash
cd frontend-react
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Создать `vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Создать `src/test/setup.ts`:**

```typescript
import '@testing-library/jest-dom/vitest';
```

**Добавить в `package.json` скрипт:**

```json
"test": "vitest run",
"test:watch": "vitest"
```

#### 5.2 Unit-тесты `useUrlState`

**Файл**: `frontend-react/src/hooks/__tests__/useUrlState.test.ts`

Это ядро всей функциональности — требуется максимальное покрытие.

**Тест-кейсы:**

| # | Кейс | Что проверяем |
|---|------|--------------|
| 1 | Дефолтные значения | При пустом URL возвращает значения по умолчанию из схемы |
| 2 | Парсинг из URL | `?page=3&status=ACTIVE` → `{ page: 3, status: 'ACTIVE' }` |
| 3 | Невалидные числовые параметры | `?page=abc` → fallback на дефолт |
| 4 | `Number(null)` защита | Параметр отсутствует в URL → `null` (не `0`) для nullable числовых полей |
| 5 | Чистый URL при дефолтах | `setParams` с дефолтными значениями → URL без параметров |
| 6 | Сохранение чужих параметров | UTM-метки и не-схемные ключи не удаляются при `setParams` |
| 7 | Batch-обновление | `setParams({ size: 50, page: 1 })` → оба значения в URL |
| 8 | `replace: true` | `setParams` использует `replace`, не `push` |
| 9 | localStorage запись | `setParams` сохраняет не-дефолтные значения в localStorage |
| 10 | localStorage: `persist: false` | Поле `page` НЕ записывается в localStorage |
| 11 | localStorage восстановление | При пустом URL — значения из localStorage, один рендер |
| 12 | localStorage приоритет | URL с параметрами → localStorage игнорируется |
| 13 | localStorage очистка | Когда все значения дефолтные → `removeItem` |
| 14 | Поврежденный localStorage | Невалидный JSON → fallback на дефолты, ключ удаляется |
| 15 | `setParams` стабильность | Ссылка на `setParams` не меняется между рендерами |
| 16 | Nullable строковые поля | `{ type: 'string', default: null }` → корректно `null` / `string` |

**Мок React Router:**

```typescript
// Мок useSearchParams для unit-тестирования без полного Router
import { MemoryRouter } from 'react-router-dom';
import { renderHook, act } from '@testing-library/react';

function renderUrlStateHook(schema, options?, initialUrl = '/') {
  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[initialUrl]}>
      {children}
    </MemoryRouter>
  );
  return renderHook(() => useUrlState(schema, options), { wrapper });
}
```

#### 5.3 Unit-тесты `PaginationControls`

**Файл**: `frontend-react/src/components/ui/__tests__/pagination-controls.test.tsx`

| # | Кейс | Что проверяем |
|---|------|--------------|
| 1 | Смена размера страницы | `onPageSizeChange` вызывается, `onPageChange` НЕ вызывается |
| 2 | Навигация вперёд | Клик → `onPageChange(currentPage + 1)` |
| 3 | Навигация назад | Клик → `onPageChange(currentPage - 1)` |
| 4 | Disabled состояние на первой странице | Кнопка «назад» disabled |
| 5 | Disabled состояние на последней | Кнопка «вперёд» disabled |
| 6 | Отображение информации | «Стр. X из Y», «Всего: N» |

#### 5.4 Integration-тест ProjectsPage (URL state)

**Файл**: `frontend-react/src/features/projects/pages/__tests__/ProjectsPage.test.tsx`

| # | Кейс | Что проверяем |
|---|------|--------------|
| 1 | Инициализация из URL | Рендер с `?status=ACTIVE` → фильтр применён |
| 2 | Фильтр обновляет URL | Выбор статуса → URL содержит `?status=...` |
| 3 | Смена фильтра сбрасывает page | Был `?page=3&status=ACTIVE`, сменил статус → `page=1` |
| 4 | Debounced search | Ввод в поиск → URL обновляется после паузы, не на каждый символ |
| 5 | Очистка клиента | Сброс клиентского фильтра → `clientId` и `clientName` удалены из URL |

**Примечание**: Для этих тестов потребуется мокирование `projectsService` и оборачивание в `QueryClientProvider` + `MemoryRouter`.

#### 5.5 Unit-тест группы карточек

**Файл**: `frontend-react/src/features/projects/pages/__tests__/StatusGroup.test.tsx`

| # | Кейс | Что проверяем |
|---|------|--------------|
| 1 | Контролируемый isOpen | `isOpen=true` → содержимое видно; `isOpen=false` → скрыто |
| 2 | onOpenChange callback | Клик по заголовку → `onOpenChange` вызван с инвертированным значением |
| 3 | Персистенция в localStorage | `groupExpanded` записывается в localStorage при изменении |

#### Критерии приёмки

- [ ] Тестовая инфраструктура настроена: vitest + testing-library + jsdom
- [ ] `npm test` запускается и работает
- [ ] `useUrlState`: 16 тест-кейсов покрывают все edge cases
- [ ] `PaginationControls`: 6 тест-кейсов, включая проверку что `onPageChange` НЕ вызывается при смене размера
- [ ] `ProjectsPage` integration: 5 тест-кейсов на URL-синхронизацию
- [ ] `StatusGroup`: 3 тест-кейса на контролируемое поведение
- [ ] Все тесты проходят: `npm test` — зелёный
- [ ] `npm run build` по-прежнему проходит без ошибок

---

## 6. Порядок выполнения

```
Задача 1 (useUrlState hook) ──────────┐
                                       ├──→ Задача 3 (интеграция в ProjectsPage) ──→ Задача 5 (тестирование)
Задача 2 (PaginationControls) ────────┘                                                       ↑
                                                                                               │
Задача 4 (группы карточек) ── параллельно с любой задачей ─────────────────────────────────────┘
```

Задачи 1 и 2 не зависят друг от друга и могут выполняться параллельно.
Задача 3 зависит от обеих.
Задача 4 полностью независима.
Задача 5 (тестирование) выполняется после всех остальных задач, включая настройку инфраструктуры с нуля.

## 7. Итоговая матрица верификации

| #  | Проверка | Задача | Автотест |
|----|---------|--------|----------|
| 1  | Фильтры отражаются в URL при изменении | 3 | 5.4 #2 |
| 2  | Browser Back восстанавливает все настройки (вкл. page) | 3 | manual |
| 3  | Клик по сайдбару восстанавливает фильтры из localStorage (page = 1) | 1, 3 | 5.2 #11 |
| 4  | F5 восстанавливает из URL | 3 | 5.2 #2 |
| 5  | Чистый URL при дефолтных настройках | 1 | 5.2 #5 |
| 6  | Смена фильтра сбрасывает page на 1 | 3 | 5.4 #3 |
| 7  | Search: debounce 300мс, без «прыжков» при быстром наборе | 3 | 5.4 #4 |
| 8  | `?page=abc` → fallback на дефолт | 1 | 5.2 #3 |
| 9  | Смена размера страницы сбрасывает page на ВСЕХ страницах | 2 | 5.3 #1 |
| 10 | Группы карточек: состояние сохраняется между навигациями | 4 | 5.5 #3 |
| 11 | Новые статусы: группы по умолчанию развёрнуты | 4 | manual |
| 12 | Один API-запрос при mount (без двойного fetch) | 1 | 5.2 #11 |
| 13 | Поврежденный localStorage → graceful fallback | 1 | 5.2 #14 |
| 14 | `npm run build` без ошибок TypeScript | all | CI |
| 15 | `npm test` — все тесты зелёные | 5 | CI |
| 16 | `setParams` стабильность ссылки | 1 | 5.2 #15 |
| 17 | `persist: false` — page не попадает в localStorage | 1 | 5.2 #10 |
| 18 | PaginationControls: `onPageChange` не вызывается при смене размера | 2 | 5.3 #1 |

## 8. Примеры URL

| Состояние | URL |
|-----------|-----|
| Все дефолты | `/projects` |
| Фильтр по статусу | `/projects?status=ACTIVE` |
| Клиент + страница | `/projects?clientId=5&clientName=Acme%20Corp&page=2` |
| Комбинация | `/projects?search=sony&status=ACTIVE&paymentStatus=PAID&size=50` |

## 9. Поведение при навигации

| Действие | Источник данных | Результат |
|----------|----------------|-----------|
| Browser Back из `/projects/42` | URL params | Все фильтры + page восстановлены |
| F5 | URL params | Все фильтры + page восстановлены |
| Клик «Проекты» в сайдбаре | localStorage | Фильтры восстановлены, page = 1 |
| Закрытие/открытие браузера → `/projects` | localStorage | Фильтры восстановлены, page = 1 |
| Прямая ссылка `/projects?status=ACTIVE` | URL params | URL приоритетнее localStorage |
