"""
audit_api_coverage.py
======================
Phase 6.5 -- Security Ring 1: Data Completeness Audit.

This script acts as a hard checkpoint in the NUSE pipeline.
It dynamically extracts all fields defined in the ingestion adapters' 
raw dataclasses (representing API/Second Spectrum data) and cross-references 
them against the authoritative variables in docs/NUSE/09_VARIABLES/*.md.

If the API provides a metric that is NOT conceptually mapped in the 
variable ontology, the pipeline halts. No human memory required.
"""

import ast
import re
import sys
from pathlib import Path
from typing import Set

def extract_ontology_variables(docs_dir: Path) -> Set[str]:
    """Scans all Markdown files in the variables directory for canonical identifiers."""
    variables = set()
    variable_pattern = re.compile(r'\b[A-Z][A-Z0-9_]{3,}\b')
    
    for md_file in docs_dir.glob("*.md"):
        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()
            # Exclude headers and focus on variable definitions
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                # Variables are usually listed plain or with a description
                matches = variable_pattern.findall(line)
                variables.update(matches)
    return variables

def extract_adapter_fields(adapter_path: Path) -> Set[str]:
    """Parses the Python AST to find all fields in Raw/Input dataclasses."""
    with open(adapter_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())
        
    fields = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            # Target raw/input dataclasses
            if any(name in node.name for name in ["Raw", "Metrics", "Input", "Record", "Snapshot", "Bundle"]):
                for item in node.body:
                    if isinstance(item, ast.AnnAssign):
                        if isinstance(item.target, ast.Name):
                            # Convert camelCase/snake_case to CONSTANT_CASE for comparison
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
    on_court_adapter = repo_root / "nba_omniscient_simulator" / "data_ingestion_adapter.py"
    off_court_adapter = repo_root / "nba_omniscient_simulator" / "off_court_ingestion_adapter.py"
    
    if not docs_dir.exists():
        print(f"[FATAL] Variables directory not found at {docs_dir}")
        sys.exit(1)
        
    ontology_vars = extract_ontology_variables(docs_dir)
    print(f"[*] Loaded {len(ontology_vars)} canonical variables from ontology.")
    
    api_fields = set()
    if on_court_adapter.exists():
        api_fields.update(extract_adapter_fields(on_court_adapter))
    if off_court_adapter.exists():
        api_fields.update(extract_adapter_fields(off_court_adapter))
        
    print(f"[*] Extracted {len(api_fields)} fields from ingestion adapters.")
    
    # Common Python/DB properties that don't need ontology mapping
    whitelist = {
        'ID', 'PLAYER_ID', 'TEAM_ID', 'GAME_ID', 'SEASON', 'TIMESTAMP', 
        'DATE', 'NAME', 'WARNINGS', 'GENERATED_AT', 'URL', 'METRICS',
        'ABBREVIATION', 'MIN', 'SEC'
    }
    
    unmapped_fields = api_fields - ontology_vars - whitelist
    
    if unmapped_fields:
        print("\n[CRITICAL ALERT] PIPELINE HALTED.")
        print("The following API fields are ingested but NOT defined in the NUSE variable ontology:")
        for field in sorted(unmapped_fields):
            print(f"  -> {field}")
        print("\nResolution: Add these variables to the corresponding .md file in docs/NUSE/09_VARIABLES/.")
        sys.exit(1)
        
    print("\n[SUCCESS] Security Ring 1 Passed. All API fields are formally mapped in the ontology.")
    print("=" * 60)

if __name__ == "__main__":
    run_audit()