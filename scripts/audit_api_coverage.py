"""
audit_api_coverage.py
======================
Phase 6.5 -- Security Ring 1: Data Completeness Audit.

This script dynamically extracts all fields defined in the ingestion adapters' 
raw dataclasses and cross-references them against the authoritative 
variables in docs/NUSE/09_VARIABLES/*.md.
"""

import ast
import re
import sys
from pathlib import Path
from typing import Set

def extract_ontology_variables(docs_dir: Path) -> Set[str]:
    variables = set()
    variable_pattern = re.compile(r'\b[A-Z][A-Z0-9_]{1,}\b')
    
    for md_file in docs_dir.glob("*.md"):
        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith('#'): continue
                matches = variable_pattern.findall(line)
                variables.update(matches)
    return variables

def extract_adapter_fields(adapter_path: Path) -> Set[str]:
    if not adapter_path.exists():
        return set()
    with open(adapter_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())
        
    fields = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            if any(name in node.name for name in ["Raw", "Metrics", "Input", "Record", "Snapshot", "Bundle"]):
                for item in node.body:
                    if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                        field_name = item.target.id
                        const_case = re.sub(r'(?<!^)(?=[A-Z])', '_', field_name).upper()
                        fields.add(const_case)
    return fields

def run_audit() -> None:
    print("=" * 60)
    print("NUSE PHASE 6.5 - SECURITY RING 1: API COVERAGE AUDIT")
    print("=" * 60)
    
    repo_root = Path(__file__).parent.parent if Path(__file__).parent.name == "scripts" else Path.cwd()
    docs_dir = repo_root / "docs" / "NUSE" / "09_VARIABLES"
    on_court = repo_root / "nba_omniscient_simulator" / "data_ingestion_adapter.py"
    off_court = repo_root / "nba_omniscient_simulator" / "off_court_ingestion_adapter.py"
    
    if not docs_dir.exists():
        print(f"[FATAL] Variables directory not found at {docs_dir}")
        sys.exit(1)
        
    ontology_vars = extract_ontology_variables(docs_dir)
    print(f"[*] Loaded {len(ontology_vars)} canonical variables from ontology.")
    
    api_fields = extract_adapter_fields(on_court) | extract_adapter_fields(off_court)
    print(f"[*] Extracted {len(api_fields)} fields from ingestion adapters.")
    
    # Exclude internal Python structures and generic category labels, not real stats
    whitelist = {
        'ID', 'PLAYER_ID', 'TEAM_ID', 'GAME_ID', 'SEASON', 'TIMESTAMP', 
        'DATE', 'NAME', 'WARNINGS', 'GENERATED_AT', 'URL', 'METRICS',
        'ABBREVIATION', 'MIN', 'SEC', 'IS_GHOST', 'BIRTHDATE', 'AGE',
        'PLAYER_LATENT_STATES', 'TEAM_ECOSYSTEM_STATES', 'COACH_PROFILES',
        'REFEREE_BIAS_INPUTS', 'PSYCHOLOGICAL_STRESS_INPUTS', 'FINANCIAL_DISTORTION_INPUTS',
        'CLOSING_LINE_VALUE_INPUTS', 'VEGAS_RECALIBRATION_INPUTS', 'BIOMETRIC_FATIGUE_EXTERNAL_INPUTS',
        'CONTRACT_SNAPSHOTS_BY_PLAYER', 'FRANCHISE_FINANCIAL_STATUS_BY_TEAM',
        'MEDICAL_HISTORY_BY_PLAYER', 'TRAVEL_FATIGUE_BY_TEAM', 'FRANCHISE_DYNAMICS_BY_TEAM',
        'EXTRA_OFF_COURT_VARIABLES', 'BIOMETRIC_FATIGUE_INPUTS', 'PLAYER_IDS', 'ROSTER_PLAYER_IDS',
        'ADVANCED', 'MISC', 'SCORING', 'PASSING', 'HUSTLE', 'TRACKING_DEFENSE', 'GROUP_ID', 'BREF_OVERRIDES', 'FREQUENCY'
    }
    
    unmapped = api_fields - ontology_vars - whitelist
    
    if unmapped:
        print("\n[CRITICAL ALERT] PIPELINE HALTED.")
        print("The following API fields are ingested but NOT defined in the NUSE variable ontology:")
        for field in sorted(unmapped): print(f"  -> {field}")
        print("\nResolution: Add these variables to the corresponding .md file in docs/NUSE/09_VARIABLES/.")
        sys.exit(1)
        
    print("\n[SUCCESS] Security Ring 1 Passed. All API fields are formally mapped in the ontology.")
    print("=" * 60)

if __name__ == "__main__":
    run_audit()