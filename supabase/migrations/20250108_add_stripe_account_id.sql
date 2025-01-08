-- Vérifier si la table club_settings existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'club_settings') THEN
        -- Créer la table club_settings si elle n'existe pas
        CREATE TABLE public.club_settings (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- Ajouter les politiques RLS
        ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Enable read access for authenticated users" ON public.club_settings
            FOR SELECT USING (auth.role() = 'authenticated');

        CREATE POLICY "Enable write access for admins only" ON public.club_settings
            FOR ALL USING (auth.uid() IN (
                SELECT auth.uid() FROM public.users
                WHERE auth.uid() = users.id AND users.role = 'admin'
            ));

        -- Créer le trigger pour updated_at
        CREATE TRIGGER handle_club_settings_updated_at
            BEFORE UPDATE ON public.club_settings
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- Ajouter la colonne stripe_account_id à la table clubs
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN public.clubs.stripe_account_id IS 'ID du compte Stripe Connect du club (commence par acct_)';

-- Migrer les données existantes si nécessaire (à adapter selon vos besoins)
DO $$
BEGIN
    -- Si vous aviez déjà des données dans club_settings, vous pouvez les migrer ici
    -- Example:
    -- UPDATE public.clubs c
    -- SET stripe_account_id = cs.stripe_account_id
    -- FROM public.club_settings cs
    -- WHERE cs.stripe_account_id IS NOT NULL;
END $$;
