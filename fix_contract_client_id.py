# -*- coding: utf-8 -*-
"""Fix contractRepository.js: replace c.client_id with c.tier_id (column doesn't exist)"""

path = '/var/www/trackyu-gps/backend/dist/repositories/contractRepository.js'
content = open(path).read()

OLD = "query += ` AND (c.tier_id = $${params.length + 1} OR c.client_id = $${params.length + 1})`;"
NEW = "query += ` AND c.tier_id = $${params.length + 1}`;"

count = content.count(OLD)
if count > 0:
    content = content.replace(OLD, NEW)
    open(path, 'w').write(content)
    print(f'OK: fixed {count} occurrence(s) of c.client_id -> c.tier_id')
else:
    print('NOT FOUND - checking what is there:')
    idx = content.find('client_id')
    while idx >= 0:
        print(f'  pos {idx}:', repr(content[max(0,idx-60):idx+80]))
        idx = content.find('client_id', idx+1)
