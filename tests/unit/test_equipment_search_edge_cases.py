"""Unit tests for equipment search edge cases."""

import pytest

from backend.exceptions import ValidationError
from backend.models import Equipment
from backend.services import EquipmentService
from tests.conftest import async_test


class TestEquipmentSearchEdgeCases:
    """Test class for equipment search edge cases."""

    @async_test
    async def test_search_with_special_chars(
        self,
        service: EquipmentService,
        equipment_with_special_chars: Equipment,
    ) -> None:
        """Test searching with special characters."""
        # Search with HTML tags
        results = await service.search('<script>')
        assert len(results) == 1
        assert results[0].id == equipment_with_special_chars.id

        # Search with SQL injection
        results = await service.search('DROP TABLE')
        assert len(results) == 1
        assert results[0].id == equipment_with_special_chars.id

        # Search with special characters
        results = await service.search('!@#$%^&*()')
        assert len(results) == 1
        assert results[0].id == equipment_with_special_chars.id

        # Search with mixed special characters and normal text
        results = await service.search('Test & Equipment')
        assert len(results) == 1
        assert results[0].id == equipment_with_special_chars.id

    @async_test
    async def test_search_with_long_strings(
        self,
        service: EquipmentService,
        equipment_with_long_strings: Equipment,
    ) -> None:
        """Test searching with very long strings."""
        # Search with long query (200 chars)
        results = await service.search('A' * 200)
        assert len(results) == 1
        assert results[0].id == equipment_with_long_strings.id

        # Search with extremely long query (should still work)
        results = await service.search('B' * 1000)
        assert len(results) == 1
        assert results[0].id == equipment_with_long_strings.id

        # Search in long barcode (100 chars)
        results = await service.search('C' * 100)
        assert len(results) == 1
        assert results[0].id == equipment_with_long_strings.id

        # Search in long serial number (100 chars)
        results = await service.search('D' * 100)
        assert len(results) == 1
        assert results[0].id == equipment_with_long_strings.id

    @async_test
    async def test_search_with_unicode(
        self,
        service: EquipmentService,
        equipment_with_unicode: Equipment,
    ) -> None:
        """Test searching with Unicode characters."""
        # Search with Russian
        results = await service.search('Тестовое')
        assert len(results) == 1
        assert results[0].id == equipment_with_unicode.id

        # Search with Chinese
        results = await service.search('测试设备')
        assert len(results) == 1
        assert results[0].id == equipment_with_unicode.id

        # Search with Japanese
        results = await service.search('テスト機器')
        assert len(results) == 1
        assert results[0].id == equipment_with_unicode.id

        # Search with mixed languages
        results = await service.search('テスト-001')
        assert len(results) == 1
        assert results[0].id == equipment_with_unicode.id

    @async_test
    async def test_search_injection_attempts(
        self,
        service: EquipmentService,
        equipment_with_special_chars: Equipment,
    ) -> None:
        """Test searching with injection attempts."""
        # Test SQL injection attempts
        sql_injections = [
            '''; DROP TABLE equipment; --''',
            '''\' UNION SELECT * FROM users; --''',
            '''\' OR \'1\'=\'1''',
            '''); DROP TABLE equipment; --''',
        ]
        for injection in sql_injections:
            results = await service.search(injection)
            # Should safely handle SQL injections and return matching results
            assert isinstance(results, list)

        # Test XSS attempts
        xss_attempts = [
            '''<script>alert('XSS')</script>''',
            '''<img src=x onerror=alert('XSS')>''',
            '''javascript:alert('XSS')''',
        ]
        for xss in xss_attempts:
            results = await service.search(xss)
            # Should safely handle XSS attempts and return matching results
            assert isinstance(results, list)

        # Test NoSQL injection attempts
        nosql_injections = [
            '''{"$gt": ""}''',
            '''{"$ne": null}''',
            '''{"$where": "function() { return true; }"}''',
        ]
        for injection in nosql_injections:
            results = await service.search(injection)
            # Should safely handle NoSQL injections and return matching results
            assert isinstance(results, list)

    @async_test
    async def test_search_with_control_chars(
        self,
        service: EquipmentService,
    ) -> None:
        """Test searching with control characters."""
        control_chars = [
            '\n',  # New line
            '\r',  # Carriage return
            '\t',  # Tab
            '\b',  # Backspace
            '\x1a',  # EOF
        ]
        for char in control_chars:
            # Should handle control characters without crashing
            results = await service.search(f'test{char}test')
            assert isinstance(results, list)

    @async_test
    async def test_search_with_empty_and_whitespace(
        self,
        service: EquipmentService,
    ) -> None:
        """Test searching with empty and whitespace strings."""
        # Empty string
        with pytest.raises(ValidationError, match='Search query cannot be empty'):
            await service.search('')

        # Only spaces
        with pytest.raises(ValidationError, match='Search query cannot be empty'):
            await service.search('   ')

        # Only tabs and newlines
        with pytest.raises(ValidationError, match='Search query cannot be empty'):
            await service.search('\t\n\r')

        # Mixed whitespace
        with pytest.raises(ValidationError, match='Search query cannot be empty'):
            await service.search(' \t \n \r ')
