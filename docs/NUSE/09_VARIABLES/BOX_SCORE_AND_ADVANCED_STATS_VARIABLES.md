# Box Score, Advanced Stats & Extracted API Variables
======================================================
Este documento define las métricas estándar extraídas directamente de las APIs 
(NBA, BRef, Second Spectrum) y las distorsiones calculadas en Python.

## 1. Box Score & Traditional Stats
- `MINUTES`: Minutos jugados.
- `MPG`: Minutos por partido.
- `FGM`, `FGA`, `FG_PCT`: Tiros de campo.
- `FG3_PCT`: Porcentaje de triples.
- `FTM, FTA, FT_PCT, FTA_RATE`: Tiros libres y ratio de intentos
- `PPG`: Puntos por partido.
- `RPG`, `APG`, `SPG`, `BPG`, `TOPG`: Rebotes, Asistencias, Robos, Tapones y Pérdidas por partido.
- `PF`: Faltas personales.
- `WINS`, `LOSSES`: Récord del equipo o jugador.

## 2. Advanced Metrics & Tracking
- `TS_PCT`: True Shooting Percentage.
- `EFG_PCT`: Effective Field Goal Percentage.
- `USG_PCT`: Usage Percentage.
- `AST_PCT`, `OREB_PCT`, `DREB_PCT`: Porcentajes de asistencia y rebote.
- `DEF_RATING`, `OFF_RATING`: Ratings ofensivos y defensivos per 100 posesiones.
- `VORP`, `PER`, `PIE`: Value Over Replacement, Player Efficiency Rating, Player Impact Estimate.
- `ON_OFF`: Diferencial del equipo con el jugador en pista vs banquillo.
- `AST_TO`: Ratio Asistencia/Pérdida.
- `AST_RATIO`, `AST_TO_PASS_PCT`: Métricas avanzadas de distribución.

## 3. Second Spectrum / Hustle & Situational
- `CONTESTED_SHOTS`, `CONTESTED_SHOTS_2PT`, `CONTESTED_SHOTS_3PT`: Tiros punteados.
- `DEFLECTIONS`: Desvíos defensivos.
- `CHARGES_DRAWN`: Faltas en ataque sacadas.
- `LOOSE_BALLS_RECOVERED`: Balones sueltos recuperados.
- `BOX_OUTS`: Bloqueos de rebote.
- `SCREEN_ASSISTS`: Asistencias de bloqueo.
- `POTENTIAL_AST`, `SECONDARY_AST`, `AST_POINTS_CREATED`: Creación de juego avanzada.
- `PASSES_MADE`: Pases totales realizados.
- `OPPONENT_FG_PCT`: Porcentaje de tiro del rival defendido.
- `DFG_PCT`, `DFG2_PCT`, `DFG3_PCT`: Defensive Field Goal Percentages.
- `PTS_OFF_TOV`, `PTS_2ND_CHANCE`, `PTS_FB`, `PTS_PAINT`: Puntos situacionales.

## 4. Derived Distortions & Context Flags
- `DISTANCE_LAST_24H_MILES`: Distancia recorrida en las últimas 24h.
- `DISTANCE_LAST_72H_MILES`: Distancia recorrida en las últimas 72h.
- `ELEVATION_CHANGE_FT`: Cambio de altitud respecto a la pista anterior.
- `TOTAL_TIMEZONE_SHIFT_HOURS`: Husos horarios cruzados.
- `CONSECUTIVE_ROAD_GAMES`: Partidos seguidos como visitante.
- `BACK_TO_BACK_FLAG`: Si el partido se juega en noches consecutivas.
- `IS_FINAL_YEAR_OF_DEAL`: Si el jugador está en su último año de contrato.
- `CURRENT_CONTRACT_YEAR`: Año de contrato actual.
- `PLAYER_COMPETITIVE_MOTOR_BASE`: Esfuerzo base del jugador.
- `PLAYER_CONSISTENT_EFFORT_BASE`: Consistencia de esfuerzo.
- `GP`, `GS`: Games played, Games started.