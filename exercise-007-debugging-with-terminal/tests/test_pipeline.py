"""Tests for the transaction processing pipeline."""

import pytest
from datetime import datetime
from decimal import Decimal

from src.models import Transaction, TransactionType, TransactionStatus, BatchSummary
from src.pipeline import ValidationStage, EnrichmentStage, ReconciliationStage, ValidationError
from src.batch_processor import BatchProcessor, ResultCollector


def make_transaction(**kwargs) -> Transaction:
    """Helper to create test transactions with sensible defaults."""
    defaults = {
        "id": "TXN-TEST-001",
        "account_id": "ACC-1001",
        "amount": Decimal("1000.00"),
        "currency": "USD",
        "type": TransactionType.DEBIT,
        "timestamp": datetime(2024, 11, 15, 10, 0, 0),
        "description": "Test transaction",
    }
    defaults.update(kwargs)
    return Transaction(**defaults)


class TestValidationStage:
    def test_valid_transaction_passes(self):
        stage = ValidationStage()
        txn = make_transaction()
        result = stage.process(txn)
        assert result.status == TransactionStatus.VALIDATED

    def test_zero_amount_fails(self):
        stage = ValidationStage()
        txn = make_transaction(amount=Decimal("0"))
        with pytest.raises(ValidationError):
            stage.process(txn)

    def test_negative_amount_fails(self):
        stage = ValidationStage()
        txn = make_transaction(amount=Decimal("-100"))
        with pytest.raises(ValidationError):
            stage.process(txn)

    def test_invalid_currency_fails(self):
        stage = ValidationStage()
        txn = make_transaction(currency="XYZ")
        with pytest.raises(ValidationError):
            stage.process(txn)

    def test_reversal_without_reference_fails(self):
        stage = ValidationStage()
        txn = make_transaction(type=TransactionType.REVERSAL, reference=None)
        with pytest.raises(ValidationError):
            stage.process(txn)

    def test_reversal_with_reference_passes(self):
        stage = ValidationStage()
        txn = make_transaction(type=TransactionType.REVERSAL, reference="TXN-ORIG-001")
        result = stage.process(txn)
        assert result.status == TransactionStatus.VALIDATED

    def test_max_amount_boundary(self):
        stage = ValidationStage()
        txn = make_transaction(amount=Decimal("999999999.99"))
        result = stage.process(txn)
        assert result.status == TransactionStatus.VALIDATED

    def test_over_max_amount_fails(self):
        stage = ValidationStage()
        txn = make_transaction(amount=Decimal("1000000000.00"))
        with pytest.raises(ValidationError):
            stage.process(txn)


class TestEnrichmentStage:
    def test_adds_usd_equivalent(self):
        stage = EnrichmentStage()
        txn = make_transaction(amount=Decimal("100.00"), currency="EUR")
        result = stage.process(txn)
        assert "usd_equivalent" in result.metadata
        assert Decimal(result.metadata["usd_equivalent"]) == Decimal("108.00")

    def test_usd_equivalent_for_domestic(self):
        stage = EnrichmentStage()
        txn = make_transaction(amount=Decimal("500.00"), currency="USD")
        result = stage.process(txn)
        assert Decimal(result.metadata["usd_equivalent"]) == Decimal("500.00")

    def test_resolves_counterparty(self):
        stage = EnrichmentStage()
        txn = make_transaction(counterparty="VENDOR-A1B2C3D4")
        result = stage.process(txn)
        assert "counterparty_name" in result.metadata
        assert result.metadata["counterparty_name"] == "Entity-VENDOR-A"

    def test_adds_risk_score(self):
        stage = EnrichmentStage()
        txn = make_transaction(amount=Decimal("100.00"))
        result = stage.process(txn)
        assert "risk_score" in result.metadata
        assert result.metadata["risk_score"] == 0

    def test_high_amount_increases_risk(self):
        stage = EnrichmentStage()
        txn = make_transaction(amount=Decimal("6000.00"))
        result = stage.process(txn)
        assert result.metadata["risk_score"] >= 30

    def test_foreign_currency_increases_risk(self):
        stage = EnrichmentStage()
        txn = make_transaction(amount=Decimal("100.00"), currency="EUR")
        result = stage.process(txn)
        assert result.metadata["risk_score"] >= 20

    def test_status_set_to_enriched(self):
        stage = EnrichmentStage()
        txn = make_transaction()
        result = stage.process(txn)
        assert result.status == TransactionStatus.ENRICHED


class TestReconciliationStage:
    def test_auto_matches_without_expected(self):
        stage = ReconciliationStage()
        txn = make_transaction()
        result = stage.process(txn)
        assert result.status == TransactionStatus.RECONCILED

    def test_matches_correct_amount(self):
        expected = {"TXN-TEST-001": {"amount": "1000.00"}}
        stage = ReconciliationStage(expected_records=expected)
        txn = make_transaction()
        result = stage.process(txn)
        assert result.status == TransactionStatus.RECONCILED

    def test_fails_on_amount_mismatch(self):
        expected = {"TXN-TEST-001": {"amount": "999.00"}}
        stage = ReconciliationStage(expected_records=expected)
        txn = make_transaction()
        result = stage.process(txn)
        assert result.status == TransactionStatus.FAILED
        assert "reconciliation_notes" in result.metadata


class TestResultCollector:
    def test_collects_and_flushes(self):
        collector = ResultCollector("test-batch")
        txn = make_transaction()
        txn.status = TransactionStatus.RECONCILED
        collector.add_result(txn)
        summary = collector.flush()
        assert summary.total_transactions == 1
        assert summary.reconciled == 1

    def test_double_flush_returns_empty(self):
        collector = ResultCollector("test-batch")
        txn = make_transaction()
        collector.add_result(txn)
        collector.flush()
        second = collector.flush()
        assert second.total_transactions == 0

    def test_multiple_statuses(self):
        collector = ResultCollector("test-batch")
        txn1 = make_transaction(id="TXN-1", amount=Decimal("200.00"))
        txn1.status = TransactionStatus.RECONCILED
        txn2 = make_transaction(id="TXN-2", amount=Decimal("300.00"))
        txn2.status = TransactionStatus.FAILED
        collector.add_result(txn1)
        collector.add_result(txn2)
        summary = collector.flush()
        assert summary.reconciled >= 1
        assert summary.failed >= 1


class TestBatchProcessor:
    def test_processes_single_batch(self):
        processor = BatchProcessor(max_workers=2)
        transactions = [make_transaction(id=f"TXN-{i}") for i in range(10)]
        summary = processor.process_batch(transactions, batch_id="test-001")
        assert summary.total_transactions >= 10
        assert summary.reconciled + summary.failed >= 10

    def test_history_tracking(self):
        processor = BatchProcessor(max_workers=2)
        transactions = [make_transaction(id=f"TXN-{i}") for i in range(5)]
        processor.process_batch(transactions, batch_id="hist-001")
        assert len(processor.get_history()) == 1
        assert processor.get_total_processed() >= 5

    def test_handles_validation_failures(self):
        processor = BatchProcessor(max_workers=2)
        transactions = [
            make_transaction(id="TXN-GOOD", amount=Decimal("100.00")),
            make_transaction(id="TXN-BAD", amount=Decimal("-50.00")),
        ]
        summary = processor.process_batch(transactions, batch_id="mixed-001")
        assert summary.failed >= 1

    def test_batch_id_assignment(self):
        processor = BatchProcessor(max_workers=2)
        transactions = [make_transaction(id="TXN-1")]
        summary = processor.process_batch(transactions, batch_id="custom-id")
        assert summary.batch_id == "custom-id"
