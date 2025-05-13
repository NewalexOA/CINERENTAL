# Типизация декораторов в FastAPI

## Проблема

При использовании декораторов FastAPI, mypy может выдавать предупреждение:

```text
error: Untyped decorator makes function "health_check" untyped [misc]
```

Это происходит потому, что стандартные декораторы FastAPI не сохраняют информацию о типах декорируемой функции.

## Решение

Для корректной типизации декораторов FastAPI можно использовать два подхода:

### Подход 1: Использование TypeVar с Callable

Этот подход подходит для простых случаев, когда все функции имеют одинаковую сигнатуру:

```python
from typing import Any, Callable, TypeVar

F = TypeVar('F', bound=Callable[..., Any])

def typed_get(
    router: APIRouter,
    path: str,
    **kwargs: Any,
) -> Callable[[F], F]:
    def decorator(func: F) -> F:
        decorated: F = router.get(path, **kwargs)(func)
        return decorated
    return decorator
```

### Подход 2: Использование ParamSpec (рекомендуемый)

Этот подход более гибкий и позволяет сохранить точную информацию о параметрах функции:

```python
from typing import Any, Callable, ParamSpec, TypeVar

P = ParamSpec('P')  # Для сохранения информации о параметрах
T = TypeVar('T')    # Для сохранения информации о возвращаемом типе

def typed_get(
    router: APIRouter,
    path: str,
    **kwargs: Any,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        decorated: Callable[P, T] = router.get(path, **kwargs)(func)
        return decorated
    return decorator
```

## Как это работает

1. `ParamSpec('P')` создает спецификацию параметров, которая может представлять любой набор аргументов функции.
2. `TypeVar('T')` создает переменную типа для возвращаемого значения.
3. `Callable[P, T]` представляет функцию с параметрами P и возвращаемым типом T.
4. Сигнатура `Callable[[Callable[P, T]], Callable[P, T]]` указывает, что декоратор:
   - Принимает функцию с параметрами P и возвращаемым типом T
   - Возвращает функцию с теми же параметрами P и возвращаемым типом T

## Преимущества ParamSpec

1. Сохраняет точную информацию о всех параметрах функции
2. Поддерживает позиционные и именованные аргументы
3. Работает с async функциями
4. Обеспечивает лучшую поддержку IDE

## Примеры

### Простой эндпоинт

```python
@typed_get(
    router,
    '/health',
    response_model=dict[str, str],
)
async def health_check() -> dict[str, str]:
    return {'status': 'ok'}
```

### Эндпоинт с параметрами

```python
@typed_get(
    router,
    '/items/{item_id}',
    response_model=Item,
    status_code=200,
)
async def get_item(
    item_id: int,
    q: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Item:
    return await db.get_item(item_id)
```

## Рекомендации

1. Используйте `ParamSpec` для максимальной типобезопасности
2. Создавайте отдельный модуль для типизированных декораторов
3. Документируйте параметры и возвращаемые значения
4. Следите за обновлениями FastAPI и mypy

## Ограничения

1. Требуется Python 3.10+ для использования `ParamSpec`
2. Необходимо создавать отдельный типизированный декоратор для каждого метода (GET, POST, etc.)
3. Может потребоваться дополнительная настройка mypy
