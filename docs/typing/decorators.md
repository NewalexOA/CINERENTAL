# Типизация декораторов в FastAPI

## Проблема

При использовании декораторов FastAPI, mypy может выдавать предупреждение:
```
error: Untyped decorator makes function "health_check" untyped [misc]
```

Это происходит потому, что стандартные декораторы FastAPI не сохраняют информацию о типах декорируемой функции.

## Решение

Для корректной типизации декораторов FastAPI можно использовать следующий подход:

### 1. Определение TypeVar

Создаем TypeVar, привязанный к типу Callable для представления любой функции:

```python
from typing import Any, Callable, TypeVar

F = TypeVar('F', bound=Callable[..., Any])
```

### 2. Создание фабрики декораторов

Создаем функцию, которая возвращает типизированный декоратор:

```python
def typed_get(
    router: APIRouter,
    path: str,
    *,
    response_model: Any = None,
    **kwargs: Any,
) -> Callable[[F], F]:
    """Создает типизированный GET-декоратор."""

    def decorator(func: F) -> F:
        decorated: F = router.get(
            path,
            response_model=response_model,
            **kwargs,
        )(func)
        return decorated

    return decorator
```

### 3. Использование декоратора

```python
@typed_get(
    router,
    '/health',
    response_model=dict[str, str],
    response_class=JSONResponse,
)
async def health_check() -> dict[str, str]:
    return {'status': 'ok'}
```

## Как это работает

1. `TypeVar('F', bound=Callable[..., Any])` создает обобщенный тип, который может представлять любую функцию.

2. Сигнатура `Callable[[F], F]` указывает, что декоратор:
   - Принимает функцию типа F
   - Возвращает функцию того же типа F

3. Явная аннотация `decorated: F` говорит mypy, что декорированная функция имеет тот же тип, что и оригинальная.

## Преимущества

1. Полная типизация кода
2. Отсутствие предупреждений от mypy
3. Сохранение информации о типах декорированной функции
4. Улучшенная поддержка IDE (автодополнение, подсказки типов)

## Ограничения

1. Необходимо создавать отдельный типизированный декоратор для каждого метода (GET, POST, etc.)
2. Требуется явное указание router как первого аргумента

## Примеры

### Базовый эндпоинт

```python
@typed_get(
    router,
    '/items/{item_id}',
    response_model=Item,
    status_code=200,
)
async def get_item(item_id: int) -> Item:
    return await db.get_item(item_id)
```

### С дополнительными параметрами

```python
@typed_get(
    router,
    '/users',
    response_model=list[User],
    response_class=JSONResponse,
    status_code=200,
    tags=['users'],
    summary='Get all users',
    description='Retrieves a list of all registered users',
)
async def get_users(
    skip: int = 0,
    limit: int = 100,
) -> list[User]:
    return await db.get_users(skip=skip, limit=limit)
```

## Рекомендации

1. Создавайте отдельный модуль для типизированных декораторов
2. Используйте явные аннотации типов
3. Документируйте параметры и возвращаемые значения
4. Следите за обновлениями FastAPI и mypy
