import json
from unittest.mock import MagicMock, patch

import pytest
from aws_durable_execution_sdk_python_testing import DurableFunctionTestRunner

from src.human_review import handler


@pytest.fixture
def mock_bedrock():
    mock = MagicMock()
    mock.converse.return_value = {
        "output": {"message": {"content": [{"text": '{"amount": "$1,234.56"}'}]}}
    }
    with patch("src.utils.converse._get_bedrock", return_value=mock):
        yield mock


def test_approve_after_human_review_callback(mock_bedrock):
    with DurableFunctionTestRunner(handler) as runner:
        execution_arn = runner.run_async(input=json.dumps({"document": "Invoice #123"}))

        callback_id = runner.wait_for_callback(execution_arn, timeout=10)
        runner.send_callback_success(
            callback_id, json.dumps({"approved": True}).encode()
        )

        result = runner.wait_for_result(execution_arn)

        output = json.loads(result.result)
        assert output == {
            "status": "approved",
            "extractedFields": '{"amount": "$1,234.56"}',
        }


def test_reject_when_human_review_denies(mock_bedrock):
    with DurableFunctionTestRunner(handler) as runner:
        execution_arn = runner.run_async(input=json.dumps({"document": "Test doc"}))

        callback_id = runner.wait_for_callback(execution_arn, timeout=10)
        runner.send_callback_success(
            callback_id,
            json.dumps({"approved": False, "notes": "Invalid document"}).encode(),
        )

        result = runner.wait_for_result(execution_arn)

        output = json.loads(result.result)
        assert output == {
            "status": "rejected",
            "notes": "Invalid document",
            "extractedFields": '{"amount": "$1,234.56"}',
        }
