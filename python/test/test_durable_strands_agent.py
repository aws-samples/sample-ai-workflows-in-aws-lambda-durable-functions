import json
from unittest.mock import MagicMock, patch

import pytest
from aws_durable_execution_sdk_python_testing import DurableFunctionTestRunner

from src.durable_strands_agent import handler


@pytest.fixture
def mock_strands():
    mock_agent = MagicMock()
    mock_agent.return_value.message = {"content": [{"text": "Paris"}]}
    with patch("src.durable_strands_agent.Agent", return_value=mock_agent):
        with patch("src.durable_strands_agent.BedrockModel"):
            yield mock_agent


def test_strands_agent_response_is_checkpointed(mock_strands):
    with DurableFunctionTestRunner(handler) as runner:
        result = runner.run(
            input=json.dumps({"prompt": "What is the capital of France?"})
        )

        output = json.loads(result.result)
        assert output == {
            "prompt": "What is the capital of France?",
            "response": "Paris",
        }
        assert len(result.operations) == 1
