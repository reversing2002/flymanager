-- Remove accepts_external_payments and can_group_sales columns from accounts table
ALTER TABLE public.accounts
    DROP COLUMN IF EXISTS accepts_external_payments,
    DROP COLUMN IF EXISTS can_group_sales;
