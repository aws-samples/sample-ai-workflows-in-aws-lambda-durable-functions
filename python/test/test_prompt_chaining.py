import json
from unittest.mock import MagicMock, patch

import pytest
from aws_durable_execution_sdk_python_testing import DurableFunctionTestRunner

from src.prompt_chaining import handler


@pytest.fixture
def mock_bedrock():
    mock = MagicMock()
    mock.converse.return_value = {
        "output": {"message": {"content": [{"text": "mocked response"}]}}
    }
    with patch("src.utils.converse._get_bedrock", return_value=mock):
        yield mock


def test_chain_llm_calls_and_return_joke_with_review(mock_bedrock):
    with DurableFunctionTestRunner(handler) as runner:
        result = runner.run(input=json.dumps({"topic": "cats"}))

        output = json.loads(result.result)
        assert output == {"joke": "mocked response", "review": "mocked response"}
        assert len(result.operations) == 2
