#!/usr/bin/env python3
"""Fix triple-encoded UTF-8 mojibake in ResellerDrawerForm.tsx - byte level"""
import os, re

filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
    'features', 'admin', 'components', 'forms', 'ResellerDrawerForm.tsx')

with open(filepath, 'rb') as f:
    data = f.read()

print(f"File size: {len(data)} bytes")

# The corruption pattern: UTF-8 chars were triple-encoded through CP1252 misinterpretation
# Strategy: find the exact byte sequences for each French accented char and replace

# Build replacement map by triple-encoding each target character
target_chars = 'éèêàûùôîïâçÉÈÊÀÛÙÔÎÏÂÇ°'
replacements = {}

for char in target_chars:
    # Original UTF-8 bytes
    original = char.encode('utf-8')
    # Triple-encode: utf-8 bytes → misread as cp1252 → re-encoded as utf-8 → misread as cp1252 → re-encoded as utf-8
    try:
        # Round 1: UTF-8 bytes interpreted as CP1252, then re-encoded as UTF-8
        r1 = original.decode('utf-8').encode('cp1252')  # This just gives original bytes back
        # Actually the corruption works differently. Let me simulate:
        # The bytes C3 A9 (é in UTF-8) are read as if they were CP1252:
        #   C3 = Ã, A9 = © → string "Ã©"
        # Then "Ã©" is encoded as UTF-8: Ã→C3 83, ©→C2 A9 → bytes C3 83 C2 A9
        # Then THOSE bytes are read as CP1252 again:
        #   C3=Ã, 83=ƒ, C2=Â, A9=© → string "Ãƒ©"
        # Then "Ãƒ©" encoded as UTF-8: Ã→C3 83, ƒ→C6 92, Â→C3 82, ©→C2 A9... wait that doesn't match
        
        # Let me try the forward direction: encode properly
        step1 = original  # e.g., b'\xc3\xa9' for é
        step2 = step1.decode('cp1252').encode('utf-8')  # Misread bytes as cp1252, write as utf-8
        step3 = step2.decode('cp1252').encode('utf-8')  # Do it again
        step4 = step3.decode('cp1252').encode('utf-8')  # And again (triple)
        
        replacements[step4] = original
        print(f"  {char}: {step4.hex(' ')} ({len(step4)} bytes) -> {original.hex(' ')}")
    except Exception as e:
        print(f"  {char}: Error - {e}")

# Also handle the € sign which was already fixed, and ° 
# Try to build € triple encoding
for char in ['€']:
    try:
        original = char.encode('utf-8')
        step2 = original.decode('cp1252').encode('utf-8')
        step3 = step2.decode('cp1252').encode('utf-8')
        step4 = step3.decode('cp1252').encode('utf-8')
        replacements[step4] = original
        print(f"  {char}: {step4.hex(' ')} ({len(step4)} bytes) -> {original.hex(' ')}")
    except Exception as e:
        # € in UTF-8 is E2 82 AC. In CP1252, E2=â, 82=‚, AC=¬
        # So "â‚¬" in UTF-8: â=C3 A2, ‚=E2 80 9A, ¬=C2 AC → C3 A2 E2 80 9A C2 AC
        # Double: C3=Ã A2=¢ E2=â 80=€ 9A=š C2=Â AC=¬
        # ... this gets complex, let me try double encoding
        print(f"  {char}: Triple failed ({e}), trying double...")
        try:
            step2 = original.decode('cp1252').encode('utf-8')
            step3 = step2.decode('cp1252').encode('utf-8')
            replacements[step3] = original
            print(f"  {char}: DOUBLE {step3.hex(' ')} ({len(step3)} bytes)")
        except Exception as e2:
            print(f"  {char}: Double also failed ({e2})")

print(f"\nApplying {len(replacements)} replacements...")

# Sort by length descending to avoid partial matches
sorted_reps = sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True)

total = 0
for bad_bytes, good_bytes in sorted_reps:
    count = data.count(bad_bytes)
    if count > 0:
        char = good_bytes.decode('utf-8')
        print(f"  Replacing {char} ({count} occurrences)")
        data = data.replace(bad_bytes, good_bytes)
        total += count

print(f"\nTotal replacements: {total}")

# Verify - check for remaining mojibake patterns
# Look for the characteristic c3 83 c6 92 pattern (triple-encoded start)
remaining = 0
idx = 0
while True:
    idx = data.find(b'\xc3\x83\xc6\x92', idx)
    if idx == -1:
        break
    remaining += 1
    context = data[max(0,idx-10):idx+20]
    print(f"  Remaining at offset {idx}: {context.hex(' ')}")
    idx += 1

if remaining == 0:
    # Also check for double-encoded patterns (c3 83 c2)
    idx = 0
    while True:
        idx = data.find(b'\xc3\x83\xc2', idx)
        if idx == -1:
            break
        remaining += 1
        context = data[max(0,idx-5):idx+15]
        print(f"  Double-enc remaining at offset {idx}: {context}")
        idx += 1

if remaining == 0:
    print("No remaining mojibake patterns found!")
else:
    print(f"\nWARNING: {remaining} remaining patterns!")

with open(filepath, 'wb') as f:
    f.write(data)

print(f"\nFile written: {len(data)} bytes")
