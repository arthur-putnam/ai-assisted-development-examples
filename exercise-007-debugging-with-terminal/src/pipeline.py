"""Transaction processing pipeline with validation, enrichment, and reconciliation stages."""

import logging
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Callable

from .models import (
    BatchSummary,
    ReconciliationResult,
    Transaction,
    TransactionStatus,
    TransactionType,
)

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when a transaction fails validation."""

    def __init__(self, transaction_id: str, reason: str):
        self.transaction_id = transaction_id
        self.reason = reason
        super().__init__(f"Validation failed for {transaction_id}: {reason}")


class PipelineStage:
    """Base class for pipeline processing stages."""

    def __init__(self, name: str, next_stage=None):
        self.name = name
        self.next_stage = next_stage
        self._error_count = 0

    def process(self, transaction: Transaction) -> Transaction:
        raise NotImplementedError

    def handle_error(self, transaction: Transaction, error: Exception):
        self._error_count += 1
        logger.error(f"[{self.name}] Error processing {transaction.id}: {error}")
        transaction.status = TransactionStatus.FAILED
        return transaction


class ValidationStage(PipelineStage):
    """Validates transaction data integrity."""

    VALID_CURRENCIES = {"USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"}
    MAX_AMOUNT = Decimal("999999999.99")

    def __init__(self, next_stage=None):
        super().__init__("validation", next_stage)

    def process(self, transaction: Transaction) -> Transaction:
        self._validate_amount(transaction)
        self._validate_currency(transaction)
        self._validate_references(transaction)
        transaction.status = TransactionStatus.VALIDATED
        logger.debug(f"Validated transaction {transaction.id}")
        return transaction

    def _validate_amount(self, txn: Transaction):
        if txn.amount <= Decimal("0"):
            raise ValidationError(txn.id, "Amount must be positive")
        if txn.amount > self.MAX_AMOUNT:
            raise ValidationError(txn.id, f"Amount exceeds maximum: {txn.amount}")

    def _validate_currency(self, txn: Transaction):
        if txn.currency not in self.VALID_CURRENCIES:
            raise ValidationError(txn.id, f"Invalid currency: {txn.currency}")

    def _validate_references(self, txn: Transaction):
        if txn.type == TransactionType.REVERSAL and not txn.reference:
            raise ValidationError(txn.id, "Reversals must have a reference")


class EnrichmentStage(PipelineStage):
    """Enriches transactions with additional metadata."""

    EXCHANGE_RATES = {
        "EUR": Decimal("1.08"),
        "GBP": Decimal("1.27"),
        "JPY": Decimal("0.0067"),
        "CAD": Decimal("0.74"),
        "AUD": Decimal("0.65"),
        "CHF": Decimal("1.13"),
        "USD": Decimal("1.00"),
    }

    def __init__(self, next_stage=None):
        super().__init__("enrichment", next_stage)
        self._counterparty_cache = {}

    def process(self, transaction: Transaction) -> Transaction:
        self._add_usd_equivalent(transaction)
        self._resolve_counterparty(transaction)
        self._add_risk_score(transaction)
        transaction.status = TransactionStatus.ENRICHED
        logger.debug(f"Enriched transaction {transaction.id}")
        return transaction

    def _add_usd_equivalent(self, txn: Transaction):
        rate = self.EXCHANGE_RATES.get(txn.currency, Decimal("1.00"))
        txn.metadata["usd_equivalent"] = str(txn.amount * rate)

    def _resolve_counterparty(self, txn: Transaction):
        if txn.counterparty:
            cached = self._counterparty_cache.get(txn.counterparty)
            if cached:
                txn.metadata["counterparty_name"] = cached
            else:
                resolved = f"Entity-{txn.counterparty[:8].upper()}"
                self._counterparty_cache[txn.counterparty] = resolved
                txn.metadata["counterparty_name"] = resolved

    def _add_risk_score(self, txn: Transaction):
        score = 0
        if txn.amount > Decimal("5000"):
            score += 30
        if not txn.is_domestic:
            score += 20
        if txn.type == TransactionType.REVERSAL:
            score += 40
        if txn.requires_review:
            score += 25
        txn.metadata["risk_score"] = min(score, 100)


class ReconciliationStage(PipelineStage):
    """Reconciles transactions against expected records."""

    def __init__(self, expected_records: dict = None, next_stage=None):
        super().__init__("reconciliation", next_stage)
        self._expected = expected_records or {}
        self._results = []

    def process(self, transaction: Transaction) -> Transaction:
        result = self._reconcile(transaction)
        self._results.append(result)
        if result.matched:
            transaction.status = TransactionStatus.RECONCILED
        else:
            transaction.status = TransactionStatus.FAILED
            transaction.metadata["reconciliation_notes"] = result.notes
        logger.debug(f"Reconciled transaction {transaction.id}: matched={result.matched}")
        return transaction

    def _reconcile(self, txn: Transaction) -> ReconciliationResult:
        expected = self._expected.get(txn.id)
        if not expected:
            return ReconciliationResult(
                transaction_id=txn.id,
                matched=True,
                notes="No expected record - auto-matched",
            )

        expected_amount = Decimal(str(expected.get("amount", "0")))
        if txn.amount != expected_amount:
            discrepancy = txn.amount - expected_amount
            return ReconciliationResult(
                transaction_id=txn.id,
                matched=False,
                discrepancy=discrepancy,
                notes=f"Amount mismatch: got {txn.amount}, expected {expected_amount}",
            )

        return ReconciliationResult(
            transaction_id=txn.id,
            matched=True,
        )

    @property
    def results(self):
        return list(self._results)
