#!/usr/bin/env python3
"""
Script pour corriger l'indentation de api.ts
Le problème: après leads (ligne 1280), toutes les sections sont imbriquées avec 4 espaces
au lieu de 2 espaces (niveau racine de l'objet api).

Structure actuelle:
- Ligne 1279: // --- LEADS ---
- Ligne 1280: leads: {
- Lignes 1281-1388: méthodes de leads (correctement à 4 espaces)
- Ligne 1389: (vide)
- Lignes 1390-4605: TOUTES les autres sections (mal indentées à 4+ espaces)
- Ligne 4606: }, (ferme leads)
- Ligne 4607: adminFeatures: { (bon niveau)

Correction nécessaire:
1. Fermer leads après ligne 1388 (ou 1389 vide)
2. Réduire indentation de 2 espaces pour lignes 1390-4605
3. Supprimer la ligne 4606 (l'ancienne fermeture de leads)
"""

import re

def analyze_structure():
    """Analyser la structure d'accolades"""
    with open('services/api.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Total lines: {len(lines)}")
    
    # Trouver les sections avec // ---
    for i, line in enumerate(lines, start=1):
        if '// ---' in line:
            indent = len(line) - len(line.lstrip())
            print(f"Line {i}: indent={indent} | {line.strip()}")

def fix_indentation():
    """Corriger l'indentation"""
    with open('services/api.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Original file has {len(lines)} lines")
    
    new_lines = []
    
    for i, line in enumerate(lines, start=1):
        # Lignes 1-1388: garder tel quel
        if i <= 1388:
            new_lines.append(line)
            continue
        
        # Ligne 1389: garder (probablement vide) et ajouter fermeture de leads
        if i == 1389:
            new_lines.append(line)  # La ligne vide
            new_lines.append('  },\n')  # Fermer leads
            print(f"Added leads closing brace after line {i}")
            continue
        
        # Lignes 1390-4605: réduire l'indentation de 2 espaces
        if 1390 <= i <= 4605:
            # Compter les espaces au début
            stripped = line.lstrip(' ')
            current_indent = len(line) - len(stripped)
            
            if current_indent >= 2:
                new_indent = current_indent - 2
                new_lines.append(' ' * new_indent + stripped)
            else:
                new_lines.append(line)
            continue
        
        # Ligne 4606: skip (c'était l'ancienne fermeture de leads)
        if i == 4606:
            stripped = line.strip()
            if stripped == '},':
                print(f"Removed old leads closing at line {i}: {line.strip()}")
                continue  # Skip this line
            else:
                print(f"WARNING: Line 4606 is not '}},': {line.strip()}")
                new_lines.append(line)
            continue
        
        # Lignes après 4606: garder tel quel
        new_lines.append(line)
    
    print(f"New file will have {len(new_lines)} lines")
    
    # Écrire le fichier corrigé
    with open('services/api.ts', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("Fixed! File saved.")

def verify():
    """Vérifier la structure après correction"""
    with open('services/api.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"File has {len(lines)} lines")
    
    # Compter les accolades
    open_count = 0
    close_count = 0
    for line in lines:
        # Ignorer les template strings ${...}
        clean_line = re.sub(r'\$\{[^}]*\}', '', line)
        open_count += clean_line.count('{')
        close_count += clean_line.count('}')
    
    print(f"Open braces: {open_count}")
    print(f"Close braces: {close_count}")
    print(f"Balance: {open_count - close_count}")
    
    # Vérifier les sections
    print("\nSections:")
    for i, line in enumerate(lines, start=1):
        if '// ---' in line:
            indent = len(line) - len(line.lstrip())
            print(f"  Line {i}: indent={indent} | {line.strip()[:60]}")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--analyze':
        analyze_structure()
    elif len(sys.argv) > 1 and sys.argv[1] == '--fix':
        fix_indentation()
    elif len(sys.argv) > 1 and sys.argv[1] == '--verify':
        verify()
    else:
        print("Usage: python fix_api_indentation.py [--analyze|--fix|--verify]")
