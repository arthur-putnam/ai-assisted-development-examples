"""Transaction Reconciliation Service - Main Entry Point.

Processes transaction CSV files through a validation, enrichment, and
reconciliation pipeline. Outputs a summary report with integrity verification.

Usage:
    python main.py [--input data/transactions.csv] [--output reports/report.json] [--batch-size 50]
"""

import argparse
import logging
import sys
from pathlib import Path

from src.batch_processor import BatchProcessor
from src.reader import load_transactions
from src.reporter import generate_report


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def chunk_list(lst, chunk_size):
    """Split a list into chunks of the specified size."""
    for i in range(0, len(lst), chunk_size):
        yield lst[i : i + chunk_size]


def verify_integrity(summaries, total_input_count):
    """Verify that batch processing maintained data integrity.

    The total number of transactions reported across all batches must equal
    the number of input transactions. Any discrepancy indicates data corruption
    in the pipeline.
    """
    reported_total = sum(s.total_transactions for s in summaries)
    if reported_total != total_input_count:
        raise RuntimeError(
            f"DATA INTEGRITY ERROR: Pipeline reported {reported_total} transactions "
            f"but {total_input_count} were submitted. "
            f"Difference: {reported_total - total_input_count}. "
            f"Batch counts: {[s.total_transactions for s in summaries]}"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Process and reconcile financial transactions"
    )
    parser.add_argument(
        "--input",
        default="data/transactions.csv",
        help="Path to the input CSV file (default: data/transactions.csv)",
    )
    parser.add_argument(
        "--output",
        default="reports/report.json",
        help="Path for the output report (default: reports/report.json)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of transactions per batch (default: 50)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of worker threads (default: 4)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    args = parser.parse_args()

    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)

    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f"Input file not found: {args.input}")
        sys.exit(1)

    logger.info(f"Loading transactions from {args.input}")
    transactions = load_transactions(args.input)

    if not transactions:
        logger.warning("No valid transactions found. Exiting.")
        sys.exit(0)

    logger.info(f"Processing {len(transactions)} transactions in batches of {args.batch_size}")

    processor = BatchProcessor(max_workers=args.workers)

    summaries = []
    for batch_num, batch in enumerate(chunk_list(transactions, args.batch_size), start=1):
        batch_id = f"batch-{batch_num:03d}"
        logger.info(f"Processing {batch_id} ({len(batch)} transactions)")
        summary = processor.process_batch(batch, batch_id=batch_id)
        summaries.append(summary)

    # Verify data integrity before generating report
    verify_integrity(summaries, len(transactions))

    report = generate_report(summaries, output_path=args.output)

    print("\n" + "=" * 60)
    print("RECONCILIATION REPORT")
    print("=" * 60)
    print(f"  Batches processed:   {report['summary']['total_batches']}")
    print(f"  Total transactions:  {report['summary']['total_transactions']}")
    print(f"  Reconciled:          {report['summary']['total_reconciled']}")
    print(f"  Failed:              {report['summary']['total_failed']}")
    print(f"  Success rate:        {report['summary']['success_rate']}%")
    print(f"  Processing time:     {report['summary']['total_processing_time_ms']:.1f}ms")
    print(f"  Report saved to:     {args.output}")
    print("=" * 60)

    if report["summary"]["total_failed"] > 0:
        logger.warning(
            f"{report['summary']['total_failed']} transactions failed reconciliation"
        )

    logger.info("Processing complete.")


if __name__ == "__main__":
    main()
