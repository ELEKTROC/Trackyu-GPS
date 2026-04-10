"""
Patch GoogleMapsService.js — filtrer les Plus Codes, retourner une adresse lisible

Problème : results[0].formatted_address peut être un Plus Code Google
(ex: "CWGH+HHQ, Abidjan, Côte d'Ivoire") quand la zone n'est pas cartographiée
au niveau des rues — très fréquent en Afrique de l'Ouest.

Correction :
1. Parcourir results et chercher un résultat non-Plus-Code
   (types: street_address, route, neighborhood, sublocality, locality)
2. Si aucun résultat lisible : construire "quartier, ville" depuis les
   address_components du résultat le plus précis disponible
3. Fallback final : formatted_address du premier résultat (comportement actuel)
"""
import sys

FILE = '/var/www/trackyu-gps/backend/dist/services/GoogleMapsService.js'

with open(FILE, 'r', encoding='utf-8') as f:
    src = f.read()

OLD = """                if (response.data && response.data.results && response.data.results.length > 0) {
                    return response.data.results[0].formatted_address;
                }"""

NEW = """                if (response.data && response.data.results && response.data.results.length > 0) {
                    const results = response.data.results;
                    // Plus Code pattern: "XXXX+XX" or "XXXX+XXX"
                    const PLUS_CODE_RE = /^[A-Z0-9]{4,6}\\+[A-Z0-9]{2,3}/;
                    // Types considered human-readable (ordered by preference)
                    const PREFERRED_TYPES = [
                        'street_address', 'premise', 'route',
                        'neighborhood', 'sublocality_level_1', 'sublocality',
                        'locality', 'administrative_area_level_2',
                    ];
                    // 1. Try to find a result whose formatted_address is not a Plus Code
                    //    and whose types match a preferred type
                    for (const preferred of PREFERRED_TYPES) {
                        const match = results.find(r =>
                            !PLUS_CODE_RE.test(r.formatted_address) &&
                            Array.isArray(r.types) && r.types.includes(preferred)
                        );
                        if (match) return match.formatted_address;
                    }
                    // 2. Any result that is not a Plus Code
                    const readable = results.find(r => !PLUS_CODE_RE.test(r.formatted_address));
                    if (readable) return readable.formatted_address;
                    // 3. Build a human-readable label from address_components of results[0]
                    const comps = results[0].address_components || [];
                    const get = (type) => { const c = comps.find(x => x.types.includes(type)); return c ? c.long_name : null; };
                    const parts = [
                        get('neighborhood') || get('sublocality_level_1') || get('sublocality'),
                        get('locality') || get('administrative_area_level_2'),
                        get('country'),
                    ].filter(Boolean);
                    if (parts.length >= 2) return parts.join(', ');
                    // 4. Final fallback: return as-is (Plus Code)
                    return results[0].formatted_address;
                }"""

if OLD not in src:
    print('ERREUR : bloc reverseGeocode introuvable dans GoogleMapsService.js')
    sys.exit(1)

src = src.replace(OLD, NEW, 1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(src)

print('OK — GoogleMapsService.js patché (filtre Plus Codes, adresse lisible)')
