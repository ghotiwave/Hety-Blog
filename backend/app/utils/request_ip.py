import ipaddress

from fastapi import Request


def client_ip(request: Request) -> str:
    """Resolve the original client behind the trusted local proxy chain."""
    forwarded = (getattr(request, "headers", {}) or {}).get("x-forwarded-for", "")
    candidate = forwarded.split(",", 1)[0].strip() if forwarded else ""
    try:
        if candidate:
            return str(ipaddress.ip_address(candidate))
    except ValueError:
        pass
    return request.client.host if request.client else "unknown"
