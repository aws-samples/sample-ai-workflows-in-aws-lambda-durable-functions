import json
from unittest.mock import MagicMock, patch

import pytest
from aws_durable_execution_sdk_python_testing import DurableFunctionTestRunner

from src.parallel_invocation import handler


@pytest.fixture
def mock_bedrock():
    mock = MagicMock()
    mock.converse.return_value = {
        "output": {"message": {"content": [{"text": "Mock response"}]}}
    }
    with patch("src.utils.converse._get_bedrock", return_value=mock):
        yield mock


def test_invoke_multiple_prompts_in_parallel(mock_bedrock):
    with DurableFunctionTestRunner(handler) as runner:
        result = runner.run(input=json.dumps({"topic": "quantum computing"}))

        output = json.loads(result.result)
        assert output["topic"] == "quantum computing"
        assert len(output["perspectives"]) == 3
        assert "prompt" in output["perspectives"][0]
        assert "response" in output["perspectives"][0]
