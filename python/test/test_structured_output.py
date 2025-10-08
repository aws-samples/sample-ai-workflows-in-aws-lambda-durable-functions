import json
from unittest.mock import MagicMock, patch

import pytest
from aws_durable_execution_sdk_python_testing import DurableFunctionTestRunner

from src.structured_output import handler


@pytest.fixture
def mock_bedrock():
    mock = MagicMock()
    with patch("src.utils.converse._get_bedrock", return_value=mock):
        yield mock


def test_extracts_valid_contact(mock_bedrock):
    mock_bedrock.converse.side_effect = [
        {"output": {"message": {"content": [{"text": "not valid json"}]}}},
        {
            "output": {
                "message": {
                    "content": [
                        {
                            "text": '{"name": "John", "email": "john@test.com", "company": "Acme"}'
                        }
                    ]
                }
            }
        },
    ]

    with DurableFunctionTestRunner(handler) as runner:
        result = runner.run(input=json.dumps({"text": "John from Acme, john@test.com"}))

        assert result.result is not None
        output = json.loads(result.result)
        assert output == {"name": "John", "email": "john@test.com", "company": "Acme"}
        assert len(result.operations) == 1
        assert result.operations[0].attempt == 2  # Retried once after invalid JSON
