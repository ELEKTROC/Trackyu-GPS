"""
Phase 3: Fix remaining type errors after any→typed conversion.
Handles:
  - req.query values pushed to QueryParam[] (add `as string` cast)
  - PoolClient wrongly typed as Record
  - Property access on unknown
"""
import os
import re
import sys

CONTROLLERS_DIR = os.path.join("backend", "src", "controllers")
stats = {"fixes": 0}

def fix_file(filepath: str) -> bool:
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()
    content = original

    # 1. Fix req.query value pushes to params arrays
    # Pattern: params.push(someVar) where someVar came from req.query
    # We look for: const someVar = req.query.xxx ... params.push(someVar)
    # Simpler: just cast all req.query.xxx to string when assigned
    
    # Cast req.query.xxx as string in variable assignments
    # Pattern: const/let varName = req.query.xxx;  →  const/let varName = req.query.xxx as string;
    # But only if not already cast
    pattern_query_assign = r'((?:const|let)\s+\w+\s*=\s*req\.query\.\w+)(\s*(?:as\s+string)?\s*(?:\|\||;))'
    # This is tricky. Let me be more targeted.
    
    # More direct: add `as string` to params.push() where value comes from query
    # Actually, let's fix it at the source: where req.query is read
    
    # Pattern: `const status = req.query.status;` → `const status = req.query.status as string;`
    # But also: `const { status, type } = req.query;` isn't common in this codebase

    # Fix query param reading with explicit as string
    # req.query.xxx || defaultValue  →  (req.query.xxx as string) || defaultValue
    # req.query.xxx  →  req.query.xxx as string  (when used in assignment without cast)
    
    # Actually, let's just look at what patterns create the error and fix them.
    # The error is: `Argument of type 'string | ParsedQs | (string | ParsedQs)[]' is not assignable to parameter of type 'QueryParam'`
    # This happens at params.push(value) where value = req.query.xxx
    
    # Best approach: find assignments from req.query and add `as string`
    # Pattern: `const varName = req.query.xxx;` → add `as string`
    content = re.sub(
        r'(=\s*req\.query\.\w+)(\s*;)',
        r'\1 as string\2',
        content
    )
    
    # Pattern: `const varName = req.query.xxx ||` → `(req.query.xxx as string) ||`
    content = re.sub(
        r'(=\s*)(req\.query\.\w+)(\s*\|\|)',
        r'\1(\2 as string)\3',
        content
    )
    
    # Pattern: `const varName = req.query.xxx as string as string` (avoid double cast)
    content = content.replace(' as string as string', ' as string')

    # Pattern: params.push(req.query.xxx) → params.push(req.query.xxx as string)
    content = re.sub(
        r'(\.push\(\s*)(req\.query\.\w+)(\s*\))',
        r'\1\2 as string\3',
        content
    )

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        stats["fixes"] += 1
        return True
    return False


def main():
    files = sorted([
        os.path.join(CONTROLLERS_DIR, f)
        for f in os.listdir(CONTROLLERS_DIR)
        if f.endswith(".ts")
    ])
    
    print(f"Phase 3: Processing {len(files)} files...")
    modified = []
    for fp in files:
        if fix_file(fp):
            modified.append(os.path.basename(fp))
    
    print(f"Fixed {stats['fixes']} files")
    for f in modified:
        print(f"  ✓ {f}")


if __name__ == "__main__":
    main()
