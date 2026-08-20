"""Report generation for batch processing results."""

import json
import logging
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import List

from .models import BatchSummary

logger = logging.getLogger(__name__)


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def generate_report(summaries: List[BatchSummary], output_path: str = None) -> dict:
    """Generate a reconciliation report from batch summaries."""
    total_txns = sum(s.total_transactions for s in summaries)
    total_reconciled = sum(s.reconciled for s in summaries)
    total_failed = sum(s.failed for s in summaries)
    total_amount = sum(s.total_amount for s in summaries)
    total_time = sum(s.processing_time_ms for s in summaries)

    report = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_batches": len(summaries),
            "total_transactions": total_txns,
            "total_reconciled": total_reconciled,
            "total_failed": total_failed,
            "total_amount_processed": total_amount,
            "total_processing_time_ms": round(total_time, 2),
            "success_rate": round(
                (total_reconciled / total_txns * 100) if total_txns > 0 else 0, 2
            ),
        },
        "batches": [
            {
                "batch_id": s.batch_id,
                "transactions": s.total_transactions,
                "reconciled": s.reconciled,
                "failed": s.failed,
                "amount": s.total_amount,
                "time_ms": round(s.processing_time_ms, 2),
            }
            for s in summaries
        ],
    }

    if output_path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, cls=DecimalEncoder)
        logger.info(f"Report written to {output_path}")

    return report
