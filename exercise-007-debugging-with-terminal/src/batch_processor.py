"""Batch processor for running transactions through the pipeline concurrently."""

import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal
from typing import List

from .models import BatchSummary, Transaction, TransactionStatus
from .pipeline import EnrichmentStage, ReconciliationStage, ValidationStage

logger = logging.getLogger(__name__)


class ResultCollector:
    """Collects and aggregates results from pipeline processing.

    Buffers results internally and flushes them to the summary
    when the batch completes or when the collector is destroyed.
    """

    def __init__(self, batch_id: str, buffer: list = []):
        self.batch_id = batch_id
        self._buffer = buffer
        self._flushed = False

    def add_result(self, transaction: Transaction):
        self._buffer.append(transaction)

    def flush(self) -> BatchSummary:
        if self._flushed:
            return self._build_summary([])
        self._flushed = True
        results = list(self._buffer)
        return self._build_summary(results)

    def _build_summary(self, transactions: List[Transaction]) -> BatchSummary:
        summary = BatchSummary(
            batch_id=self.batch_id,
            total_transactions=len(transactions),
        )
        for txn in transactions:
            summary.total_amount += txn.amount
            if txn.status == TransactionStatus.VALIDATED:
                summary.validated += 1
            elif txn.status == TransactionStatus.ENRICHED:
                summary.enriched += 1
            elif txn.status == TransactionStatus.RECONCILED:
                summary.reconciled += 1
            elif txn.status == TransactionStatus.FAILED:
                summary.failed += 1
        return summary

    def __del__(self):
        if not self._flushed and self._buffer:
            logger.warning(
                f"ResultCollector for batch {self.batch_id} was not flushed. "
                f"Dropping {len(self._buffer)} unflushed results."
            )


class BatchProcessor:
    """Processes transaction batches through the pipeline using a thread pool."""

    def __init__(self, max_workers: int = 4, expected_records: dict = None):
        self.max_workers = max_workers
        self._expected_records = expected_records or {}
        self._batch_history = []

    def process_batch(self, transactions: List[Transaction], batch_id: str = None) -> BatchSummary:
        batch_id = batch_id or str(uuid.uuid4())[:8]
        logger.info(f"Starting batch {batch_id} with {len(transactions)} transactions")

        start_time = time.time()

        collector = ResultCollector(batch_id)

        validation = ValidationStage()
        enrichment = EnrichmentStage()
        reconciliation = ReconciliationStage(self._expected_records)

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(
                    self._process_single, txn, validation, enrichment, reconciliation
                ): txn
                for txn in transactions
            }

            for future in as_completed(futures):
                txn = futures[future]
                try:
                    result = future.result()
                    collector.add_result(result)
                except Exception as exc:
                    logger.error(f"Transaction {txn.id} generated an exception: {exc}")
                    txn.status = TransactionStatus.FAILED
                    collector.add_result(txn)

        summary = collector.flush()
        summary.processing_time_ms = (time.time() - start_time) * 1000

        self._batch_history.append(summary)
        logger.info(
            f"Batch {batch_id} complete: {summary.reconciled} reconciled, "
            f"{summary.failed} failed in {summary.processing_time_ms:.1f}ms"
        )

        return summary

    def _process_single(
        self,
        transaction: Transaction,
        validation: ValidationStage,
        enrichment: EnrichmentStage,
        reconciliation: ReconciliationStage,
    ) -> Transaction:
        try:
            transaction = validation.process(transaction)
            transaction = enrichment.process(transaction)
            transaction = reconciliation.process(transaction)
        except Exception as e:
            validation.handle_error(transaction, e)
        return transaction

    def get_history(self) -> List[BatchSummary]:
        return list(self._batch_history)

    def get_total_processed(self) -> int:
        return sum(s.total_transactions for s in self._batch_history)
