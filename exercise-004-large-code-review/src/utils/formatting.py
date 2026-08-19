"""Response formatting utilities."""


def format_currency(amount, currency="USD"):
    """Format a numeric amount as a currency string."""
    symbols = {
        "USD": "$",
        "EUR": "\u20ac",
        "GBP": "\u00a3",
    }
    symbol = symbols.get(currency, currency + " ")
    return f"{symbol}{amount:,.2f}"


def format_error_response(message, errors=None):
    """Format a standard error response."""
    response = {"error": message}
    if errors:
        response["details"] = errors
    return response


def format_success_response(data, message=None):
    """Format a standard success response."""
    response = {"data": data}
    if message:
        response["message"] = message
    return response


def format_list_response(items, total=None, page=None, page_size=None):
    """Format a paginated list response."""
    response = {
        "data": items,
        "count": len(items),
    }
    if total is not None:
        response["total"] = total
    if page is not None:
        response["page"] = page
    if page_size is not None:
        response["page_size"] = page_size
    return response
