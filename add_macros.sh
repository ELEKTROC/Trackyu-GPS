#!/bin/bash
docker exec -i trackyu-gps_postgres_1 psql -U fleet_user -d fleet_db << 'EOSQL'
INSERT INTO ticket_macros (tenant_id, label, text, category, is_active, display_order) VALUES 
(NULL, 'Intervention planifiée', 'Une intervention a été planifiée. Notre technicien vous contactera pour confirmer le rendez-vous.', 'status', true, 5),
(NULL, 'Clôture', 'Ce ticket va être clôturé. N''hésitez pas à nous recontacter si besoin.', 'status', true, 6);
EOSQL
