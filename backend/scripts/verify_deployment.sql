-- 1. Check if table 'employee_certifications' exists
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employee_certifications'
    ) as "Table Exists?";

-- 2. List all columns in the table to verify schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'employee_certifications';

-- 3. Check if RLS is enabled and policies exist
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM 
    pg_policies 
WHERE 
    tablename = 'employee_certifications';

-- 4. Check for 'employee' role permissions (optional)
SELECT 
    grantee, 
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_name = 'employee_certifications';
