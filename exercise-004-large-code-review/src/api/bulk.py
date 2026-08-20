"""Bulk operations API endpoints."""

from flask import Blueprint, request, jsonify

from src.auth.middleware import require_auth
from src.services.bulk_import_service import import_transactions_csv
from src.utils.formatting import format_error_response, format_success_response

bulk_bp = Blueprint("bulk", __name__)


@bulk_bp.route("/import/transactions", methods=["POST"])
@require_auth
def import_transactions():
    """Import transactions from CSV content.

    Expects JSON body with:
    - account_id: target account for imported transactions
    - csv_content: string content of the CSV file

    CSV columns: date, amount, type, description, category_id
    """
    data = request.get_json()
    if not data:
        return jsonify(format_error_response("Request body is required")), 400

    account_id = data.get("account_id")
    csv_content = data.get("csv_content")

    if not account_id:
        return jsonify(format_error_response("account_id is required")), 400
    if not csv_content:
        return jsonify(format_error_response("csv_content is required")), 400

    result, errors = import_transactions_csv(
        user_id=request.user_id,
        account_id=account_id,
        csv_content=csv_content,
    )

    if errors:
        return jsonify(format_error_response("Import failed", errors)), 400

    return jsonify(format_success_response(result, "Import completed")), 200


@bulk_bp.route("/export/transactions", methods=["GET"])
@require_auth
def export_transactions():
    """Export transactions as CSV-formatted response."""
    from src.database.connection import get_db
    import csv
    import io

    account_id = request.args.get("account_id", type=int)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    db = get_db()
    query = "SELECT * FROM transactions WHERE user_id = ?"
    params = [request.user_id]

    if account_id:
        query += " AND account_id = ?"
        params.append(account_id)
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    query += " ORDER BY date DESC"
    rows = db.execute(query, params).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "amount", "type", "description", "category_id"])

    for row in rows:
        writer.writerow([
            row["date"],
            row["amount"],
            row["transaction_type"],
            row["description"] or "",
            row["category_id"] or "",
        ])

    return output.getvalue(), 200, {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=transactions.csv",
    }
