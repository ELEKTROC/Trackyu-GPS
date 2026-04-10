# -*- coding: utf-8 -*-
"""Fix portalRoutes.js: remove deleted_at references from invoices queries"""

path = '/var/www/trackyu-gps/backend/dist/routes/portalRoutes.js'
content = open(path).read()

# Remove all AND i.deleted_at IS NULL and AND deleted_at IS NULL patterns
import re

before = content.count('deleted_at')
content = re.sub(r'\s+AND i\.deleted_at IS NULL', '', content)
content = re.sub(r'\s+AND deleted_at IS NULL', '', content)
after = content.count('deleted_at')

removed = before - after
if removed > 0:
    open(path, 'w').write(content)
    print(f'OK: removed {removed} deleted_at condition(s)')
else:
    print('WARNING: nothing removed - check manually')
    idx = content.find('deleted_at')
    if idx >= 0:
        print(repr(content[max(0,idx-80):idx+80]))
