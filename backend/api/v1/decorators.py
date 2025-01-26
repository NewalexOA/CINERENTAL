"""FastAPI typed decorators module."""

from enum import Enum
from typing import Any, Callable, ParamSpec, TypeVar, Union

from fastapi import APIRouter

P = ParamSpec('P')
T = TypeVar('T')


def typed_get(
    router: APIRouter,
    path: str,
    *,
    response_model: Any = None,
    status_code: int = 200,
    tags: list[Union[str, Enum]] | None = None,
    **kwargs: Any,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Create a typed GET route decorator.

    This decorator factory creates a type-safe decorator for FastAPI GET routes.
    It preserves the type information of the decorated function while adding
    the FastAPI route registration.

    Args:
        router: The FastAPI router instance
        path: The URL path for the endpoint
        response_model: The Pydantic model for the response
        status_code: HTTP status code
        tags: OpenAPI tags
        **kwargs: Additional arguments for the route

    Returns:
        A typed decorator that preserves the original function's signature
        including all positional and keyword arguments.

    Example:
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
    """

    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        # Here we're using the original FastAPI decorator
        # but with proper type hints
        decorated: Callable[P, T] = router.get(
            path,
            response_model=response_model,
            status_code=status_code,
            tags=tags,
            **kwargs,
        )(func)
        return decorated

    return decorator
