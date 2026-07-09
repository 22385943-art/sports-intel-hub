"""
generate_ultimate_schema.py
===========================
Phase 7.1 -- Omniscient Database Expansion.
"""

import re
from pathlib import Path

def generate_sql():
    print("=" * 60)
    print("NUSE PHASE 7.1 - OMNISCIENT SQL GENERATOR")
    print("=" * 60)

    repo_root = Path(__file__).parent.parent
    docs_dir = repo_root / "docs" / "NUSE" / "09_VARIABLES"
    sql_output_path = repo_root / "Supabase_migrations" / "03_omniscient_expansion.sql"

    if not docs_dir.exists():
        print(f"[FATAL] Variables directory not found at {docs_dir}")
        return

    variable_pattern = re.compile(r'\b[A-Z][A-Z0-9_]{3,}\b')
    core_whitelist = {
        'ID', 'ENTITY_ID', 'MEASUREMENT_TIMESTAMP', 'PLAYER_ID', 
        'TEAM_ID', 'GAME_ID', 'SEASON', 'TIMESTAMP', 'DATE', 'NAME'
    }

    sql_statements = [
        "-- =====================================================================",
        "-- NUSE OMNISCIENT EXPANSION SCHEMA (AUTO-GENERATED)",
        "-- =====================================================================\n"
    ]

    total_vars_mapped = 0

    for md_file in docs_dir.glob("*.md"):
        table_name = f"nuse_state_{md_file.stem.lower()}"
        variables_in_domain = set()
        
        with open(md_file, "r", encoding="utf-8") as f:
            for line in f.read().splitlines():
                line = line.strip()
                if not line or line.startswith('#'): continue
                for match in variable_pattern.findall(line):
                    if match not in core_whitelist:
                        variables_in_domain.add(match)

        if not variables_in_domain:
            continue

        sorted_vars = sorted(list(variables_in_domain))
        total_vars_mapped += len(sorted_vars)

        sql_statements.append(f"-- Domain: {md_file.stem}")
        sql_statements.append(f"CREATE TABLE IF NOT EXISTS {table_name} (")
        sql_statements.append(f"    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),")
        sql_statements.append(f"    entity_id UUID,")
        sql_statements.append(f"    measurement_timestamp TIMESTAMPTZ DEFAULT NOW(),")
        
        for idx, var in enumerate(sorted_vars):
            col_name = var.lower()
            col_type = "BOOLEAN" if col_name.endswith('_flag') or col_name.endswith('_status') else "TEXT" if col_name.endswith('_id') else "FLOAT"
            is_last = (idx == len(sorted_vars) - 1)
            
            # ESCUDO ANTI-PALABRAS RESERVADAS: Envolvemos el nombre en dobles comillas
            sql_statements.append(f"    \"{col_name}\" {col_type}{'' if is_last else ','}")
            
        sql_statements.append(f");\n")
        sql_statements.append(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_entity ON {table_name}(entity_id);\n")

    sql_output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(sql_output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    print(f"[*] Successfully generated SQL schema.")
    print(f"[*] Mapped {total_vars_mapped} unique simulation variables across {len(list(docs_dir.glob('*.md')))} domains.")
    print(f"[*] Output saved to: {sql_output_path.name}")
    print("=" * 60)

if __name__ == "__main__":
    generate_sql()