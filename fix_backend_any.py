"""
Bulk replace `any` patterns in backend controllers.
Run from project root: python fix_backend_any.py
"""
import os
import re
import sys

CONTROLLERS_DIR = os.path.join("backend", "src", "controllers")

stats = {
    "catch_error_any": 0,
    "error_message": 0,
    "req_as_any_user": 0,
    "req_user_as_any": 0,
    "params_any": 0,
    "values_any": 0,
    "files_modified": 0,
    "files_needing_getErrorMessage": set(),
    "files_needing_QueryParam": set(),
}


def fix_file(filepath: str) -> bool:
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()

    content = original
    basename = os.path.basename(filepath)

    # ── 1. catch (error: any) → catch (error: unknown)
    count = content.count("catch (error: any)")
    if count > 0:
        content = content.replace("catch (error: any)", "catch (error: unknown)")
        stats["catch_error_any"] += count
        stats["files_needing_getErrorMessage"].add(filepath)

    # Also catch (err: any) variant
    count2 = content.count("catch (err: any)")
    if count2 > 0:
        content = content.replace("catch (err: any)", "catch (err: unknown)")
        stats["catch_error_any"] += count2

    # ── 2. error.message → getErrorMessage(error) (only in files that had catch changes)
    if count > 0:
        # Pattern: error.message (not error?.message yet)
        # Replace error.message when used as a value (not as assignment target)
        # Common patterns:
        #   error.message || 'fallback'    → getErrorMessage(error)
        #   error.message                  → getErrorMessage(error)
        #   error?.message                 → getErrorMessage(error)
        #   `${error.message}`             → `${getErrorMessage(error)}`
        
        # Replace error?.message
        c = content.count("error?.message")
        if c > 0:
            content = content.replace("error?.message", "getErrorMessage(error)")
            stats["error_message"] += c
        
        # Replace error.message but NOT "getErrorMessage(error).message" (avoid double-replace)
        # Use regex to replace error.message that's not preceded by getErrorMessage(
        pattern = r'(?<!getErrorMessage\()error\.message'
        matches = re.findall(pattern, content)
        if matches:
            content = re.sub(pattern, "getErrorMessage(error)", content)
            stats["error_message"] += len(matches)
    
    if count2 > 0:
        # Same for err variable
        c = content.count("err?.message")
        if c > 0:
            content = content.replace("err?.message", "getErrorMessage(err)")
            stats["error_message"] += c
        pattern = r'(?<!getErrorMessage\()err\.message'
        matches = re.findall(pattern, content)
        if matches:
            content = re.sub(pattern, "getErrorMessage(err)", content)
            stats["error_message"] += len(matches)

    # ── 3. (req as any).user → req.user
    pattern_req_as_any = r'\(req\s+as\s+any\)\.user'
    matches = re.findall(pattern_req_as_any, content)
    if matches:
        content = re.sub(pattern_req_as_any, "req.user", content)
        stats["req_as_any_user"] += len(matches)

    # ── 4. req.user as any → req.user! (in destructuring)
    # Pattern: = req.user as any;  →  = req.user!;
    pattern_user_as_any = r'req\.user\s+as\s+any'
    matches = re.findall(pattern_user_as_any, content)
    if matches:
        content = re.sub(pattern_user_as_any, "req.user!", content)
        stats["req_user_as_any"] += len(matches)

    # ── 5. params: any[] → params: QueryParam[]
    # Also values: any[], verifyParams: any[], ticketParams: any[], etc.
    pattern_params = r'(\w+Params?|values|countParams)\s*:\s*any\[\]'
    matches = re.findall(pattern_params, content)
    if matches:
        content = re.sub(pattern_params, r'\1: QueryParam[]', content)
        stats["params_any"] += len(matches)
        stats["files_needing_QueryParam"].add(filepath)

    # Also: let params: any[];
    pattern_let_params = r'(let\s+\w+Params?\s*:\s*)any\[\]'
    matches2 = re.findall(pattern_let_params, content)
    if matches2:
        content = re.sub(pattern_let_params, r'\1QueryParam[]', content)
        stats["params_any"] += len(matches2)
        stats["files_needing_QueryParam"].add(filepath)

    # ── 6. Add imports if needed
    needs_getErrorMessage = filepath in stats["files_needing_getErrorMessage"]
    needs_QueryParam = filepath in stats["files_needing_QueryParam"]
    
    if needs_getErrorMessage or needs_QueryParam:
        imports = []
        if needs_getErrorMessage:
            imports.append("getErrorMessage")
        if needs_QueryParam:
            imports.append("QueryParam")
        
        import_line = f"import {{ {', '.join(imports)} }} from '../types/common';\n"
        
        # Check if import already exists
        if "from '../types/common'" not in content:
            # Add after last import line
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import ') or line.strip().startswith('import{'):
                    last_import_idx = i
            
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, import_line.rstrip())
            else:
                lines.insert(0, import_line.rstrip())
            
            content = '\n'.join(lines)

    # Write if changed
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        stats["files_modified"] += 1
        return True
    return False


def main():
    if not os.path.isdir(CONTROLLERS_DIR):
        print(f"ERROR: Directory not found: {CONTROLLERS_DIR}")
        sys.exit(1)

    files = sorted([
        os.path.join(CONTROLLERS_DIR, f)
        for f in os.listdir(CONTROLLERS_DIR)
        if f.endswith(".ts")
    ])

    print(f"Processing {len(files)} controller files...")
    
    modified = []
    for filepath in files:
        if fix_file(filepath):
            modified.append(os.path.basename(filepath))
    
    print(f"\n=== RESULTS ===")
    print(f"Files modified: {stats['files_modified']}")
    print(f"catch (error: any) → unknown: {stats['catch_error_any']}")
    print(f"error.message → getErrorMessage(): {stats['error_message']}")
    print(f"(req as any).user → req.user: {stats['req_as_any_user']}")
    print(f"req.user as any → req.user!: {stats['req_user_as_any']}")
    print(f"params: any[] → QueryParam[]: {stats['params_any']}")
    print(f"\nModified files:")
    for f in modified:
        print(f"  ✓ {f}")


if __name__ == "__main__":
    main()
