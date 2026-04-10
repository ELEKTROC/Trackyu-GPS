UPDATE ticket_macros SET label = 'Intervention planifiée' WHERE display_order = 5;
UPDATE ticket_macros SET label = 'Clôture' WHERE display_order = 6;
UPDATE ticket_macros SET text = 'Ce ticket va être clôturé. N''hésitez pas à nous recontacter si besoin.' WHERE display_order = 6;
UPDATE ticket_macros SET text = 'Une intervention a été planifiée. Notre technicien vous contactera pour confirmer le rendez-vous.' WHERE display_order = 5;
