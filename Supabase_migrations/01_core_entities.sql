-- =============================================================================
-- BLOQUE 1: CORE ENTITIES
-- Venues, Teams, Seasons, Players, Coaches (bio + perfil paramétrico), Referees, Games
-- Fuente conceptual: docs/NUSE/08_ENTITIES/{ENTITY_TEAM,ENTITY_PLAYER,ENTITY_GAME}.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 VENUES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venues (
    venue_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    city                TEXT NOT NULL,
    state_province      TEXT,
    country             TEXT NOT NULL DEFAULT 'USA',
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    altitude_meters     NUMERIC(6,1),           -- clave para el efecto altitud (Denver ~1609m, Utah ~1288m)
    timezone            TEXT NOT NULL,           -- nombre IANA, p.ej. 'America/Denver'
    capacity            INTEGER,
    roof_type           roof_type_enum,
    year_opened         SMALLINT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    extra_attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN venues.altitude_meters IS 'Input directo para VARIABLE_ALTITUDE_EFFECT (05_VARIABLES_INDEX.md §7).';
CREATE TRIGGER trg_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues (city);


-- -----------------------------------------------------------------------------
-- 1.2 TEAMS
-- -----------------------------------------------------------------------------
-- NOTA: esta tabla ya existe en tu Supabase (confirmado por `.from('teams')` en
-- tu código). Se incluye aquí con IF NOT EXISTS para que el script sea
-- autocontenido; si tu definición real difiere, reconcilia antes de aplicar
-- el resto del esquema, porque todo lo demás hace FK contra `teams.team_id`.
CREATE TABLE IF NOT EXISTS teams (
    team_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           TEXT NOT NULL,
    city                TEXT NOT NULL,
    nickname            TEXT NOT NULL,
    abbreviation        VARCHAR(3) NOT NULL UNIQUE,
    conference          TEXT NOT NULL CHECK (conference IN ('Eastern', 'Western')),
    division            TEXT NOT NULL,
    home_venue_id       UUID REFERENCES venues (venue_id),
    founded_year        SMALLINT,
    primary_color_hex   VARCHAR(7),
    secondary_color_hex VARCHAR(7),
    logo_url            TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_teams_conference_division ON teams (conference, division);


-- -----------------------------------------------------------------------------
-- 1.3 SEASONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
    season_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label                TEXT NOT NULL UNIQUE,       -- p.ej. '2026-27'
    year_start           SMALLINT NOT NULL,
    year_end             SMALLINT NOT NULL,
    salary_cap_amount    NUMERIC(14,2),
    luxury_tax_line      NUMERIC(14,2),
    first_apron_line     NUMERIC(14,2),
    second_apron_line    NUMERIC(14,2),
    is_current           BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (year_end = year_start + 1)
);
-- Garantiza que solo una temporada esté marcada como actual a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_seasons_only_one_current
    ON seasons (is_current) WHERE is_current = true;


-- -----------------------------------------------------------------------------
-- 1.4 PLAYERS
-- -----------------------------------------------------------------------------
-- NOTA: ya existe en tu Supabase (`.from('players')`). IF NOT EXISTS por la
-- misma razón que `teams`. `current_team_id` se mantiene mediante el trigger
-- date-guarded definido junto a `transactions` en BLOQUE 8 (08_finance_cba.sql)
-- — no lo dupliques aquí, esa es la fuente de verdad para el mecanismo.
CREATE TABLE IF NOT EXISTS players (
    player_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name            TEXT NOT NULL,
    first_name           TEXT NOT NULL,
    last_name            TEXT NOT NULL,
    birth_date           DATE,
    birth_country        TEXT,
    height_cm            NUMERIC(5,1),
    weight_kg            NUMERIC(5,1),
    wingspan_cm          NUMERIC(5,1),
    standing_reach_cm    NUMERIC(5,1),
    body_fat_percent     NUMERIC(4,1),
    primary_position     position_enum,
    secondary_position   position_enum,
    shooting_hand        shooting_hand_enum,
    current_team_id      UUID REFERENCES teams (team_id),
    draft_year           SMALLINT,
    draft_round          SMALLINT CHECK (draft_round IN (1, 2)),
    draft_pick           SMALLINT,
    draft_team_id        UUID REFERENCES teams (team_id),
    is_undrafted         BOOLEAN NOT NULL DEFAULT false,
    years_experience     SMALLINT NOT NULL DEFAULT 0,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    retirement_date      DATE,
    headshot_url         TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN players.wingspan_cm IS 'Input físico para rim_pressure / interior defense; no confundir con la dimensión latente.';
CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_players_current_team ON players (current_team_id);
CREATE INDEX IF NOT EXISTS idx_players_draft_year ON players (draft_year);
CREATE INDEX IF NOT EXISTS idx_players_full_name_trgm ON players USING gin (full_name gin_trgm_ops);


-- -----------------------------------------------------------------------------
-- 1.5 COACHES (biográfico) + COACH_PROFILES (paramétrico, espejo de coach.py)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaches (
    coach_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name             TEXT NOT NULL,
    birth_date            DATE,
    nationality           TEXT,
    years_experience_total SMALLINT NOT NULL DEFAULT 0,
    career_win_pct        NUMERIC(5,4),
    headshot_url          TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_coaches_updated_at BEFORE UPDATE ON coaches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Espejo relacional EXACTO de nba_omniscient_simulator/coach.py::CoachProfile.
-- Las 6 columnas, sus nombres y el rango [0,1] replican el dataclass literal
-- (incluida la validación de __post_init__, aquí como CHECK constraints).
-- coach_id es NULLABLE a propósito: tu propio docstring dice "No coach's real
-- name... is ever encoded here" — un perfil puede ser puramente hipotético
-- para un escenario what-if sin estar ligado a ningún coach real.
CREATE TABLE IF NOT EXISTS coach_profiles (
    coach_profile_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id                     UUID REFERENCES coaches (coach_id),
    season_id                    UUID REFERENCES seasons (season_id),
    minutes_concentration_index  NUMERIC(4,3) NOT NULL CHECK (minutes_concentration_index BETWEEN 0 AND 1),
    usage_flexibility            NUMERIC(4,3) NOT NULL CHECK (usage_flexibility BETWEEN 0 AND 1),
    pace_modifier                NUMERIC(4,3) NOT NULL CHECK (pace_modifier BETWEEN 0 AND 1),
    defensive_scheme_rigidity    NUMERIC(4,3) NOT NULL CHECK (defensive_scheme_rigidity BETWEEN 0 AND 1),
    lineup_experimentation_rate  NUMERIC(4,3) NOT NULL CHECK (lineup_experimentation_rate BETWEEN 0 AND 1),
    quick_hook_tendency          NUMERIC(4,3) NOT NULL CHECK (quick_hook_tendency BETWEEN 0 AND 1),
    is_hypothetical              BOOLEAN NOT NULL DEFAULT false,
    fitted_from_source           TEXT,   -- p.ej. 'historical_pbp_regression_v3'
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE coach_profiles IS
    'Espejo 1:1 de CoachProfile (coach.py). Nunca ramifica por identidad de coach — solo números continuos consumidos por CoachModifier.';
CREATE INDEX IF NOT EXISTS idx_coach_profiles_coach ON coach_profiles (coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_season ON coach_profiles (season_id);

CREATE TABLE IF NOT EXISTS team_coaching_history (
    team_coaching_history_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id                   UUID NOT NULL REFERENCES teams (team_id),
    coach_id                  UUID NOT NULL REFERENCES coaches (coach_id),
    coach_profile_id          UUID REFERENCES coach_profiles (coach_profile_id),
    role                      TEXT NOT NULL DEFAULT 'head_coach'
                              CHECK (role IN ('head_coach', 'associate_head_coach', 'assistant_coach', 'player_development_coach')),
    start_date                DATE NOT NULL,
    end_date                  DATE,           -- NULL = tenure activa
    departure_reason          TEXT,           -- 'fired','resigned','contract_expired','promoted', etc.
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);
-- Un único head_coach activo por equipo a la vez (guarda por fecha, mismo
-- espíritu que tu trigger current_team_id).
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_head_coach_per_team
    ON team_coaching_history (team_id) WHERE role = 'head_coach' AND end_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_coaching_history_team ON team_coaching_history (team_id);
CREATE INDEX IF NOT EXISTS idx_team_coaching_history_coach ON team_coaching_history (coach_id);


-- -----------------------------------------------------------------------------
-- 1.6 REFEREES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referees (
    referee_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name              TEXT NOT NULL,
    birth_date             DATE,
    nba_debut_season_id    UUID REFERENCES seasons (season_id),
    is_crew_chief_eligible BOOLEAN NOT NULL DEFAULT false,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_referees_updated_at BEFORE UPDATE ON referees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- 1.7 GAMES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
    game_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id               UUID NOT NULL REFERENCES seasons (season_id),
    season_type             season_type_enum NOT NULL DEFAULT 'regular_season',
    game_date               DATE NOT NULL,
    game_datetime_utc       TIMESTAMPTZ NOT NULL,
    home_team_id            UUID NOT NULL REFERENCES teams (team_id),
    away_team_id            UUID NOT NULL REFERENCES teams (team_id),
    venue_id                UUID NOT NULL REFERENCES venues (venue_id),
    status                  game_status_enum NOT NULL DEFAULT 'scheduled',
    home_score              SMALLINT,
    away_score              SMALLINT,
    overtime_periods        SMALLINT NOT NULL DEFAULT 0,
    attendance              INTEGER,
    is_nationally_televised BOOLEAN NOT NULL DEFAULT false,
    broadcast_network       TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (home_team_id <> away_team_id)
);
CREATE TRIGGER trg_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_games_season ON games (season_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games (game_date);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games (home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games (away_team_id);

CREATE TABLE IF NOT EXISTS game_officials (
    game_id     UUID NOT NULL REFERENCES games (game_id) ON DELETE CASCADE,
    referee_id  UUID NOT NULL REFERENCES referees (referee_id),
    role        referee_role_enum NOT NULL,
    PRIMARY KEY (game_id, referee_id)
);
CREATE INDEX IF NOT EXISTS idx_game_officials_referee ON game_officials (referee_id);