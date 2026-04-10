#!/usr/bin/env python3
"""Fix triple-encoded UTF-8 mojibake in ResellerDrawerForm.tsx"""
import os

filepath = os.path.join(os.path.dirname(__file__), 'features', 'admin', 'components', 'forms', 'ResellerDrawerForm.tsx')

# Read the raw bytes
with open(filepath, 'rb') as f:
    raw = f.read()

# The file contains text that was UTF-8 encoded, then misinterpreted as Windows-1252/CP1252,
# then re-encoded as UTF-8, possibly multiple times.
# Strategy: decode as UTF-8 to get the mojibake text, then apply explicit replacements.

text = raw.decode('utf-8', errors='replace')

# Map of corrupted sequences -> correct French characters
# These are the exact byte sequences found in the file
replacements = {
    'Ã\x83Æ\'Ã\x82©': 'é',
    'Ã\x83Æ\'Ã\x82¨': 'è',
    'Ã\x83Æ\'Ã\x82ª': 'ê',
    'Ã\x83Æ\'Ã\x82 ': 'à',
    'Ã\x83Æ\'Ã\x82»': 'û',
    'Ã\x83Æ\'Ã¢â\x82¬Â°': 'É',
    'Ã\x83Â¢Ã¢â\x82¬Å¡Ã\x82¬': '€',
    'Ã\x83â\x80šÃ\x82°': '°',
    'Ã\x83Æ\'Ã\x82®': 'î',
    'Ã\x83Æ\'Ã\x82´': 'ô',
    'Ã\x83Æ\'Ã\x82¹': 'ù',
    'Ã\x83Æ\'Ã\x82¯': 'ï',
    'Ã\x83Æ\'Ã\x82§': 'ç',
    'Ã\x83Æ\'Ã\x82¢': 'â',
}

count = 0
for bad, good in replacements.items():
    occurrences = text.count(bad)
    if occurrences > 0:
        print(f"Replacing '{bad}' -> '{good}' ({occurrences} times)")
        count += occurrences
        text = text.replace(bad, good)

# Also try the HTML-entity-like patterns visible in grep output
# These are the exact strings as they appear in the grep output
text_replacements = {
    'ÃƒÆ\'Ã‚Â©': 'é',
    'ÃƒÆ\'Ã‚Â¨': 'è',
    'ÃƒÆ\'Ã‚Âª': 'ê',
    'ÃƒÆ\'Ã‚Â ': 'à',
    'ÃƒÆ\'Ã‚Â»': 'û',
    'ÃƒÆ\'Ã¢â‚¬Â°': 'É',
    'ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬': '€',
    'Ãƒâ€šÃ‚Â°': '°',
    'ÃƒÆ\'Ã‚Â®': 'î',
    'ÃƒÆ\'Ã‚Â´': 'ô',
    'ÃƒÆ\'Ã‚Â¹': 'ù',
    'ÃƒÆ\'Ã‚Â¯': 'ï',
    'ÃƒÆ\'Ã‚Â§': 'ç',
    'ÃƒÆ\'Ã‚Â¢': 'â',
}

for bad, good in text_replacements.items():
    occurrences = text.count(bad)
    if occurrences > 0:
        print(f"Replacing text '{bad}' -> '{good}' ({occurrences} times)")
        count += occurrences
        text = text.replace(bad, good)

print(f"\nTotal replacements: {count}")

# Check for any remaining suspicious patterns
import re
remaining = re.findall(r'Ã[ƒ‚¢â€š°Æ\']+', text)
if remaining:
    unique = set(remaining)
    print(f"\nWARNING: {len(remaining)} remaining suspicious patterns:")
    for p in sorted(unique):
        print(f"  '{p}' ({remaining.count(p)}/{text.count(p)} times)")
else:
    print("\nNo remaining suspicious patterns found!")

# Write back as UTF-8 without BOM
with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print(f"\nFile written: {filepath}")
