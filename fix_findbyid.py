#!/usr/bin/env python3
# -*- coding: utf-8 -*-
path = '/app/dist/repositories/objectRepository.js'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

old = (
    'let query = `\n'
    '      SELECT o.*, \n'
    '             t.name as client_name,\n'
    '             g.name as group_name\n'
    '      FROM objects o\n'
    "      LEFT JOIN tiers t ON o.client_id = t.id AND t.type = 'CLIENT'\n"
    '      LEFT JOIN groups g ON o.group_id = g.id\n'
    '      WHERE o.id = $1\n'
    '    `;'
)

new = (
    'let query = `\n'
    '      SELECT o.*, \n'
    '             t.name as client_name,\n'
    '             g.name as group_name,\n'
    '             lp.latitude as location_lat,\n'
    '             lp.longitude as location_lng,\n'
    '             lp.time as last_updated,\n'
    '             COALESCE(o.address, lp.address) as address\n'
    '      FROM objects o\n'
    "      LEFT JOIN tiers t ON o.client_id = t.id AND t.type = 'CLIENT'\n"
    '      LEFT JOIN groups g ON o.group_id = g.id\n'
    '      LEFT JOIN LATERAL (\n'
    '        SELECT latitude, longitude, time, address\n'
    '        FROM positions\n'
    '        WHERE object_id = o.id\n'
    '        ORDER BY time DESC\n'
    '        LIMIT 1\n'
    '      ) lp ON true\n'
    '      WHERE o.id = $1\n'
    '    `;'
)

if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: findByIdWithJoins patched')
else:
    print('SKIP: pattern not found')
    # Debug: show surrounding area
    idx = content.find('findByIdWithJoins')
    if idx >= 0:
        print('--- context ---')
        print(repr(content[idx:idx+500]))
