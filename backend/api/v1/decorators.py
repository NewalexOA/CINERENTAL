"""FastAPI typed decorators module."""

from enum import Enum
from typing import Any, Callable, TypeVar, Union

from fastapi import APIRouter

F = TypeVar('F', bound=Callable[..., Any])


def typed_get(
    router: APIRouter,
    path: str,
    *,
    response_model: Any = None,
    status_code: int = 200,
    tags: list[Union[str, Enum]] | None = None,
    **kwargs: Any,
) -> Callable[[F], F]:
    """Create a typed GET route decorator.

    Args:
        router: The FastAPI router instance
        path: The URL path for the endpoint
        response_model: The Pydantic model for the response
        status_code: HTTP status code
        tags: OpenAPI tags
        **kwargs: Additional arguments for the route

    Returns:
        A typed decorator for FastAPI GET routes
    """

    def decorator(func: F) -> F:
        # Here we're using the original FastAPI decorator
        # but with proper type hints
        decorated: F = router.get(
            path,
            response_model=response_model,
            status_code=status_code,
            tags=tags,
            **kwargs,
        )(func)
        return decorated

    return decorator
