-- Create treasury table
CREATE TABLE IF NOT EXISTS public.treasury (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    account_id uuid NOT NULL,
    club_id uuid NOT NULL,
    balance decimal(15,2) DEFAULT 0.00,
    last_reconciliation_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT treasury_pkey PRIMARY KEY (id),
    CONSTRAINT treasury_account_id_key UNIQUE (account_id),
    CONSTRAINT treasury_account_id_fkey FOREIGN KEY (account_id)
        REFERENCES public.accounts(id) ON DELETE CASCADE,
    CONSTRAINT treasury_club_id_fkey FOREIGN KEY (club_id)
        REFERENCES public.clubs(id) ON DELETE CASCADE
);

-- Add updated_at trigger
CREATE TRIGGER set_treasury_updated_at
    BEFORE UPDATE ON treasury
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_treasury_club_id ON public.treasury(club_id);
CREATE INDEX IF NOT EXISTS idx_treasury_account_id ON public.treasury(account_id);
