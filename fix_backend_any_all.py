"""
Fix any patterns in ALL backend src files (routes, services, middleware, gps-server, utils).
Reuses the same patterns as the controller scripts.
"""
import os
import re
import sys

SRC_DIR = os.path.join("backend", "src")
SKIP_DIRS = {"types", "controllers"}  # controllers already done
stats = {
    "catch_error_any": 0,
    "error_message": 0,
    "req_as_any_user": 0,
    "req_user_as_any": 0,
    "params_any": 0,
    "callback_any": 0,
    "other_any": 0,
    "files_needing_getErrorMessage": set(),
    "files_needing_QueryParam": set(),
    "files_modified": 0,
}


def fix_file(filepath: str) -> bool:
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()
    content = original

    # ── 1. catch (error: any) / (err: any) / (e: any) → unknown
    for var in ['error', 'err', 'e', 'fetchError', 'dbError']:
        pattern = f'catch ({var}: any)'
        count = content.count(pattern)
        if count > 0:
            content = content.replace(pattern, f'catch ({var}: unknown)')
            stats["catch_error_any"] += count
            stats["files_needing_getErrorMessage"].add(filepath)

    # ── 2. error.message / err.message → getErrorMessage()
    for var in ['error', 'err', 'e']:
        if filepath in stats["files_needing_getErrorMessage"]:
            # error?.message
            old = f'{var}?.message'
            c = content.count(old)
            if c > 0:
                content = content.replace(old, f'getErrorMessage({var})')
                stats["error_message"] += c
            
            # error.message (not already getErrorMessage)
            pattern = rf'(?<!getErrorMessage\(){re.escape(var)}\.message'
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, f'getErrorMessage({var})', content)
                stats["error_message"] += len(matches)

    # ── 3. (req as any).user → req.user
    pattern_req = r'\(req\s+as\s+any\)\.user'
    matches = re.findall(pattern_req, content)
    if matches:
        content = re.sub(pattern_req, 'req.user', content)
        stats["req_as_any_user"] += len(matches)

    # ── 4. req.user as any → req.user!
    pattern_user = r'req\.user\s+as\s+any'
    matches = re.findall(pattern_user, content)
    if matches:
        content = re.sub(pattern_user, 'req.user!', content)
        stats["req_user_as_any"] += len(matches)

    # ── 5. params: any[] / values: any[] → QueryParam[]
    pattern_params = r'((?:const|let)\s+\w*[Pp]arams?\s*:\s*)any\[\]'
    m = re.findall(pattern_params, content)
    if m:
        content = re.sub(pattern_params, r'\1QueryParam[]', content)
        stats["params_any"] += len(m)
        stats["files_needing_QueryParam"].add(filepath)

    pattern_let = r'(let\s+\w+\s*:\s*)any\[\]'
    m2 = re.findall(pattern_let, content)
    if m2:
        content = re.sub(pattern_let, r'\1QueryParam[]', content)
        stats["params_any"] += len(m2)
        stats["files_needing_QueryParam"].add(filepath)

    # ── 6. Callback (xxx: any) in .forEach/.map/.filter → Record<string, unknown>
    pattern_cb = r'\((\w+)\s*:\s*any\)\s*=>'
    m3 = re.findall(pattern_cb, content)
    if m3:
        content = re.sub(pattern_cb, r'(\1: Record<string, unknown>) =>', content)
        stats["callback_any"] += len(m3)

    # ── 7. Function params with : any (data: any, alert: any, etc.)
    # emitAlert(tenantId: string | null, alert: any)
    pattern_func_any = r'(\w+\s*:\s*)any(\s*[,)])'
    # Be careful not to replace inside strings or comments
    m4 = re.findall(pattern_func_any, content)
    if m4:
        content = re.sub(pattern_func_any, r'\1unknown\2', content)
        stats["other_any"] += len(m4)

    # ── 8. Add imports
    needs_getErrorMessage = filepath in stats["files_needing_getErrorMessage"]
    needs_QueryParam = filepath in stats["files_needing_QueryParam"]

    if needs_getErrorMessage or needs_QueryParam:
        imports_needed = []
        if needs_getErrorMessage:
            imports_needed.append("getErrorMessage")
        if needs_QueryParam:
            imports_needed.append("QueryParam")

        # Determine relative path to types/common
        rel = os.path.relpath(os.path.join(SRC_DIR, "types", "common"), os.path.dirname(filepath))
        rel = rel.replace("\\", "/")
        if not rel.startswith("."):
            rel = "./" + rel

        import_from = f"from '{rel}'"

        if import_from not in content:
            import_line = f"import {{ {', '.join(imports_needed)} }} {import_from};"
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith('import ') and 'from' in stripped:
                    last_import_idx = i
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, import_line)
            else:
                lines.insert(0, import_line)
            content = '\n'.join(lines)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        stats["files_modified"] += 1
        return True
    return False


def main():
    all_files = []
    for root, dirs, files in os.walk(SRC_DIR):
        # Skip already-processed controllers and type declarations
        rel = os.path.relpath(root, SRC_DIR)
        if any(rel.startswith(s) for s in SKIP_DIRS):
            continue
        for f in files:
            if f.endswith('.ts') and not f.endswith('.d.ts'):
                all_files.append(os.path.join(root, f))

    all_files.sort()
    print(f"Processing {len(all_files)} files (excluding controllers)...")

    modified = []
    for fp in all_files:
        if fix_file(fp):
            modified.append(os.path.relpath(fp, SRC_DIR))

    print(f"\n=== RESULTS ===")
    print(f"Files modified: {stats['files_modified']}")
    print(f"catch (error: any) → unknown: {stats['catch_error_any']}")
    print(f"error.message → getErrorMessage(): {stats['error_message']}")
    print(f"(req as any).user → req.user: {stats['req_as_any_user']}")
    print(f"req.user as any → req.user!: {stats['req_user_as_any']}")
    print(f"params: any[] → QueryParam[]: {stats['params_any']}")
    print(f"callback (x: any) → typed: {stats['callback_any']}")
    print(f"other : any → : unknown: {stats['other_any']}")
    print(f"\nModified files:")
    for f in modified:
        print(f"  ✓ {f}")


if __name__ == "__main__":
    main()
