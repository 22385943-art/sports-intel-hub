---
id: NUSE_BETA_FEATURE_SPACE_CONTRACT
title: "Contrato de Datos — BETA_FEATURE_SPACE materializado en Parquet"
version: 1.0.0
status: "PROPUESTA — bloquea al ETL hasta ratificación del Comandante"
category: PIPELINE + DATA_MODEL
phase: 11
depends_on:
  - "11_ORACLE_CALIBRATION_PIPELINE.md (§2.2 definición conceptual de BETA_FEATURE_SPACE)"
  - "09_VARIABLES/ORACLE_CALIBRATION_VARIABLES.md (§2 BETA_FEATURE_SPACE)"
  - "09_VARIABLES/POSSESSION_VARIABLES.md"
  - "09_VARIABLES/GAME_VARIABLES.md"
---

# 12. BETA_FEATURE_SPACE — Contrato de Datos para el ETL

## Propósito

`11_ORACLE_CALIBRATION_PIPELINE.md` §2.2 definió `BETA_FEATURE_SPACE` conceptualmente. Este documento lo convierte en un **contrato de columnas exacto**: nombres, tipos, ventanas de cálculo y semántica de valores faltantes — precisamente lo que el ETL necesita para materializar un segundo Parquet, indexado por `possession_id`, que se une (join) al Parquet crudo de 12,600 posesiones ya generado.

Ningún campo de este contrato es negociable en cuanto a **nombre** y **tipo** sin una nueva versión de este documento — `Oracle-Ω` (`ml/calibrate_oracle_v1.py`) valida contra este esquema en tiempo de carga y **rechaza** el Parquet si no coincide exactamente.

---

# 1. Regla de Oro: Cero Fuga Temporal (Zero Leakage)

Esta es la única regla de este documento que, si se rompe, invalida silenciosamente todo `Oracle-Ω` sin que ningún error de dimensionalidad lo delate — el modelo simplemente aprenderá a "predecir el futuro" durante el entrenamiento y fallará catastróficamente en producción.

**Regla:** para la posesión $i$, ocurrida en el instante $t_i$, todo campo `beta_*` se calcula usando **exclusivamente** eventos con timestamp $< t_i$ del **mismo jugador/equipo/cuadrilla**, nunca $\leq t_i$. Toda ventana móvil ("last_5", "last_10") se implementa como una ventana desplazada (`shift(1)` antes de `rolling()`, en términos de pandas) sobre partidos **ya finalizados** antes del partido de la posesión $i$ — nunca sobre posesiones anteriores del **mismo partido** en curso (eso lo captura `ALPHA_FEATURE_SPACE` vía $A_p(t)$/$M_p(t)$, no `BETA_FEATURE_SPACE`).

**Contraste explícito con `ALPHA_FEATURE_SPACE`:** Alpha exige replay cronológico secuencial (`11_ORACLE_CALIBRATION_PIPELINE.md` §3.4) porque su estado es recursivo *dentro* del partido. Beta **no** lo exige — cada fila se calcula con un `JOIN ... WHERE game_date < X` de acceso aleatorio, porque por diseño nunca mira dentro del partido en curso. Esta asimetría es intencional y es la razón por la que Beta puede materializarse en paralelo/distribuido mientras Alpha no.

---

# 2. Grupos de Features

## 2.1 Forma Reciente del Tirador (`primary_actor_id`)

| Columna | Tipo | Ventana | Cómputo |
|---|---|---|---|
| `beta_fg_pct_l5` | float32 | 5 partidos previos | FGM/FGA acumulado, shift(1) |
| `beta_fg_pct_l10` | float32 | 10 partidos previos | ídem |
| `beta_3p_pct_l10` | float32 | 10 partidos previos | 3PM/3PA |
| `beta_ft_pct_l20` | float32 | 20 partidos previos | FTM/FTA |
| `beta_ts_pct_l10` | float32 | 10 partidos previos | True Shooting % |
| `beta_usage_rate_l10` | float32 | 10 partidos previos | USG% estándar |
| `beta_shooting_streak_z` | float32 | 5 partidos previos | z-score de FG% reciente contra media/std de temporada del propio jugador |

## 2.2 Historial Específico de Matchup (`primary_actor_id` × `primary_defender_id`)

| Columna | Tipo | Cómputo | Nota |
|---|---|---|---|
| `beta_matchup_fg_pct_allowed` | float32 | FG% histórico de A contra D específicamente | Requiere `beta_matchup_sample_n` para ser interpretable |
| `beta_matchup_sample_n` | int32 | Nº de posesiones históricas A vs D | Si `< 20`, el ETL debe además poblar el fallback §2.2b |
| `beta_matchup_pts_per_poss` | float32 | Puntos por posesión histórico de A vs D | — |

**§2.2b Fallback de bajo-sample (obligatorio):** cuando `beta_matchup_sample_n < 20`, además de la fila anterior (que puede quedar ruidosa) se puebla:

| Columna | Tipo | Cómputo |
|---|---|---|
| `beta_archetype_fg_pct_allowed` | float32 | FG% que `primary_defender_id` permite históricamente al arquetipo posicional de `primary_actor_id` (no al jugador individual) |

## 2.3 Tendencias de la Cuadrilla Arbitral

| Columna | Tipo | Cómputo |
|---|---|---|
| `beta_crew_foul_rate_off` | float32 | Tasa histórica de falta-tiro pitada por esta cuadrilla de 3 al equipo ofensivo |
| `beta_crew_foul_rate_def` | float32 | ídem, al equipo defensivo |
| `beta_crew_pace_factor` | float32 | Posesiones/48min históricas bajo esta cuadrilla, normalizado contra la media de liga |

## 2.4 Descanso, Viaje y Fatiga Real (histórica, NO el $A_p(t)$ del motor)

| Columna | Tipo | Cómputo |
|---|---|---|
| `beta_is_back_to_back` | int8 (0/1) | `days_rest == 0` |
| `beta_days_rest` | int8 | Capado en `[0, 5]` |
| `beta_games_last_7d` | int8 | Conteo de partidos jugados en los 7 días previos |
| `beta_is_second_of_b2b_road` | int8 (0/1) | Segundo partido de back-to-back Y visitante — el confound de fatiga más fuerte conocido en literatura pública de analítica NBA |

## 2.5 Contexto de Lineup

| Columna | Tipo | Cómputo |
|---|---|---|
| `beta_lineup5_net_rtg_season` | float32 | Net rating histórico del quinteto exacto en cancha (ambos equipos), temporada en curso hasta la fecha |
| `beta_lineup5_sample_poss` | int32 | Nº de posesiones históricas respaldando la fila anterior |

## 2.6 Splits de Equipo / Temporada

| Columna | Tipo | Cómputo |
|---|---|---|
| `beta_home_flag` | int8 (0/1) | — |
| `beta_off_rtg_l10` | float32 | Rating ofensivo del equipo, últimos 10 partidos |
| `beta_def_rtg_opponent_l10` | float32 | Rating defensivo del rival, últimos 10 partidos |
| `beta_win_streak_signed` | int8 | Positivo = racha de victorias, negativo = derrotas |

---

# 3. Esquema Parquet Consolidado

Archivo objetivo: `beta_feature_space_{SEASON}.parquet`. Clave de unión con el Parquet crudo de posesiones: `possession_id` (string, único, no nulo — el mismo identificador usado en `POSSESSION_OUTCOME_V2`).

**Recuento total: 1 clave + 24 columnas de feature = 25 columnas.** Este número es el primer chequeo de `Oracle-Ω` al cargar el archivo (§5).

| # | Columna | Tipo Parquet | Nulable |
|---|---|---|---|
| 0 | `possession_id` | `string` | No |
| 1–7 | Grupo 2.1 (forma reciente) | `float32` ×7 | Sí (cold-start, ver §4) |
| 8–10 | Grupo 2.2 (matchup) | `float32`×2, `int32`×1 | Sí |
| 11 | Grupo 2.2b (fallback arquetipo) | `float32` | Sí |
| 12–14 | Grupo 2.3 (cuadrilla arbitral) | `float32` ×3 | Sí (temporadas con cuadrillas nuevas) |
| 15–18 | Grupo 2.4 (descanso/viaje) | `int8`×3, `int8`×1 | No (siempre calculable desde el calendario) |
| 19–20 | Grupo 2.5 (lineup) | `float32`, `int32` | Sí |
| 21–24 | Grupo 2.6 (splits) | `int8`, `float32`×2, `int8` | Sí solo en los primeros 10 partidos de temporada |

## 3.1 Columnas de acompañamiento — flags de cold-start

Por cada columna nulable de §2.1, §2.2, §2.5 y §2.6, el ETL agrega una columna hermana booleana, `{columna}_is_cold_start` (dtype `bool`), en `True` cuando la ventana histórica no tenía suficiente profundidad (p. ej., primeros 5 partidos de la carrera de un rookie). Esto **no** es opcional: sin esta señal, `Oracle-Ω` no puede distinguir "el jugador de verdad tira 0% reciente" de "no hay datos todavía" — un error de interpretación semántica, no de dimensionalidad, pero igual de destructivo para la calibración.

---

# 4. Contrato de Valores Faltantes

**Regla:** cuando una ventana histórica no tiene suficiente profundidad (cold-start) o el dato subyacente no existe para esa temporada (p. ej., cuadrillas arbitrales previas a cierta temporada de cobertura), el ETL escribe `NaN` — **nunca** un placeholder numérico como `0.0` o `-1`. `xgboost.DMatrix` maneja `NaN` de forma nativa (aprende la dirección de split óptima para valores faltantes en cada nodo vía su algoritmo *sparsity-aware*); imputar un cero artificial le mentiría al árbol, haciéndole creer que "0% de tiro" es una observación real en vez de una ausencia de información.

`beta_days_rest`, `beta_games_last_7d`, `beta_is_back_to_back`, `beta_is_second_of_b2b_road` y `beta_home_flag` son la única excepción — se derivan directamente del calendario de la liga, siempre disponible, por lo que **nunca** deben ser nulos. Un `NaN` en cualquiera de estas cinco columnas es un bug del ETL, no un cold-start legítimo, y debe fallar la validación de §5.

---

# 5. Validación de Dimensionalidad (contrato de carga)

`Oracle-Ω` (`ml/calibrate_oracle_v1.py`, función `load_beta_batch`) ejecuta, en este orden, antes de construir un solo `DMatrix`:

1. **Recuento de columnas:** el Parquet debe tener exactamente las 25 columnas nombradas en §3 más sus columnas hermanas `_is_cold_start` — ni una de más, ni una de menos. Un desajuste aquí es la causa más común de "error de dimensionalidad" y se detecta *antes* de tocar NumPy, no como una excepción críptica de XGBoost a mitad de entrenamiento.
2. **Coincidencia de tipos:** cada columna debe coincidir exactamente con el `dtype` de §3 — un `float64` donde se espera `float32` no es un error, pero se re-castea con un `warning`, nunca en silencio total.
3. **Integridad de la clave de unión:** `possession_id` debe ser único y debe existir en el 100% de las filas del Parquet crudo de posesiones — cualquier `possession_id` huérfano en cualquiera de los dos lados aborta la carga.
4. **Regla de las cinco columnas no-nulas (§4):** verificación explícita de que `beta_days_rest`, `beta_games_last_7d`, `beta_is_back_to_back`, `beta_is_second_of_b2b_road`, `beta_home_flag` no contienen `NaN`.

Solo tras pasar las cuatro validaciones, `load_beta_batch` retorna un `BetaFeatureBatch` — nunca antes.

---

# Cierre

Con este contrato fijado, el ETL puede materializar `beta_feature_space_{SEASON}.parquet` sin ambigüedad, y `ml/calibrate_oracle_v1.py` (documento hermano de esta entrega) puede escribir su `load_beta_batch` contra un esquema conocido en vez de inferirlo a ciegas del propio archivo — exactamente el problema de "programar la red neuronal a ciegas" que esta misión buscaba evitar.