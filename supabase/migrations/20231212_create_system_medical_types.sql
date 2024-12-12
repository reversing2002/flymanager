-- Insérer les types de certificats médicaux système s'ils n'existent pas déjà
INSERT INTO medical_types (
  name,
  description,
  display_order,
  system_type,
  validity_period,
  requires_end_date
)
SELECT 
  'Classe 1',
  'Certificat médical de classe 1 - Requis pour les pilotes professionnels',
  0,
  true,
  12,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM medical_types WHERE name = 'Classe 1' AND system_type = true
);

INSERT INTO medical_types (
  name,
  description,
  display_order,
  system_type,
  validity_period,
  requires_end_date
)
SELECT 
  'Classe 2',
  'Certificat médical de classe 2 - Requis pour les pilotes privés',
  1,
  true,
  24,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM medical_types WHERE name = 'Classe 2' AND system_type = true
);
