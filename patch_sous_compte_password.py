"""
patch_sous_compte_password.py
SOUS_COMPTE sans password explicite :
  - Bypasse la validation "mot de passe requis"
  - Utilise 'Trackyu2025!' comme mot de passe temporaire
  - Force require_password_change = true
"""
import sys

CTRL = "/var/www/trackyu-gps/backend/dist/controllers/userController.js"
with open(CTRL, "r", encoding="utf-8") as f:
    ctrl = f.read()

# 1. Remplacer la validation password pour accepter SOUS_COMPTE sans password
OLD_VALIDATION = """\
        if (!sendInvite && (!password || password.length < 6)) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
        }"""
NEW_VALIDATION = """\
        const isSousCompte = normalizeRole(rawRole) === 'SOUS_COMPTE';
        if (!sendInvite && !isSousCompte && (!password || password.length < 6)) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
        }"""

if OLD_VALIDATION not in ctrl:
    print("ERREUR fix1 : validation password introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_VALIDATION, NEW_VALIDATION, 1)
print("OK fix1 : validation password assouplie pour SOUS_COMPTE")

# 2. Modifier la ligne de choix du mot de passe à hasher
OLD_HASH_CHOICE = "        const passwordToHash = sendInvite ? Math.random().toString(36).slice(-12) : password;"
NEW_HASH_CHOICE = """\
        const DEFAULT_SUBUSER_PASSWORD = 'Trackyu2025!';
        const passwordToHash = sendInvite
            ? Math.random().toString(36).slice(-12)
            : (isSousCompte && !password ? DEFAULT_SUBUSER_PASSWORD : password);"""

if OLD_HASH_CHOICE not in ctrl:
    print("ERREUR fix2 : ligne passwordToHash introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_HASH_CHOICE, NEW_HASH_CHOICE, 1)
print("OK fix2 : SOUS_COMPTE sans password → Trackyu2025! par défaut")

# 3. Mettre à jour la condition mustChangePassword pour inclure SOUS_COMPTE sans password
OLD_MUST = "        const mustChangePassword = !!sendInvite || !password;"
NEW_MUST = "        const mustChangePassword = !!sendInvite || (isSousCompte && !password);"

if OLD_MUST not in ctrl:
    print("ERREUR fix3 : mustChangePassword introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_MUST, NEW_MUST, 1)
print("OK fix3 : mustChangePassword = true pour SOUS_COMPTE sans password")

with open(CTRL, "w", encoding="utf-8") as f:
    f.write(ctrl)
print("userController.js OK")
print("\nTous les patches appliqués.")
