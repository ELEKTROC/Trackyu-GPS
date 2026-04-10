"""
Phase 2: Fix remaining any patterns in backend controllers.
"""
import os
import re
import sys

CONTROLLERS_DIR = os.path.join("backend", "src", "controllers")
stats = {"replaced": 0, "files": set()}

def fix_file(filepath: str) -> bool:
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()
    content = original

    # 1. ALL remaining `const params: any[]` or `let params: any[]` (with any initializer)
    pattern = r'((?:const|let)\s+\w*[Pp]arams\s*:\s*)any\[\]'
    m = re.findall(pattern, content)
    if m:
        content = re.sub(pattern, r'\1QueryParam[]', content)
        stats["replaced"] += len(m)
        stats["files"].add(filepath)

    # 2. `const values: any[]` / `const validRecords: any[]` / `preview: any[]`
    pattern2 = r'((?:const|let)\s+\w+\s*:\s*)any\[\]'
    m2 = re.findall(pattern2, content)
    if m2:
        content = re.sub(pattern2, r'\1QueryParam[]', content)
        stats["replaced"] += len(m2)
        stats["files"].add(filepath)
    
    # Also standalone type annotations like `preview: any[];`
    pattern2b = r'(\w+:\s*)any\[\]'
    m2b = re.findall(pattern2b, content)
    if m2b:
        # Exclude already-replaced QueryParam[]
        if 'QueryParam[]' not in content or re.search(r'(?<!Query)(?:Param\[\])', content):
            content = re.sub(r'(\w+:\s*)any\[\]', r'\1QueryParam[]', content)
            stats["replaced"] += len(m2b)
            stats["files"].add(filepath)

    # 3. `(r: any)` in callbacks → `(r: Record<string, any>)` 
    # These are typically .map/.filter callbacks on DB rows
    pattern3 = r'\(([a-z])\s*:\s*any\)'
    m3 = re.findall(pattern3, content)
    if m3:
        content = re.sub(pattern3, r'(\1: Record<string, unknown>)', content)
        stats["replaced"] += len(m3)
        stats["files"].add(filepath)

    # 4. `(record: any, index: number)` → `(record: Record<string, unknown>, index: number)`
    pattern4 = r'\(record\s*:\s*any\s*,'
    if re.search(pattern4, content):
        content = re.sub(pattern4, '(record: Record<string, unknown>,', content)
        stats["replaced"] += 1
        stats["files"].add(filepath)

    # 5. `records: any[]` in function params → `records: Record<string, unknown>[]`
    pattern5 = r'(records\s*:\s*)any\[\]'
    m5 = re.findall(pattern5, content)
    if m5:
        content = re.sub(pattern5, r'\1Record<string, unknown>[]', content)
        stats["replaced"] += len(m5)
        stats["files"].add(filepath)

    # 6. `const metadata: any = {}` → `const metadata: Record<string, unknown> = {}`
    pattern6 = r'(const\s+\w+\s*:\s*)any(\s*=\s*\{)'
    m6 = re.findall(pattern6, content)
    if m6:
        content = re.sub(pattern6, r'\1Record<string, unknown>\2', content)
        stats["replaced"] += len(m6)
        stats["files"].add(filepath)

    # 7. `const body: any = {` → `const body: Record<string, unknown> = {`
    pattern7 = r'(const\s+body\s*:\s*)any(\s*=\s*\{)'
    if re.search(pattern7, content):
        content = re.sub(pattern7, r'\1Record<string, unknown>\2', content)
        stats["replaced"] += 1
        stats["files"].add(filepath)

    # 8. `value: any` in function params → `value: unknown`
    pattern8 = r'(value\s*:\s*)any(\s*[,)])'
    m8 = re.findall(pattern8, content)
    if m8:
        content = re.sub(pattern8, r'\1unknown\2', content)
        stats["replaced"] += len(m8)
        stats["files"].add(filepath)

    # 9. `val: any` in function params or arrows → `val: unknown`
    pattern9 = r'\(val\s*:\s*any\)'
    if re.search(pattern9, content):
        content = re.sub(pattern9, '(val: unknown)', content)
        stats["replaced"] += 1
        stats["files"].add(filepath)

    # 10. `currentTrip: any` → more specific if possible, else `Record<string, unknown>`
    pattern10 = r'(let\s+currentTrip\s*:\s*)any'
    if re.search(pattern10, content):
        content = re.sub(pattern10, r'\1Record<string, unknown> | null', content)
        stats["replaced"] += 1
        stats["files"].add(filepath)

    # 11. `catch (fetchError: any)` / `catch (dbError: any)` → unknown
    pattern11 = r'catch\s*\((\w+)\s*:\s*any\)'
    m11 = re.findall(pattern11, content)
    if m11:
        content = re.sub(pattern11, r'catch (\1: unknown)', content)
        stats["replaced"] += len(m11)
        stats["files"].add(filepath)

    # 12. `(req: any, res: any)` → `(req: Request, res: Response)`
    pattern12 = r'\(req\s*:\s*any\s*,\s*res\s*:\s*any\)'
    if re.search(pattern12, content):
        content = re.sub(pattern12, '(req: Request, res: Response)', content)
        stats["replaced"] += 1
        stats["files"].add(filepath)

    # 13. `notification: any,` / `client: any,` in function params
    pattern13 = r'(notification|client)\s*:\s*any\s*,'
    m13 = re.findall(pattern13, content)
    if m13:
        content = re.sub(pattern13, r'\1: Record<string, unknown>,', content)
        stats["replaced"] += len(m13)
        stats["files"].add(filepath)

    # 14. `info?: any` → `info?: unknown`
    pattern14 = r'(info\?\s*:\s*)any'
    m14 = re.findall(pattern14, content)
    if m14:
        content = re.sub(pattern14, r'\1unknown', content)
        stats["replaced"] += len(m14)
        stats["files"].add(filepath)

    # 15. `(item: any)` in template literals → `(item: Record<string, unknown>)`
    pattern15 = r'\(item\s*:\s*any\)'
    if re.search(pattern15, content):
        content = re.sub(pattern15, '(item: Record<string, unknown>)', content)
        stats["replaced"] += 1
        stats["files"].add(filepath)

    # 16. `(err: any)` in Zod forEach → `(err: { path: string[]; message: string })`
    # This is specific enough to handle separately if needed

    # Ensure QueryParam import exists if we used it
    if 'QueryParam[]' in content and "from '../types/common'" not in content:
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('import ') and 'from' in stripped:
                last_import_idx = i
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, "import { QueryParam } from '../types/common';")
        content = '\n'.join(lines)
    
    # If file already has import from types/common, check if QueryParam is needed
    if 'QueryParam[]' in content and "from '../types/common'" in content and 'QueryParam' not in content.split("from '../types/common'")[0].split('\n')[-1]:
        # Need to add QueryParam to existing import
        content = re.sub(
            r"import\s*\{\s*([^}]*)\s*\}\s*from\s*'\.\.\/types\/common'",
            lambda m: f"import {{ {m.group(1).strip()}, QueryParam }} from '../types/common'" 
                if 'QueryParam' not in m.group(1) else m.group(0),
            content
        )

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    files = sorted([
        os.path.join(CONTROLLERS_DIR, f)
        for f in os.listdir(CONTROLLERS_DIR)
        if f.endswith(".ts")
    ])
    
    print(f"Phase 2: Processing {len(files)} files...")
    modified = []
    for fp in files:
        if fix_file(fp):
            modified.append(os.path.basename(fp))
    
    print(f"\nReplaced: {stats['replaced']} patterns in {len(modified)} files")
    for f in modified:
        print(f"  ✓ {f}")


if __name__ == "__main__":
    main()
