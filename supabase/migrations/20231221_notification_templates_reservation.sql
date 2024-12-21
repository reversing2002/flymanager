-- Templates pour les notifications de réservation
INSERT INTO notification_templates (
    name,
    subject,
    template_id,
    description,
    variables,
    notification_type,
    club_id
)
SELECT 
    'Confirmation de réservation',
    'Confirmation de votre réservation',
    4242424, -- ID du template Mailjet pour la confirmation pilote
    'Email envoyé au pilote lors de la création d''une réservation',
    ARRAY[
        'PILOT_NAME',
        'AIRCRAFT',
        'START_TIME',
        'END_TIME',
        'FLIGHT_TYPE',
        'INSTRUCTOR_NAME'
    ],
    'reservation_confirmation',
    id
FROM clubs
ON CONFLICT (club_id, notification_type) 
DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP,
    variables = EXCLUDED.variables;

INSERT INTO notification_templates (
    name,
    subject,
    template_id,
    description,
    variables,
    notification_type,
    club_id
)
SELECT 
    'Confirmation de réservation (Instructeur)',
    'Nouvelle réservation avec vous comme instructeur',
    4242425, -- Template spécifique pour la confirmation instructeur
    'Email envoyé à l''instructeur lors de la création d''une réservation avec instructeur',
    ARRAY[
        'INSTRUCTOR_NAME',
        'PILOT_NAME',
        'AIRCRAFT',
        'START_TIME',
        'END_TIME',
        'FLIGHT_TYPE'
    ],
    'reservation_confirmation_instructor',
    id
FROM clubs
ON CONFLICT (club_id, notification_type) 
DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP,
    variables = EXCLUDED.variables;

INSERT INTO notification_templates (
    name,
    subject,
    template_id,
    description,
    variables,
    notification_type,
    club_id
)
SELECT 
    'Rappel de réservation',
    'Rappel : Vol prévu dans 1 heure',
    4242426, -- ID du template Mailjet pour le rappel pilote
    'Email de rappel envoyé au pilote 1 heure avant le début du vol',
    ARRAY[
        'PILOT_NAME',
        'AIRCRAFT',
        'START_TIME',
        'END_TIME',
        'FLIGHT_TYPE',
        'INSTRUCTOR_NAME'
    ],
    'reservation_reminder',
    id
FROM clubs
ON CONFLICT (club_id, notification_type) 
DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP,
    variables = EXCLUDED.variables;

INSERT INTO notification_templates (
    name,
    subject,
    template_id,
    description,
    variables,
    notification_type,
    club_id
)
SELECT 
    'Rappel de réservation (Instructeur)',
    'Rappel : Vol avec élève prévu dans 1 heure',
    4242427, -- Template spécifique pour le rappel instructeur
    'Email de rappel envoyé à l''instructeur 1 heure avant le début du vol',
    ARRAY[
        'INSTRUCTOR_NAME',
        'PILOT_NAME',
        'AIRCRAFT',
        'START_TIME',
        'END_TIME',
        'FLIGHT_TYPE'
    ],
    'reservation_reminder_instructor',
    id
FROM clubs
ON CONFLICT (club_id, notification_type) 
DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP,
    variables = EXCLUDED.variables;
