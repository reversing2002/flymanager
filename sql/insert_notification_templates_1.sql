-- Template pour la modification de réservation (pilote)
INSERT INTO notification_templates (id, name, subject, description, variables, notification_type, club_id, created_at, updated_at, html_content)
VALUES (
    25, 
    'Modification de réservation', 
    'Modification de votre réservation', 
    'Email envoyé au pilote lors de la modification d''une réservation',
    '{"PILOT_NAME","AIRCRAFT","START_TIME","END_TIME","FLIGHT_TYPE","INSTRUCTOR_NAME","CHANGES"}',
    'reservation_modification',
    'adfe5d7d-1225-4dd4-9693-de78939d2eaf',
    NOW(),
    NOW(),
    E'<!DOCTYPE html>\n<html lang="fr">\n<head>\n    <meta charset="utf-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>4fly - Modification de réservation</title>\n</head>\n<body style="margin: 0; padding: 0; background-color: #f4f4f8; font-family: Arial, sans-serif;">\n    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f8;">\n        <tr>\n            <td align="center" style="padding: 40px 0;">\n                <!-- Container principal -->\n                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #24272E; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n                    <!-- Header -->\n                    <tr>\n                        <td align="center" style="padding: 40px 20px; background-image: linear-gradient(to bottom, #2c3039, #24272E);">\n                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                <tr>\n                                    <td align="center" style="padding-bottom: 20px;">\n                                        <span style="font-size: 32px; color: #FFFFFF; font-weight: bold;">4<span style="color: #4F77FF;">fly</span></span>\n                                    </td>\n                                </tr>\n                                <tr>\n                                    <td align="center" style="color: #9CA3AF; font-size: 16px; padding-bottom: 20px;">\n                                        Pilotez facilement votre aéroclub\n                                    </td>\n                                </tr>\n                                <tr>\n                                    <td align="center" style="color: #E5E7EB; font-size: 24px; font-weight: 600;">\n                                        Modification de réservation\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n\n                    <!-- Decorative element -->\n                    <tr>\n                        <td style="padding: 0 20px;">\n                            <div style="height: 2px; background-image: linear-gradient(to right, #24272E, #f59e0b, #24272E);"></div>\n                        </td>\n                    </tr>\n\n                    <!-- Content -->\n                    <tr>\n                        <td style="padding: 30px 20px;">\n                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                <tr>\n                                    <td style="color: #E5E7EB; padding-bottom: 20px; font-size: 16px; line-height: 1.5;">\n                                        Bonjour {PILOT_NAME},\n                                    </td>\n                                </tr>\n\n                                <!-- Update Message -->\n                                <tr>\n                                    <td style="padding: 20px; background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; margin-bottom: 20px;">\n                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                            <tr>\n                                                <td style="color: #E5E7EB;">\n                                                    <img src="https://img.icons8.com/ios-filled/50/f59e0b/edit.png" alt="Update" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">\n                                                    <span style="color: #f59e0b; font-weight: 600;">Réservation modifiée</span>\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n\n                                <!-- Flight Details -->\n                                <tr>\n                                    <td style="padding: 25px; background-color: #1A1D24; border-radius: 8px; margin: 20px 0;">\n                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                            <tr>\n                                                <td style="color: #9CA3AF; padding: 12px 0; border-bottom: 1px solid #2D3139;">\n                                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                                        <tr>\n                                                            <td style="color: #9CA3AF;">\n                                                                <img src="https://img.icons8.com/ios-filled/50/9CA3AF/airplane-mode-on.png" alt="Aircraft" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">\n                                                                Appareil\n                                                            </td>\n                                                            <td align="right" style="color: #E5E7EB; font-weight: 600;">{AIRCRAFT}</td>\n                                                        </tr>\n                                                    </table>\n                                                </td>\n                                            </tr>\n                                            <tr>\n                                                <td style="color: #9CA3AF; padding: 12px 0; border-bottom: 1px solid #2D3139;">\n                                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                                        <tr>\n                                                            <td style="color: #9CA3AF;">\n                                                                <img src="https://img.icons8.com/ios-filled/50/9CA3AF/type.png" alt="Type" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">\n                                                                Type de vol\n                                                            </td>\n                                                            <td align="right" style="color: #E5E7EB; font-weight: 600;">{FLIGHT_TYPE}</td>\n                                                        </tr>\n                                                    </table>\n                                                </td>\n                                            </tr>\n                                            <tr>\n                                                <td style="color: #9CA3AF; padding: 12px 0; border-bottom: 1px solid #2D3139;">\n                                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                                        <tr>\n                                                            <td style="color: #9CA3AF;">\n                                                                <img src="https://img.icons8.com/ios-filled/50/9CA3AF/calendar--v1.png" alt="Start" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">\n                                                                Début\n                                                            </td>\n                                                            <td align="right" style="color: #E5E7EB; font-weight: 600;">{START_TIME}</td>\n                                                        </tr>\n                                                    </table>\n                                                </td>\n                                            </tr>\n                                            <tr>\n                                                <td style="color: #9CA3AF; padding: 12px 0; {INSTRUCTOR_NAME ? ''border-bottom: 1px solid #2D3139;'' : ''''}">\n                                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                                        <tr>\n                                                            <td style="color: #9CA3AF;">\n                                                                <img src="https://img.icons8.com/ios-filled/50/9CA3AF/calendar--v1.png" alt="End" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">\n                                                                Fin\n                                                            </td>\n                                                            <td align="right" style="color: #E5E7EB; font-weight: 600;">{END_TIME}</td>\n                                                        </tr>\n                                                    </table>\n                                                </td>\n                                            </tr>\n                                            {INSTRUCTOR_NAME ? \n                                            <tr>\n                                                <td style="color: #9CA3AF; padding: 12px 0;">\n                                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                                        <tr>\n                                                            <td style="color: #9CA3AF;">\n                                                                <img src="https://img.icons8.com/ios-filled/50/9CA3AF/user.png" alt="Instructor" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">\n                                                                Instructeur\n                                                            </td>\n                                                            <td align="right" style="color: #E5E7EB; font-weight: 600;">{INSTRUCTOR_NAME}</td>\n                                                        </tr>\n                                                    </table>\n                                                </td>\n                                            </tr>\n                                             : ''''}\n                                        </table>\n                                    </td>\n                                </tr>\n\n                                <!-- Changes -->\n                                <tr>\n                                    <td style="padding: 25px; background-color: #1A1D24; border-radius: 8px; margin: 20px 0;">\n                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                            <tr>\n                                                <td style="color: #f59e0b; padding-bottom: 15px; font-weight: 600;">\n                                                    Modifications apportées :\n                                                </td>\n                                            </tr>\n                                            <tr>\n                                                <td style="color: #E5E7EB; font-family: monospace; white-space: pre-wrap;">\n{CHANGES}\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n\n                                <!-- Button -->\n                                <tr>\n                                    <td align="center" style="padding-top: 30px;">\n                                        <table role="presentation" cellpadding="0" cellspacing="0">\n                                            <tr>\n                                                <td style="border-radius: 8px; background-color: #4F77FF; box-shadow: 0 4px 6px rgba(79, 119, 255, 0.25);">\n                                                    <a href="https://app.4fly.io/reservations" \n                                                       style="color: #ffffff; display: inline-block; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 16px;">\n                                                        Voir mes réservations\n                                                    </a>\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n\n                    <!-- Footer -->\n                    <tr>\n                        <td style="background-color: #1A1D24;">\n                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                                <tr>\n                                    <td align="center" style="color: #9CA3AF; font-size: 14px; padding: 20px 0 10px;">\n                                        &copy; 2024 4Fly.io - Tous droits réservés\n                                    </td>\n                                </tr>\n                                <tr>\n                                    <td align="center" style="color: #9CA3AF; font-size: 12px; padding-bottom: 30px;">\n                                        Ceci est un message automatique. Pour toute question, contactez le secrétariat de votre club.\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n                </table>\n\n                <!-- Spacing under the main container -->\n                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">\n                    <tr>\n                        <td style="height: 40px;"></td>\n                    </tr>\n                </table>\n            </td>\n        </tr>\n    </table>\n</body>\n</html>'
);

INSERT INTO "public"."notification_templates" ("id", "name", "subject", "description", "variables", "notification_type", "club_id", "created_at", "updated_at", "html_content")
VALUES ('26', 'Réponse message de contact', 'RE: {subject}', 'Template pour répondre aux messages de contact', '{"name","email","subject","message","response"}', 'CONTACT_RESPONSE', 'adfe5d7d-1225-4dd4-9693-de78939d2eaf', '2024-01-08 10:00:00.000000+00', '2024-01-08 10:00:00.000000+00', '<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>4fly - Réponse à votre message</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f8; font-family: Arial, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f8;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <!-- Container principal -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #24272E; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 20px; background-image: linear-gradient(to bottom, #2c3039, #24272E);">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <span style="font-size: 32px; color: #FFFFFF; font-weight: bold;">4<span style="color: #4F77FF;">fly</span></span>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="color: #9CA3AF; font-size: 16px; padding-bottom: 20px;">
                                        Pilotez facilement votre aéroclub
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="color: #E5E7EB; font-size: 24px; font-weight: 600;">
                                        Réponse à votre message
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Decorative element -->
                    <tr>
                        <td style="padding: 0 20px;">
                            <div style="height: 2px; background-image: linear-gradient(to right, #24272E, #4F77FF, #24272E);"></div>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="color: #E5E7EB; padding-bottom: 20px; font-size: 16px; line-height: 1.5;">
                                        Bonjour {name},
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: #E5E7EB; padding-bottom: 30px; font-size: 16px; line-height: 1.5;">
                                        Nous avons bien reçu votre message concernant "{subject}" et nous vous en remercions.
                                    </td>
                                </tr>

                                <!-- Original Message -->
                                <tr>
                                    <td style="padding: 25px; background-color: #1A1D24; border-radius: 8px; margin: 20px 0;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="color: #9CA3AF; padding-bottom: 15px;">
                                                    <strong style="color: #E5E7EB;">Votre message :</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9CA3AF; padding-bottom: 15px; font-style: italic;">
                                                    {message}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Response -->
                                <tr>
                                    <td style="color: #E5E7EB; padding: 30px 0; font-size: 16px; line-height: 1.5;">
                                        <strong>Notre réponse :</strong>
                                        <br><br>
                                        {response}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="color: #9CA3AF; padding-top: 30px; font-size: 14px; line-height: 1.5;">
                                        Si vous avez d''autres questions, n''hésitez pas à nous recontacter.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1A1D24;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="color: #9CA3AF; font-size: 14px; padding: 20px 0 10px;">
                                        &copy; 2024 4Fly.io - Tous droits réservés
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="color: #9CA3AF; font-size: 12px; padding-bottom: 30px;">
                                        Cet email est une réponse automatique à votre message. Merci de ne pas y répondre directement.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>');
