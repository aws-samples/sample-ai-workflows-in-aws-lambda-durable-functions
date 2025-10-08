import json
from unittest.mock import MagicMock, patch

import pytest
from aws_durable_execution_sdk_python_testing import DurableFunctionTestRunner

from src.llm_as_judge import handler
from src.utils.constants import MODEL


@pytest.fixture
def mock_bedrock():
    def mock_converse(**kwargs):
        model_id = kwargs.get("modelId", "")
        if model_id == MODEL["SMALL"]:
            return {"output": {"message": {"content": [{"text": "Answer Small"}]}}}
        if model_id == MODEL["MEDIUM"]:
            return {"output": {"message": {"content": [{"text": "Answer Medium"}]}}}
        # Judge response - pick index 1 (Small model)
        return {
            "output": {
                "message": {
                    "content": [{"text": '{"bestIndex": 1, "reasoning": "test"}'}]
                }
            }
        }

    mock = MagicMock()
    mock.converse.side_effect = mock_converse
    with patch("src.utils.converse._get_bedrock", return_value=mock):
        yield mock


def test_get_responses_from_multiple_models_and_pick_best(mock_bedrock):
    with DurableFunctionTestRunner(handler) as runner:
        result = runner.run(
            input=json.dumps(
                {"question": "Explain why the sky is blue in one sentence"}
            )
        )

        output = json.loads(result.result)
        assert output["question"] == "Explain why the sky is blue in one sentence"
        assert output["bestAnswer"] == "Answer Small"
