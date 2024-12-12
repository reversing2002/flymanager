-- Modifier la contrainte de type pour inclure les nouveaux types
ALTER TABLE custom_member_field_definitions 
    DROP CONSTRAINT custom_member_field_definitions_type_check;

ALTER TABLE custom_member_field_definitions 
    ADD CONSTRAINT custom_member_field_definitions_type_check 
    CHECK (type IN ('text', 'number', 'boolean', 'date', 'select', 'email', 'tel', 'url', 'time', 'file', 'multiselect', 'textarea', 'color', 'range'));

-- Ajouter les nouvelles colonnes
ALTER TABLE custom_member_field_definitions
    ADD COLUMN min_value numeric,
    ADD COLUMN max_value numeric,
    ADD COLUMN step numeric,
    ADD COLUMN accepted_file_types text[];
