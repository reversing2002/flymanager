```sql
-- Create instructor_invoices table
CREATE TABLE instructor_invoices (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    instructor_id uuid NOT NULL REFERENCES users(id),
    start_date date NOT NULL,
    end_date date NOT NULL,
    amount decimal NOT NULL,
    status text NOT NULL CHECK (status IN ('DRAFT', 'PENDING', 'PAID')),
    invoice_number text NOT NULL UNIQUE,
    payment_method text,
    comments text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at timestamp with time zone
);

-- Create instructor_invoice_details table
CREATE TABLE instructor_invoice_details (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id uuid NOT NULL REFERENCES instructor_invoices(id) ON DELETE CASCADE,
    flight_id uuid NOT NULL REFERENCES flights(id),
    amount decimal NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(flight_id)
);

-- Add instructor_invoice_id to flights table
ALTER TABLE flights
ADD COLUMN instructor_invoice_id uuid REFERENCES instructor_invoices(id);

-- Create indexes
CREATE INDEX idx_instructor_invoices_instructor_id ON instructor_invoices(instructor_id);
CREATE INDEX idx_instructor_invoices_status ON instructor_invoices(status);
CREATE INDEX idx_instructor_invoice_details_invoice_id ON instructor_invoice_details(invoice_id);
CREATE INDEX idx_flights_instructor_invoice_id ON flights(instructor_invoice_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_instructor_invoices_updated_at
    BEFORE UPDATE ON instructor_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructor_invoice_details_updated_at
    BEFORE UPDATE ON instructor_invoice_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE instructor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_invoice_details ENABLE ROW LEVEL SECURITY;

-- Policies for instructor_invoices
CREATE POLICY "Users can view their own invoices"
ON instructor_invoices
FOR SELECT
USING (instructor_id = auth.uid() OR auth.uid() IN (
    SELECT user_id FROM user_group_memberships 
    WHERE group_id IN (
        SELECT id FROM user_groups WHERE name = 'ADMIN'
    )
));

CREATE POLICY "Users can create their own invoices"
ON instructor_invoices
FOR INSERT
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Users can update their own draft invoices"
ON instructor_invoices
FOR UPDATE
USING (
    instructor_id = auth.uid() 
    AND status = 'DRAFT'
)
WITH CHECK (
    instructor_id = auth.uid() 
    AND status = 'DRAFT'
);

CREATE POLICY "Admins can update any invoice"
ON instructor_invoices
FOR UPDATE
USING (
    auth.uid() IN (
        SELECT user_id FROM user_group_memberships 
        WHERE group_id IN (
            SELECT id FROM user_groups WHERE name = 'ADMIN'
        )
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM user_group_memberships 
        WHERE group_id IN (
            SELECT id FROM user_groups WHERE name = 'ADMIN'
        )
    )
);

-- Policies for instructor_invoice_details
CREATE POLICY "Users can view their own invoice details"
ON instructor_invoice_details
FOR SELECT
USING (
    invoice_id IN (
        SELECT id FROM instructor_invoices 
        WHERE instructor_id = auth.uid()
    )
    OR auth.uid() IN (
        SELECT user_id FROM user_group_memberships 
        WHERE group_id IN (
            SELECT id FROM user_groups WHERE name = 'ADMIN'
        )
    )
);

CREATE POLICY "Users can create their own invoice details"
ON instructor_invoice_details
FOR INSERT
WITH CHECK (
    invoice_id IN (
        SELECT id FROM instructor_invoices 
        WHERE instructor_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own invoice details"
ON instructor_invoice_details
FOR UPDATE
USING (
    invoice_id IN (
        SELECT id FROM instructor_invoices 
        WHERE instructor_id = auth.uid()
        AND status = 'DRAFT'
    )
)
WITH CHECK (
    invoice_id IN (
        SELECT id FROM instructor_invoices 
        WHERE instructor_id = auth.uid()
        AND status = 'DRAFT'
    )
);
```