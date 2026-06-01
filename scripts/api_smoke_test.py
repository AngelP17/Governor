#!/usr/bin/env python3
"""Lightweight smoke checks for the local FastAPI platform API."""

from __future__ import annotations

import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "http://localhost:8080"


def get_json(path: str) -> object:
    request = Request(f"{BASE_URL}{path}", headers={"Accept": "application/json"})
    with urlopen(request, timeout=5) as response:
        if response.status != 200:
            raise RuntimeError(f"{path} returned HTTP {response.status}")
        return json.loads(response.read().decode("utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    checks = [
        ("/health", lambda data: require(isinstance(data, dict) and data.get("status") == "healthy", "/health must report healthy")),
        ("/platform/summary", lambda data: require(isinstance(data, dict) and {"status", "slo", "replicas"} <= set(data), "summary is missing required fields")),
        ("/platform/incidents", lambda data: require(isinstance(data, list) and len(data) > 0, "incidents must be a non-empty list")),
        ("/platform/incidents/INC-20260422153045", lambda data: require(isinstance(data, dict) and {"id", "timeline", "artifacts"} <= set(data), "sample incident detail is missing required fields")),
        ("/platform/runbooks", lambda data: require(isinstance(data, list) and len(data) > 0, "runbooks must be a non-empty list")),
        ("/platform/topology", lambda data: require(isinstance(data, dict) and {"nodes", "edges"} <= set(data), "topology is missing nodes or edges")),
    ]

    for path, validate in checks:
        data = get_json(path)
        validate(data)
        print(f"OK {path}")

    print("API smoke checks passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, HTTPError, RuntimeError, URLError) as exc:
        print(f"API smoke checks failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
