-- =============================================================================
-- NBA UNIVERSAL SIMULATION ENGINE (NUSE) — ESQUEMA SQL RELACIONAL MAESTRO
-- =============================================================================
-- Arquitecto: Chief Quantitative Data Architect
-- Motor de base de datos objetivo: PostgreSQL 15+ (Supabase)
-- Alineado con: docs/NUSE/01_ONTOLOGY.md, 03_DATA_MODEL.md, 05_VARIABLES_INDEX.md,
--               08_ENTITIES/*.md, y el paquete nba_omniscient_simulator/ (ground truth
--               de PlayerLatentState, CoachProfile y EventType).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DECISIONES ARQUITECTÓNICAS (léelas antes de tocar nada)
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SCHEMA: todo vive en `public`, igual que tus tablas actuales (`teams`,
--    `players`, `player_season_stats`, `daily_projections` vistas en tu código
--    vía supabase-js `.from(...)`). Un schema nuevo rompería esos joins sin
--    beneficio real.
--
-- 2. CLAVES PRIMARIAS — HÍBRIDO UUID / BIGINT IDENTITY (deliberado, no es
--    inconsistencia):
--      - UUID (gen_random_uuid()) en entidades y tablas de dimensión con
--        volumen bajo/medio: teams, players, games, contratos, lesiones, etc.
--        Se referencian desde fuera (APIs, frontend) y el volumen no penaliza
--        el índice.
--      - BIGINT GENERATED ALWAYS AS IDENTITY en tablas de hechos de alto
--        volumen: pbp_events, possessions, biometría diaria, líneas de apuestas.
--        Un partido genera ~450-500 eventos; con 1230 partidos/temporada y
--        multi-temporada esto escala a decenas de millones de filas. UUID v4
--        aquí infla el índice ~2-3x y degrada el cache hit ratio del B-tree
--        por su aleatoriedad. BIGINT secuencial es la elección correcta.
--
-- 3. ENUM vs TABLA DE LOOKUP:
--      - ENUM nativo de Postgres para catálogos CERRADOS y estables que tu
--        propia ontología declara como "Allowed categories" (ENTITY_EVENT,
--        ENTITY_POSSESSION) o que corresponden 1:1 a un Enum de Python real
--        (EventType en domain.py).
--      - Tabla de lookup normalizada para taxonomías ABIERTAS que crecerán
--        (tipos de evento granulares, play types, sportsbooks, partes del
--        cuerpo lesionadas) — añadir una fila es más barato y más seguro en
--        producción que un ALTER TYPE ... ADD VALUE (que además no puede
--        ejecutarse dentro de una transacción que lo usa en la misma sesión).
--
-- 4. COLUMNAS GENERATED: se usan SOLO cuando todos los inputs viven en la
--    misma fila (p.ej. ACWR = carga_aguda/carga_crónica, net_rtg = ort-drt).
--    TS%/eFG% NO son GENERATED aquí porque sus inputs (PTS, FGA, FTA, FGM)
--    viven en `game_player_stats` mientras el propio TS% vive en
--    `game_player_advanced_stats` — Postgres no permite generated columns
--    cross-tabla. Se documentan con COMMENT ON COLUMN y las calcula tu motor
--    (Cerebro/Motor) en el pipeline de ingesta, igual que ya haces con
--    buildProjections.mjs.
--
-- 5. EXTENSIBILIDAD: varias tablas incluyen una columna `extra_JSONB` como
--    válvula de escape. Tu propio 03_DATA_MODEL.md prohíbe "datos implícitos"
--    y "variables huérfanas" en el modelo conceptual, pero a nivel físico es
--    la diferencia entre re-migrar el esquema cada vez que Second Spectrum
--    añade una métrica nueva o simplemente insertar una clave más.
--
-- 6. IDEMPOTENCIA: todo el DDL usa CREATE TABLE IF NOT EXISTS y un patrón
--    DO $$ ... EXCEPTION WHEN duplicate_object para los ENUM, para que puedas
--    re-ejecutar el script completo sin romper nada si ya aplicaste una parte.
--    Para evolución real de esquema en producción, considera una herramienta
--    de migraciones versionadas (node-pg-migrate, Prisma Migrate, sqitch) en
--    vez de re-correr este master script — está pensado como fundacional,
--    no como sistema de migraciones incremental.
--
-- 7. NOMBRES: snake_case en todo (tablas, columnas, tipos), consistente con
--    tus tablas Supabase existentes y con `current_team_id` en tu trigger
--    ya validado.
-- =============================================================================


-- =============================================================================
-- BLOQUE 0.1: EXTENSIONS
-- =============================================================================

-- gen_random_uuid() es nativo desde PG13, pero se deja pgcrypto por
-- compatibilidad defensiva con entornos gestionados más antiguos.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- cube + earthdistance habilitan cálculo de distancia gran-círculo entre
-- coordenadas lat/long de venues (ver BLOQUE 6 — kilómetros viajados).
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- pg_trgm habilita búsqueda difusa de nombres de jugador/equipo (autocompletado).
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- =============================================================================
-- BLOQUE 0.2: FUNCIÓN GENÉRICA updated_at
-- =============================================================================
-- Trigger reutilizable para mantener updated_at en cualquier tabla mutable.
-- (Tu trigger existente de current_team_id en `players` es del mismo espíritu:
-- guardas la mecánica en la base de datos, no en la capa de aplicación.)

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- BLOQUE 0.3: ENUM TYPES
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE season_type_enum AS ENUM
        ('preseason', 'regular_season', 'play_in', 'playoffs', 'all_star');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE game_status_enum AS ENUM
        ('scheduled', 'in_progress', 'final', 'postponed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE position_enum AS ENUM ('PG', 'SG', 'SF', 'PF', 'C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE shooting_hand_enum AS ENUM ('left', 'right', 'ambidextrous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE roof_type_enum AS ENUM ('fixed', 'retractable', 'open_air');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE referee_role_enum AS ENUM ('crew_chief', 'referee', 'umpire');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fuente: docs/NUSE/08_ENTITIES/ENTITY_EVENT.md §4 "Allowed categories" (12, cerrado).
DO $$ BEGIN
    CREATE TYPE event_category_enum AS ENUM (
        'ball_movement', 'shot', 'rebound', 'turnover', 'foul',
        'defensive_action', 'substitution', 'timeout', 'violation',
        'jump_ball', 'replay', 'administrative'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE shot_zone_enum AS ENUM (
        'restricted_area', 'in_the_paint_non_ra', 'mid_range',
        'left_corner_3', 'right_corner_3', 'above_the_break_3', 'backcourt'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE possession_start_type_enum AS ENUM
        ('off_make', 'off_miss', 'off_turnover', 'off_deadball', 'start_of_period');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fuente: docs/NUSE/08_ENTITIES/ENTITY_POSSESSION.md §11 "Possession Outcomes".
DO $$ BEGIN
    CREATE TYPE possession_end_type_enum AS ENUM (
        'made_field_goal', 'made_final_free_throw', 'defensive_rebound',
        'steal', 'turnover', 'shot_clock_violation', 'offensive_foul',
        'end_of_period', 'jump_ball_possession_change', 'other_possession_change'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE laterality_enum AS ENUM ('left', 'right', 'bilateral', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE injury_mechanism_enum AS ENUM
        ('contact', 'non_contact', 'overuse', 'illness', 'personal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE injury_status_enum AS ENUM
        ('out', 'doubtful', 'questionable', 'probable', 'available', 'day_to_day');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE guarantee_type_enum AS ENUM
        ('fully_guaranteed', 'partially_guaranteed', 'non_guaranteed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE contract_type_enum AS ENUM (
        'rookie_scale', 'rookie_extension', 'veteran', 'minimum_salary',
        'two_way', 'exhibit_10', 'sign_and_trade', 'max_contract', 'supermax'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE option_type_enum AS ENUM
        ('none', 'player_option', 'team_option', 'early_termination_option');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE cap_hold_type_enum AS ENUM
        ('free_agent_hold', 'first_round_pick_hold', 'roster_charge', 'trade_exception_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE trade_exception_type_enum AS ENUM (
        'traded_player_exception', 'mle_taxpayer', 'mle_non_taxpayer',
        'mle_room', 'bi_annual_exception', 'disabled_player_exception'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE trade_asset_type_enum AS ENUM
        ('player', 'draft_pick', 'cash_considerations', 'trade_exception');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE prop_type_enum AS ENUM (
        'points', 'rebounds', 'assists', 'points_rebounds_assists',
        'points_rebounds', 'points_assists', 'rebounds_assists',
        'three_pointers_made', 'steals', 'blocks', 'steals_plus_blocks',
        'turnovers', 'double_double', 'triple_double', 'first_basket'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE travel_direction_enum AS ENUM ('eastward', 'westward', 'none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fuente: nba_omniscient_simulator/domain.py -> class EventType(Enum).
-- Los 4 valores son un espejo EXACTO del Enum de Python (mismos strings).
DO $$ BEGIN
    CREATE TYPE simulation_event_type_enum AS ENUM
        ('trade', 'injury', 'return_from_injury', 'coaching_change');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE simulation_session_type_enum AS ENUM ('game', 'practice', 'shootaround', 'off_day_training');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;