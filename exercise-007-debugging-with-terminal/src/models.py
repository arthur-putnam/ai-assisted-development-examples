"""Data models for the transaction reconciliation service."""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional


class TransactionStatus(Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    ENRICHED = "enriched"
    RECONCILED = "reconciled"
    FAILED = "failed"


class TransactionType(Enum):
    DEBIT = "debit"
    CREDIT = "credit"
    TRANSFER = "transfer"
    REVERSAL = "reversal"


@dataclass
class Transaction:
    id: str
    account_id: str
    amount: Decimal
    currency: str
    type: TransactionType
    timestamp: datetime
    description: str
    status: TransactionStatus = TransactionStatus.PENDING
    counterparty: Optional[str] = None
    reference: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    @property
    def is_domestic(self) -> bool:
        return self.currency == "USD"

    @property
    def requires_review(self) -> bool:
        return self.amount > Decimal("10000") or self.type == TransactionType.REVERSAL


@dataclass
class ReconciliationResult:
    transaction_id: str
    matched: bool
    discrepancy: Optional[Decimal] = None
    notes: str = ""
    resolved_at: Optional[datetime] = None


@dataclass
class BatchSummary:
    batch_id: str
    total_transactions: int
    validated: int = 0
    enriched: int = 0
    reconciled: int = 0
    failed: int = 0
    total_amount: Decimal = Decimal("0")
    processing_time_ms: float = 0.0
