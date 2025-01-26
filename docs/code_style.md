# Стиль кода CINERENTAL

## Общие принципы

1. **Чистый код**
   - Код должен быть самодокументируемым
   - Понятные имена переменных и функций
   - Следование принципу DRY (Don't Repeat Yourself)
   - Следование принципу SOLID

2. **Форматирование**
   - Используется black для форматирования кода
   - Максимальная длина строки: 88 символов
   - Сортировка импортов через isort
   - Отступы: 4 пробела

3. **Документация**
   - Docstrings для всех модулей, классов и функций
   - Описание параметров и возвращаемых значений
   - Примеры использования для сложных функций
   - Type hints для всех функций

## Правила именования

1. **Файлы и модули**
   - Lowercase с подчеркиваниями
   - Понятные и описательные имена
   - Пример: `database.py`, `user_service.py`

2. **Классы**
   - PascalCase
   - Существительные
   - Пример: `UserService`, `DatabaseSession`

3. **Функции и методы**
   - snake_case
   - Глаголы или глагольные фразы
   - Пример: `get_user()`, `create_booking()`

4. **Переменные**
   - snake_case
   - Существительные
   - Пример: `user_id`, `booking_status`

5. **Константы**
   - UPPERCASE с подчеркиваниями
   - Пример: `MAX_CONNECTIONS`, `DEFAULT_TIMEOUT`

## Структура кода

1. **Импорты**
   ```python
   # Стандартная библиотека
   from typing import List, Optional
   from datetime import datetime

   # Сторонние пакеты
   from fastapi import APIRouter, Depends
   from sqlalchemy.orm import Session

   # Локальные импорты
   from app.core.config import settings
   from app.services.user import UserService
   ```

2. **Классы**
   ```python
   class UserService:
       """Service for user operations."""

       def __init__(self, db: Session):
           """Initialize service.

           Args:
               db: Database session
           """
           self.db = db

       async def get_user(self, user_id: int) -> Optional[User]:
           """Get user by ID.

           Args:
               user_id: User identifier

           Returns:
               User object if found, None otherwise
           """
           return await self.db.query(User).get(user_id)
   ```

3. **API Endpoints**
   ```python
   @router.get("/{user_id}", response_model=UserResponse)
   async def get_user(
       user_id: int,
       service: UserService = Depends(get_user_service)
   ) -> UserResponse:
       """Get user by ID.

       Args:
           user_id: User identifier
           service: User service instance

       Returns:
           User data

       Raises:
           HTTPException: If user not found
       """
       user = await service.get_user(user_id)
       if not user:
           raise HTTPException(status_code=404, detail="User not found")
       return user
   ```

## Обработка ошибок

1. **Исключения**
   - Использовать специфичные исключения
   - Добавлять информативные сообщения
   - Логировать ошибки

2. **HTTP ошибки**
   - Использовать правильные HTTP коды
   - Добавлять детальное описание ошибки
   - Структурировать ответ об ошибке

## Асинхронное программирование

1. **Корутины**
   - Использовать async/await
   - Избегать блокирующих операций
   - Правильно закрывать ресурсы

2. **Контекстные менеджеры**
   - Использовать async with
   - Правильно освобождать ресурсы

## Тестирование

1. **Unit тесты**
   - Тестировать каждую функцию
   - Использовать фикстуры
   - Мокать внешние зависимости

2. **Интеграционные тесты**
   - Тестировать взаимодействие компонентов
   - Использовать тестовую базу данных
   - Проверять все сценарии

## Git-практики

1. **Коммиты**
   - Следовать Conventional Commits
   - Писать понятные сообщения
   - Делать атомарные коммиты

2. **Ветки**
   - Создавать ветки для каждой задачи
   - Использовать feature/, bugfix/, etc.
   - Регулярно обновлять ветки
