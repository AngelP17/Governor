# Experiment Summary

**Generated:** 2026-04-22T16:00:00Z

## Overview

| Metric | Value |
|--------|-------|
| Total Incidents | 5 |
| SLO Pass Rate | 80.0% (chaos incidents) |
| Average MTTR | 10.2s |
| Chaos Incidents | 4 |
| Alert Incidents | 1 |

## MTTR Statistics

| Metric | Value |
|--------|-------|
| Average | 10.2s |
| Minimum | 7s |
| Maximum | 14s |
| Sample Count | 4 |

## Failure Type Breakdown

| Type | Count |
|------|-------|
| pod-termination | 4 |

## Source Breakdown

| Source | Count |
|--------|-------|
| chaos | 4 |
| alert | 1 |

## Remediation Statistics

| Metric | Count |
|--------|-------|
| With remediation.log | 3 |
| With remediation-decision.json | 3 |

## Incident Details

| Incident ID | Source | SLO Met | Recovery Time |
|-------------|--------|---------|----------------|
| INC-20260422153045 | chaos | true | 11s |
| INC-20260422153100 | chaos | true | 7s |
| INC-20260422153200 | chaos | false | 34s |
| INC-20260422153300 | chaos | true | 9s |
| INC-20260422153400-HighPodRestartRate | alert | — | — |
