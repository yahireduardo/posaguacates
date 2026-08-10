#!/usr/bin/env python3
"""Compara un promedio ponderado con modelos scikit-learn sin fuga temporal."""

from __future__ import annotations

import json
import math
import sys
from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge


def weighted_average(values: list[float], window: int = 12) -> float:
    values = [max(0.0, float(value)) for value in values[-window:]]
    if not values:
        return 0.0
    weights = np.arange(1, len(values) + 1, dtype=float)
    return float(np.average(values, weights=weights))


def features(values: list[float], index: int) -> list[float]:
    previous = values[:index]
    last = previous[-1]
    last2 = previous[-2] if len(previous) >= 2 else last
    last4 = previous[-4:] if len(previous) >= 4 else previous
    last8 = previous[-8:] if len(previous) >= 8 else previous
    return [
        last,
        last2,
        float(np.mean(last4)),
        float(np.mean(last8)),
        float(np.std(last4)),
        math.sin(2 * math.pi * index / 52),
        math.cos(2 * math.pi * index / 52),
    ]


def supervised(values: list[float], stop: int) -> tuple[np.ndarray, np.ndarray]:
    rows, targets = [], []
    for index in range(4, stop):
        rows.append(features(values, index))
        targets.append(values[index])
    return np.asarray(rows, dtype=float), np.asarray(targets, dtype=float)


def model_factories() -> dict[str, Any]:
    return {
        "REGRESION_RIDGE": lambda: Ridge(alpha=1.0),
        "BOSQUE_ALEATORIO": lambda: RandomForestRegressor(
            n_estimators=200,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=1,
        ),
    }


def metrics(actual: list[float], predicted: list[float]) -> dict[str, float]:
    truth = np.asarray(actual, dtype=float)
    estimate = np.asarray(predicted, dtype=float)
    errors = truth - estimate
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors**2)))
    denominator = float(np.sum(np.abs(truth)))
    wape = float(np.sum(np.abs(errors)) / denominator * 100) if denominator else 0.0
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "wape": round(wape, 2)}


def compare(values: list[float]) -> dict[str, Any]:
    values = [max(0.0, float(value or 0)) for value in values]
    if len(values) < 12:
        return {
            "available": False,
            "reason": "Se requieren al menos 12 semanas para comparar sin fuga temporal.",
            "prediction": weighted_average(values),
        }

    validation_size = min(8, max(4, len(values) // 4))
    validation_start = len(values) - validation_size
    actual = values[validation_start:]
    predictions: dict[str, list[float]] = {"PROMEDIO_PONDERADO_LOCAL": []}
    predictions.update({name: [] for name in model_factories()})

    for index in range(validation_start, len(values)):
        history = values[:index]
        predictions["PROMEDIO_PONDERADO_LOCAL"].append(weighted_average(history))
        x_train, y_train = supervised(values, index)
        x_next = np.asarray([features(values, index)], dtype=float)
        for name, factory in model_factories().items():
            model = factory()
            model.fit(x_train, y_train)
            predictions[name].append(max(0.0, float(model.predict(x_next)[0])))

    results = {name: metrics(actual, predicted) for name, predicted in predictions.items()}
    winner = min(results, key=lambda name: (results[name]["mae"], results[name]["rmse"]))
    forecasts = {"PROMEDIO_PONDERADO_LOCAL": weighted_average(values)}
    x_train, y_train = supervised(values, len(values))
    x_next = np.asarray([features(values, len(values))], dtype=float)
    for name, factory in model_factories().items():
        model = factory()
        model.fit(x_train, y_train)
        forecasts[name] = max(0.0, float(model.predict(x_next)[0]))

    return {
        "available": True,
        "validation_weeks": validation_size,
        "winner": winner,
        "prediction": round(forecasts[winner], 4),
        "forecasts": {name: round(value, 4) for name, value in forecasts.items()},
        "metrics": results,
    }


def main() -> None:
    payload = json.load(sys.stdin)
    products = []
    for product in payload.get("products", []):
        result = compare(product.get("values", []))
        products.append({"product_id": product.get("product_id"), **result})
    json.dump({"products": products, "engine": "scikit-learn"}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
