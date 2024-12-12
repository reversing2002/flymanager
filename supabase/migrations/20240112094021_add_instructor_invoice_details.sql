-- Create instructor_invoice_details table
CREATE TABLE IF NOT EXISTS public.instructor_invoice_details (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id uuid NOT NULL REFERENCES public.instructor_invoices(id) ON DELETE CASCADE,
    flight_id uuid NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
    amount decimal NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(flight_id, invoice_id)
);

-- Add RLS policies
ALTER TABLE public.instructor_invoice_details ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.instructor_invoice_details
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow instructors to manage their own invoice details
CREATE POLICY "Enable instructors to manage their own invoice details" ON public.instructor_invoice_details
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM instructor_invoices ii
            WHERE ii.id = instructor_invoice_details.invoice_id
            AND ii.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM instructor_invoices ii
            WHERE ii.id = instructor_invoice_details.invoice_id
            AND ii.instructor_id = auth.uid()
        )
    );

-- Allow admins to manage all invoice details
CREATE POLICY "Enable admins to manage all invoice details" ON public.instructor_invoice_details
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            WHERE ugm.user_id = auth.uid()
            AND ugm.group_name = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_group_memberships ugm
            WHERE ugm.user_id = auth.uid()
            AND ugm.group_name = 'ADMIN'
        )
    );
