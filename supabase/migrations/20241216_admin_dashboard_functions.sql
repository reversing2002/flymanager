-- Create get_financial_stats function
CREATE OR REPLACE FUNCTION public.get_financial_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    WITH revenue_by_type AS (
        SELECT 
            aet.code as type,
            aet.name as type_name,
            SUM(ae.amount) as total
        FROM account_entries ae
        JOIN account_entry_types aet ON ae.entry_type_id = aet.id
        WHERE ae.created_at >= NOW() - INTERVAL '12 months'
        AND aet.is_credit = true
        GROUP BY aet.code, aet.name
    ),
    monthly_revenue AS (
        SELECT 
            date_trunc('month', ae.created_at) as month,
            aet.code as type,
            SUM(ae.amount) as total
        FROM account_entries ae
        JOIN account_entry_types aet ON ae.entry_type_id = aet.id
        WHERE ae.created_at >= NOW() - INTERVAL '12 months'
        AND aet.is_credit = true
        GROUP BY date_trunc('month', ae.created_at), aet.code
        ORDER BY month DESC
    )
    SELECT json_build_object(
        'total_revenue', (
            SELECT SUM(total)
            FROM revenue_by_type
        ),
        'revenue_by_type', (
            SELECT json_agg(
                json_build_object(
                    'type', type,
                    'name', type_name,
                    'total', total
                )
            )
            FROM revenue_by_type
        ),
        'monthly_revenue', (
            SELECT json_agg(
                json_build_object(
                    'month', to_char(month, 'YYYY-MM'),
                    'type', type,
                    'total', total
                )
            )
            FROM monthly_revenue
        )
    ) INTO result;

    RETURN result;
END;
$$;

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
