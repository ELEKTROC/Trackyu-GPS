#!/bin/bash
docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db << 'EOSQL'
-- Fix subcategories encoding issues
UPDATE ticket_subcategories SET name = 'Désinstallation' WHERE name LIKE 'D__sinstallation%' OR name LIKE 'D%sinstallation';
UPDATE ticket_subcategories SET name = 'Réinstallation' WHERE name LIKE 'R__installation%' OR name LIKE 'R%installation';
UPDATE ticket_subcategories SET name = 'Réparation GPS' WHERE name LIKE 'R__paration%' OR name LIKE 'R%paration GPS';
UPDATE ticket_subcategories SET name = 'Alertes non reçues' WHERE name LIKE 'Alertes non re__ues%' OR name LIKE 'Alertes non re%ues';
UPDATE ticket_subcategories SET name = 'Problème d''affichage carte' WHERE name LIKE 'Probl__me d%affichage%' OR name LIKE 'Probl%me d%affichage carte';
UPDATE ticket_subcategories SET name = 'Problème de connexion' WHERE name LIKE 'Probl__me de connexion%' OR name LIKE 'Probl%me de connexion';
UPDATE ticket_subcategories SET name = 'Problème de rapports' WHERE name LIKE 'Probl__me de rapports%' OR name LIKE 'Probl%me de rapports';
UPDATE ticket_subcategories SET name = 'Délai d''intervention' WHERE name LIKE 'D__lai d%intervention%' OR name LIKE 'D%lai d%intervention';
UPDATE ticket_subcategories SET name = 'Qualité de service' WHERE name LIKE 'Qualit__ de service%' OR name LIKE 'Qualit%de service';
UPDATE ticket_subcategories SET name = 'Comportement technicien' WHERE name = 'Comportement technicien';
UPDATE ticket_subcategories SET name = 'Demande de remboursement' WHERE name = 'Demande de remboursement';
UPDATE ticket_subcategories SET name = 'Demande de duplicata' WHERE name = 'Demande de duplicata';
UPDATE ticket_subcategories SET name = 'Demande d''information' WHERE name LIKE 'Demande d%information%';
UPDATE ticket_subcategories SET name = 'Demande de formation' WHERE name = 'Demande de formation';

-- Show results
SELECT id, category_id, name FROM ticket_subcategories ORDER BY category_id, name;
EOSQL
