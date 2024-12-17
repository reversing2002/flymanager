-- Create get_financial_stats function
CREATE OR REPLACE FUNCTION public.get_financial_stats(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    WITH RECURSIVE months AS (
        SELECT date_trunc('month', start_date) as month
        UNION ALL
        SELECT date_trunc('month', month + interval '1 month')
        FROM months
        WHERE month < date_trunc('month', end_date)
    ),
    monthly_stats AS (
        SELECT
            m.month,
            COALESCE(SUM(CASE 
                WHEN aet.is_credit THEN ae.amount 
                ELSE 0 
            END), 0) AS revenue,
            COALESCE(SUM(CASE 
                WHEN NOT aet.is_credit THEN ae.amount
                ELSE 0 
            END), 0) AS expenses
        FROM months m
        LEFT JOIN account_entries ae ON date_trunc('month', ae.date) = m.month
            AND ae.is_validated = true
        LEFT JOIN account_entry_types aet ON ae.entry_type_id = aet.id
        GROUP BY m.month
    ),
    payment_methods AS (
        SELECT
            ae.payment_method,
            COUNT(*) as count,
            SUM(CASE 
                WHEN aet.is_credit THEN ae.amount
                ELSE -ae.amount
            END) as total
        FROM account_entries ae
        LEFT JOIN account_entry_types aet ON ae.entry_type_id = aet.id
        WHERE ae.date BETWEEN start_date AND end_date
        AND ae.is_validated = true
        GROUP BY ae.payment_method
    ),
    entry_types AS (
        SELECT
            aet.code,
            aet.name,
            aet.is_credit,
            COUNT(*) as count,
            SUM(ae.amount) as total,
            MIN(ae.amount) as min_amount,
            MAX(ae.amount) as max_amount
        FROM account_entries ae
        LEFT JOIN account_entry_types aet ON ae.entry_type_id = aet.id
        WHERE ae.date BETWEEN start_date AND end_date
        AND ae.is_validated = true
        GROUP BY aet.code, aet.name, aet.is_credit
    )
    SELECT json_build_object(
        'total_revenue', COALESCE((
            SELECT SUM(revenue)
            FROM monthly_stats
        ), 0),
        'total_expenses', COALESCE((
            SELECT SUM(expenses)
            FROM monthly_stats
        ), 0),
        'monthly_stats', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'month', trim(to_char(month, 'Month YYYY')),
                    'revenue', revenue,
                    'expenses', expenses,
                    'total', revenue + expenses
                )
                ORDER BY month DESC
            )
            FROM monthly_stats
        ), '[]'::json),
        'payment_methods', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'method', payment_method,
                    'count', count,
                    'total', total
                )
                ORDER BY payment_method
            )
            FROM payment_methods
        ), '[]'::json),
        'entry_types', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'code', code,
                    'name', name,
                    'is_credit', is_credit,
                    'count', count,
                    'total', total,
                    'min_amount', min_amount,
                    'max_amount', max_amount
                )
                ORDER BY is_credit DESC, total DESC
            )
            FROM entry_types
        ), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;

-- Requête de debug pour comprendre les montants
WITH debug_stats AS (
    SELECT 
        aet.code,
        aet.name,
        aet.is_credit,
        COUNT(*) as count,
        SUM(ae.amount) as total,
        MIN(ae.amount) as min_amount,
        MAX(ae.amount) as max_amount
    FROM account_entries ae
    LEFT JOIN account_entry_types aet ON ae.entry_type_id = aet.id
    WHERE ae.date BETWEEN '2023-12-31T23:00:00.000Z' AND '2024-12-31T22:59:59.999Z'
    AND ae.is_validated = true
    GROUP BY aet.code, aet.name, aet.is_credit
    ORDER BY aet.is_credit DESC, total DESC
);

SELECT * FROM debug_stats;

-- Create get_member_stats function
CREATE OR REPLACE FUNCTION get_member_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    WITH active_members AS (
        SELECT DISTINCT mc.user_id
        FROM member_contributions mc
        WHERE mc.valid_until >= CURRENT_DATE
    ),
    expiring_soon AS (
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            mc.valid_until as expiry_date
        FROM users u
        JOIN member_contributions mc ON u.id = mc.user_id
        WHERE mc.valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND NOT EXISTS (
            SELECT 1 
            FROM member_contributions mc2
            WHERE mc2.user_id = u.id
            AND mc2.valid_until > mc.valid_until
        )
    ),
    qualification_stats AS (
        SELECT
            COUNT(*) FILTER (WHERE pq.expires_at < CURRENT_DATE) as expired_qualifications,
            COUNT(*) FILTER (WHERE pq.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_qualifications,
            json_agg(
                json_build_object(
                    'pilot_id', u.id,
                    'first_name', u.first_name,
                    'last_name', u.last_name,
                    'qualification', qt.name,
                    'expiry_date', pq.expires_at
                )
            ) FILTER (WHERE pq.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_details
        FROM pilot_qualifications pq
        JOIN users u ON pq.pilot_id = u.id
        JOIN qualification_types qt ON pq.qualification_type_id = qt.id
        WHERE pq.expires_at IS NOT NULL
    ),
    medical_stats AS (
        SELECT
            COUNT(*) FILTER (WHERE m.expires_at < CURRENT_DATE) as expired_medicals,
            COUNT(*) FILTER (WHERE m.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_medicals,
            json_agg(
                json_build_object(
                    'pilot_id', u.id,
                    'first_name', u.first_name,
                    'last_name', u.last_name,
                    'expiry_date', m.expires_at
                )
            ) FILTER (WHERE m.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_details
        FROM medicals m
        JOIN users u ON m.user_id = u.id
        WHERE m.expires_at IS NOT NULL
    )
    SELECT json_build_object(
        'active_members', (SELECT COUNT(*) FROM active_members),
        'expiring_memberships', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'first_name', first_name,
                    'last_name', last_name,
                    'expiry_date', expiry_date
                )
            )
            FROM expiring_soon
        ),
        'qualification_stats', (
            SELECT json_build_object(
                'expired', expired_qualifications,
                'expiring_soon', expiring_qualifications,
                'expiring_details', expiring_details
            )
            FROM qualification_stats
        ),
        'medical_stats', (
            SELECT json_build_object(
                'expired', expired_medicals,
                'expiring_soon', expiring_medicals,
                'expiring_details', expiring_details
            )
            FROM medical_stats
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Create get_maintenance_stats function
CREATE OR REPLACE FUNCTION get_maintenance_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
    aircraft_data jsonb;
BEGIN
    WITH flight_stats AS (
        SELECT 
            aircraft_id,
            COUNT(*) as total_flights,
            COALESCE(SUM(end_hour_meter - start_hour_meter), 0) as total_hours
        FROM flights 
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        AND is_validated = true
        GROUP BY aircraft_id
    ),
    aircraft_status AS (
        SELECT 
            a.id,
            a.registration,
            a.name,
            a.type as model,
            a.status,
            a.last_maintenance,
            a.hours_before_maintenance,
            COALESCE(f.total_flights, 0) as total_flights,
            COALESCE(f.total_hours, 0) as total_hours_30d,
            CASE
                WHEN a.status = 'MAINTENANCE' THEN 'out_of_service'
                WHEN a.hours_before_maintenance <= 0 THEN 'overdue'
                WHEN a.hours_before_maintenance <= 10 THEN 'upcoming'
                WHEN a.hours_before_maintenance <= 25 THEN 'near_overhaul'
                ELSE 'ok'
            END as maintenance_status
        FROM aircraft a
        LEFT JOIN flight_stats f ON f.aircraft_id = a.id
    )
    SELECT 
        jsonb_build_object(
            'maintenance_stats', jsonb_build_object(
                'overdue', COUNT(*) FILTER (WHERE maintenance_status = 'overdue'),
                'upcoming', COUNT(*) FILTER (WHERE maintenance_status = 'upcoming'),
                'out_of_service', COUNT(*) FILTER (WHERE maintenance_status = 'out_of_service'),
                'near_overhaul', COUNT(*) FILTER (WHERE maintenance_status = 'near_overhaul')
            ),
            'aircraft_list', jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'registration', registration,
                    'name', name,
                    'model', model,
                    'status', status,
                    'maintenance_status', maintenance_status,
                    'last_maintenance', last_maintenance,
                    'hours_before_maintenance', hours_before_maintenance,
                    'total_flights', total_flights,
                    'total_hours_30d', total_hours_30d
                )
                ORDER BY 
                    CASE maintenance_status 
                        WHEN 'out_of_service' THEN 1
                        WHEN 'overdue' THEN 2
                        WHEN 'upcoming' THEN 3
                        WHEN 'near_overhaul' THEN 4
                        ELSE 5
                    END,
                    registration
            )
        )
    INTO result
    FROM aircraft_status;

    RETURN result;
END;
$$;
