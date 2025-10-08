import json
from unittest.mock import MagicMock, patch

import pytest
from aws_durable_execution_sdk_python_testing import DurableFunctionTestRunner

from src.agent import handler


@pytest.fixture
def bedrock_mock():
    call_count = [0]

    def mock_converse(**kwargs):
        call_count[0] += 1
        if call_count[0] == 1:
            return {
                "stopReason": "tool_use",
                "output": {
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "toolUse": {
                                    "toolUseId": "1",
                                    "name": "get_location",
                                    "input": {},
                                }
                            }
                        ],
                    }
                },
            }
        if call_count[0] == 2:
            return {
                "stopReason": "tool_use",
                "output": {
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "toolUse": {
                                    "toolUseId": "2",
                                    "name": "get_weather",
                                    "input": {"location": "London, UK"},
                                }
                            }
                        ],
                    }
                },
            }
        if call_count[0] == 3:
            return {
                "stopReason": "tool_use",
                "output": {
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "toolUse": {
                                    "toolUseId": "3",
                                    "name": "wait_for_human_review",
                                    "input": {"question": "Is this weather correct?"},
                                }
                            }
                        ],
                    }
                },
            }
        return {
            "stopReason": "end_turn",
            "output": {
                "message": {
                    "role": "assistant",
                    "content": [{"text": "The weather in London is sunny, 72°F."}],
                }
            },
        }

    mock = MagicMock()
    mock.converse.side_effect = mock_converse
    with patch("src.agent.get_bedrock", return_value=mock):
        yield mock


def test_execute_tools_including_human_review(bedrock_mock):
    with DurableFunctionTestRunner(handler) as runner:
        execution_arn = runner.run_async(
            input=json.dumps({"prompt": "What's the weather?"})
        )

        callback_id = runner.wait_for_callback(execution_arn, timeout=10)
        runner.send_callback_success(callback_id, b"Approved")

        result = runner.wait_for_result(execution_arn)

        assert json.loads(result.result) == "The weather in London is sunny, 72°F."
