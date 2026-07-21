#!/usr/bin/env python3
"""Generate HTTP response-code summaries from k6 JSON-lines output."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable


def discover_inputs(paths: Iterable[str]) -> list[Path]:
    inputs: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            inputs.extend(sorted(path.rglob("*.jsonlines")))
        elif path.is_file():
            inputs.append(path)
        else:
            print(f"warning: input does not exist: {path}", file=sys.stderr)
    return inputs


def count_responses(path: Path) -> dict[str, object]:
    statuses: Counter[str] = Counter()
    expected = Counter()
    malformed_lines = 0

    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, start=1):
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                malformed_lines += 1
                continue

            if record.get("type") != "Point" or record.get("metric") != "http_reqs":
                continue

            tags = record.get("data", {}).get("tags", {})
            status = str(tags.get("status") or "NO_STATUS")
            statuses[status] += 1
            expected[str(tags.get("expected_response", "unknown"))] += 1

    total = sum(statuses.values())
    successful = sum(
        count
        for status, count in statuses.items()
        if status.isdigit() and 200 <= int(status) < 400
    )

    return {
        "source": str(path),
        "total_responses": total,
        "successful_responses": successful,
        "unsuccessful_responses": total - successful,
        "success_rate": successful / total if total else 0,
        "status_codes": dict(sorted(statuses.items())),
        "expected_response": dict(sorted(expected.items())),
        "malformed_lines": malformed_lines,
    }


def write_reports(source: Path, report: dict[str, object]) -> tuple[Path, Path]:
    base = source.with_suffix("")
    json_path = base.with_name(f"{base.name}.response-codes.json")
    csv_path = base.with_name(f"{base.name}.response-codes.csv")

    with json_path.open("w", encoding="utf-8") as stream:
        json.dump(report, stream, indent=2)
        stream.write("\n")

    total = int(report["total_responses"])
    statuses = report["status_codes"]
    assert isinstance(statuses, dict)
    with csv_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["status", "count", "percentage"])
        for status, count in statuses.items():
            percentage = (int(count) / total * 100) if total else 0
            writer.writerow([status, count, f"{percentage:.6f}"])

    return json_path, csv_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Count HTTP response codes in k6 .jsonlines files and write JSON/CSV "
            "reports beside each input. Directories are searched recursively."
        )
    )
    parser.add_argument("paths", nargs="+", help="JSON-lines files or result directories")
    args = parser.parse_args()

    inputs = discover_inputs(args.paths)
    if not inputs:
        parser.error("no .jsonlines input files found")

    for source in inputs:
        report = count_responses(source)
        json_path, csv_path = write_reports(source, report)
        print(f"{source}")
        for status, count in report["status_codes"].items():
            print(f"  HTTP {status}: {count}")
        print(f"  reports: {json_path}, {csv_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
