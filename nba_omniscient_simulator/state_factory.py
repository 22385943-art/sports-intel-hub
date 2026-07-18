"""
state_factory.py
================
Fase 15 -- Inyección de la Realidad. 
Fábrica encargada de leer el ADN real de los jugadores desde el parquet de 
Latent Space y construir un OmniscientGameState inicial de alta fidelidad.
Alineado 100% con la arquitectura estricta de domain.py.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import fields

import pandas as pd
import numpy as np

# Importaciones precisas del dominio
from .domain import (
    OmniscientGameState,
    TeamGameState,
    PlayerLiveState,
    TeamEcosystemState,
    GameClock,
    TrackingTensorFrame,
    TeamSide
)
from .latent_state import PlayerLatentState
from .coach import CoachProfile

logger = logging.getLogger("nuse.simulator.state_factory")


class RealStateFactory:
    """
    Lee los perfiles latentes estáticos desde disco y construye
    un OmniscientGameState inicial listo para la simulación de Fase 14+.
    """

    def __init__(self, latent_space_path: Path) -> None:
        if not latent_space_path.exists():
            raise FileNotFoundError(f"No se encontró el archivo de Latent Space en: {latent_space_path}")
        
        logger.info("RealStateFactory: Cargando perfiles reales desde %s...", latent_space_path)
        try:
            self._df = pd.read_parquet(latent_space_path)
            if "player_id" in self._df.columns:
                self._df["player_id"] = self._df["player_id"].astype(str)
            else:
                self._df["player_id"] = self._df.index.astype(str)
            
            self._df.set_index("player_id", inplace=True)
            logger.info("RealStateFactory: %d perfiles cargados.", len(self._df))
        except Exception as e:
            raise RuntimeError(f"Error crítico al leer el parquet: {e}") from e

    def _build_ecosystem(self, team_id: str, player_ids: List[str]) -> TeamEcosystemState:
        """
        Construye el ecosistema estático del equipo (roster y coach).
        """
        roster_list: List[PlayerLatentState] = []
        valid_fields = {f.name for f in fields(PlayerLatentState)}
        
        for pid in player_ids:
            str_pid = str(pid)
            if str_pid in self._df.index:
                # Extraer datos y prevenir diccionarios anidados de Pandas
                player_data = self._df.loc[str_pid]
                if isinstance(player_data, pd.DataFrame):
                    player_data = player_data.iloc[-1]
                
                row_data: Dict[str, Any] = player_data.to_dict()
                
                # Mapeo estricto
                final_attributes = {}
                for field_name in valid_fields:
                    if field_name == "player_id":
                        final_attributes[field_name] = str_pid
                        continue
                        
                    val = row_data.get(field_name)
                    if pd.notna(val) and isinstance(val, (int, float, np.number)):
                        final_attributes[field_name] = float(val)
                    else:
                        final_attributes[field_name] = 0.5
                        
                roster_list.append(PlayerLatentState(**final_attributes))
            else:
                # Fallback estricto
                logger.warning("Jugador %s no encontrado. Fallback genérico.", str_pid)
                default_attrs = {f: 0.5 for f in valid_fields if f != "player_id"}
                default_attrs["player_id"] = str_pid
                roster_list.append(PlayerLatentState(**default_attrs))
                
# Construimos un entrenador mirando ESTRICTAMENTE EL TIPO DE DATO (f.type), 
        # jamás adivinando por el nombre de la variable (f.name).
        coach_attrs = {}
        for f in fields(CoachProfile):
            type_repr = str(f.type).lower()
            if 'str' in type_repr:
                coach_attrs[f.name] = f"COACH_{team_id}"
            elif 'int' in type_repr:
                coach_attrs[f.name] = 1
            else:
                coach_attrs[f.name] = 0.5
                
        coach = CoachProfile(**coach_attrs)
        
        return TeamEcosystemState(
            team_id=team_id, 
            roster=roster_list, 
            coach_profile=coach
        )

    def _build_live_state(self, player_id: str) -> PlayerLiveState:
        """
        Construye el estado dinámico (en pista/banquillo) de un jugador con los 
        parámetros a cero o en estados neutros iniciales.
        """
        return PlayerLiveState(
            player_id=player_id,
            acute_fatigue=0.0,
            momentum_alpha=1.0,  # Distribución Beta requiere > 0
            momentum_beta=1.0,   # Distribución Beta requiere > 0
            momentum_index=0.0,
            personal_fouls=0,
            seconds_played_total=0.0,
            seconds_played_since_rest=0.0
        )

    def build_initial_state(
        self, 
        game_id: str, 
        home_team_id: str, 
        away_team_id: str, 
        home_player_ids: List[str], 
        away_player_ids: List[str]
    ) -> OmniscientGameState:
        
        # 1. Capa Estructural (Latent)
        home_eco = self._build_ecosystem(home_team_id, home_player_ids)
        away_eco = self._build_ecosystem(away_team_id, away_player_ids)

        # 2. Capa Viva (Separar Titulares de Suplentes)
        home_live_players = [self._build_live_state(str(pid)) for pid in home_player_ids]
        away_live_players = [self._build_live_state(str(pid)) for pid in away_player_ids]

        # Los primeros 5 son el quinteto titular (on_court), el resto al banquillo
        home_on_court = tuple(home_live_players[:5])
        home_bench = tuple(home_live_players[5:])
        
        away_on_court = tuple(away_live_players[:5])
        away_bench = tuple(away_live_players[5:])

        # 3. Capa Viva de Equipo
        home_state = TeamGameState(
            ecosystem=home_eco,
            on_court=home_on_court,
            bench=home_bench,  # <-- ¡Banquillo activado!
            score=0,
            team_fouls=0,
            timeouts_remaining=7
        )
        
        away_state = TeamGameState(
            ecosystem=away_eco,
            on_court=away_on_court,
            bench=away_bench,  # <-- ¡Banquillo activado!
            score=0,
            team_fouls=0,
            timeouts_remaining=7
        )

        # 4. Reloj y Tracking
        clock = GameClock(
            quarter=1,
            game_clock_seconds_remaining=720.0,
            shot_clock_seconds_remaining=24.0
        )

        tracking = TrackingTensorFrame(
            player_positions_ft=np.zeros((10, 2), dtype=np.float64),
            ball_position_ft=np.zeros(3, dtype=np.float64)
        )

# AHORA (Le damos el balón al equipo Home):
        # 5. Ensamblaje Final
        return OmniscientGameState(
            game_id=game_id,
            clock=clock,
            possession_index=0,
            team_in_possession=TeamSide.HOME,  # <--- SALTO INICIAL GANADO POR BOSTON
            home=home_state,
            away=away_state,
            tracking=tracking
        )