-- Fonction pour créer les écritures comptables d'une facture fournisseur
create or replace function create_supplier_invoice_entries(
  p_reference text,
  p_supplier_id uuid,
  p_invoice_date timestamp with time zone,
  p_description text,
  p_file_path text,
  p_lines jsonb[]
) returns void as $$
declare
  v_entry_id uuid;
  v_line jsonb;
  v_total_ttc numeric;
begin
  -- Calculer le total TTC
  select sum((line->>'amount_ttc')::numeric)
  into v_total_ttc
  from unnest(p_lines) as line;

  -- Créer l'écriture principale
  insert into account_entries (
    reference,
    description,
    entry_date,
    attachment_path,
    created_by
  ) values (
    p_reference,
    p_description,
    p_invoice_date,
    p_file_path,
    auth.uid()
  ) returning id into v_entry_id;

  -- Créer les lignes de débit (comptes de charges)
  for v_line in select * from unnest(p_lines)
  loop
    insert into account_entry_lines (
      entry_id,
      account_id,
      description,
      debit,
      credit,
      vat_rate,
      vat_amount
    ) values (
      v_entry_id,
      (v_line->>'expense_account_id')::uuid,
      v_line->>'description',
      (v_line->>'amount_ht')::numeric,
      0,
      (v_line->>'vat_rate')::numeric,
      (v_line->>'amount_vat')::numeric
    );

    -- Si TVA, créer la ligne de TVA déductible
    if (v_line->>'vat_rate')::numeric > 0 then
      insert into account_entry_lines (
        entry_id,
        account_id,
        description,
        debit,
        credit,
        vat_rate,
        vat_amount
      ) values (
        v_entry_id,
        (select id from accounts where code = '44566'), -- Compte de TVA déductible
        'TVA déductible sur ' || p_reference,
        (v_line->>'amount_vat')::numeric,
        0,
        (v_line->>'vat_rate')::numeric,
        (v_line->>'amount_vat')::numeric
      );
    end if;
  end loop;

  -- Créer la ligne de crédit (fournisseur)
  insert into account_entry_lines (
    entry_id,
    account_id,
    description,
    debit,
    credit
  ) values (
    v_entry_id,
    p_supplier_id,
    'Facture ' || p_reference,
    0,
    v_total_ttc
  );
end;
$$ language plpgsql security definer;
