-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    siret VARCHAR(14),
    address TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create supplier_invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_suppliers_club_id ON suppliers(club_id);
CREATE INDEX idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);

-- Add RLS policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Users can view suppliers from their club" ON suppliers
    FOR SELECT
    USING (club_id IN (
        SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert suppliers for their club" ON suppliers
    FOR INSERT
    WITH CHECK (club_id IN (
        SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update suppliers from their club" ON suppliers
    FOR UPDATE
    USING (club_id IN (
        SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
    ));

-- Create policies for supplier_invoices
CREATE POLICY "Users can view invoices from their club's suppliers" ON supplier_invoices
    FOR SELECT
    USING (supplier_id IN (
        SELECT id FROM suppliers WHERE club_id IN (
            SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert invoices for their club's suppliers" ON supplier_invoices
    FOR INSERT
    WITH CHECK (supplier_id IN (
        SELECT id FROM suppliers WHERE club_id IN (
            SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can update invoices from their club's suppliers" ON supplier_invoices
    FOR UPDATE
    USING (supplier_id IN (
        SELECT id FROM suppliers WHERE club_id IN (
            SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
        )
    ));
