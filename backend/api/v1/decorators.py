"""API decorators module.

This module provides typed decorators for FastAPI routes.
"""

from typing import Callable, Optional, ParamSpec, Type, TypeVar, cast

from fastapi import APIRouter
from fastapi.responses import JSONResponse

T = TypeVar('T')
P = ParamSpec('P')
R = TypeVar('R')


def typed_get(
    router: APIRouter,
    path: str,
    *,
    response_model: Optional[Type[T]] = None,
    status_code: Optional[int] = None,
    response_class: Type[JSONResponse] = JSONResponse,
    response_model_exclude_none: bool = False,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Typed GET decorator.

    Args:
        router: FastAPI router
        path: URL path
        response_model: Response model type
        status_code: HTTP status code
        response_class: Response class
        response_model_exclude_none: Whether to exclude None values

    Returns:
        Decorated function
    """
    decorator = router.get(
        path,
        response_model=response_model,
        status_code=status_code,
        response_class=response_class,
        response_model_exclude_none=response_model_exclude_none,
    )
    return cast(Callable[[Callable[P, R]], Callable[P, R]], decorator)


def typed_post(
    router: APIRouter,
    path: str,
    *,
    response_model: Optional[Type[T]] = None,
    status_code: Optional[int] = None,
    response_class: Type[JSONResponse] = JSONResponse,
    response_model_exclude_none: bool = False,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Typed POST decorator.

    Args:
        router: FastAPI router
        path: URL path
        response_model: Response model type
        status_code: HTTP status code
        response_class: Response class
        response_model_exclude_none: Whether to exclude None values

    Returns:
        Decorated function
    """
    decorator = router.post(
        path,
        response_model=response_model,
        status_code=status_code,
        response_class=response_class,
        response_model_exclude_none=response_model_exclude_none,
    )
    return cast(Callable[[Callable[P, R]], Callable[P, R]], decorator)


def typed_put(
    router: APIRouter,
    path: str,
    *,
    response_model: Optional[Type[T]] = None,
    status_code: Optional[int] = None,
    response_class: Type[JSONResponse] = JSONResponse,
    response_model_exclude_none: bool = False,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Typed PUT decorator.

    Args:
        router: FastAPI router
        path: URL path
        response_model: Response model type
        status_code: HTTP status code
        response_class: Response class
        response_model_exclude_none: Whether to exclude None values

    Returns:
        Decorated function
    """
    decorator = router.put(
        path,
        response_model=response_model,
        status_code=status_code,
        response_class=response_class,
        response_model_exclude_none=response_model_exclude_none,
    )
    return cast(Callable[[Callable[P, R]], Callable[P, R]], decorator)


def typed_delete(
    router: APIRouter,
    path: str,
    *,
    response_model: Optional[Type[T]] = None,
    status_code: Optional[int] = None,
    response_class: Type[JSONResponse] = JSONResponse,
    response_model_exclude_none: bool = False,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Typed DELETE decorator.

    Args:
        router: FastAPI router
        path: URL path
        response_model: Response model type
        status_code: HTTP status code
        response_class: Response class
        response_model_exclude_none: Whether to exclude None values

    Returns:
        Decorated function
    """
    decorator = router.delete(
        path,
        response_model=response_model,
        status_code=status_code,
        response_class=response_class,
        response_model_exclude_none=response_model_exclude_none,
    )
    return cast(Callable[[Callable[P, R]], Callable[P, R]], decorator)


def typed_patch(
    router: APIRouter,
    path: str,
    *,
    response_model: Optional[Type[T]] = None,
    status_code: Optional[int] = None,
    response_class: Type[JSONResponse] = JSONResponse,
    response_model_exclude_none: bool = False,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Typed PATCH decorator.

    Args:
        router: FastAPI router
        path: URL path
        response_model: Response model type
        status_code: HTTP status code
        response_class: Response class
        response_model_exclude_none: Whether to exclude None values

    Returns:
        Decorated function
    """
    decorator = router.patch(
        path,
        response_model=response_model,
        status_code=status_code,
        response_class=response_class,
        response_model_exclude_none=response_model_exclude_none,
    )
    return cast(Callable[[Callable[P, R]], Callable[P, R]], decorator)
