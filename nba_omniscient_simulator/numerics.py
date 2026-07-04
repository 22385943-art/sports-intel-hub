from __future__ import annotations

import numpy as np


def softmax(x: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    """Numerically stable softmax with a temperature knob.

    temperature -> 0   sharpens the distribution toward argmax (concentrated:
                        one player dominates the allocation)
    temperature -> big flattens toward uniform (egalitarian: allocation spread
                        evenly across the pool)

    Every "who gets it" decision in the engine -- usage share, rebound
    priority, minutes concentration -- routes through this single, tested
    implementation instead of each module reinventing its own.
    """
    z = (x - np.max(x)) / max(temperature, 1e-6)
    e = np.exp(z)
    return e / e.sum()
