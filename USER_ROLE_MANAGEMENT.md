# User Role Management Quick Reference

## Role Hierarchy

1. **superuser** - Full system access, can manage all roles
2. **admin** - Can manage restaurants and content
3. **user** - Basic authenticated user (default for new signups)

## Common SQL Queries

### Check User Roles

```sql
-- View all users and their roles
SELECT 
  u.email,
  u.id as user_id,
  COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) as roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email
ORDER BY u.created_at DESC;
```

### Grant Superuser Role

```sql
-- Make a user a superuser (replace USER_ID)
INSERT INTO user_roles (user_id, role, created_by)
VALUES ('USER_ID_HERE', 'superuser', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;
```

### Grant Admin Role

```sql
-- Make a user an admin (replace USER_ID)
INSERT INTO user_roles (user_id, role, created_by)
VALUES ('USER_ID_HERE', 'admin', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;
```

### Revoke Roles

```sql
-- Remove admin role from a user
DELETE FROM user_roles
WHERE user_id = 'USER_ID_HERE'
AND role = 'admin';

-- Remove superuser role from a user
DELETE FROM user_roles
WHERE user_id = 'USER_ID_HERE'
AND role = 'superuser';
```

### Find User ID by Email

```sql
-- Get user ID from email
SELECT id, email, created_at
FROM auth.users
WHERE email = 'user@example.com';
```

### View User Profile

```sql
-- See complete user profile with roles
SELECT 
  u.id,
  u.email,
  u.created_at,
  up.display_name,
  array_agg(ur.role) as roles
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.email, u.created_at, up.display_name;
```

## Initial Setup Checklist

- [ ] Run `MIGRATION_OAUTH.sql` in Supabase SQL Editor
- [ ] Configure Google OAuth in Supabase Dashboard
- [ ] Configure GitHub OAuth in Supabase Dashboard
- [ ] Sign in to the app with your account
- [ ] Find your User ID in Supabase Dashboard
- [ ] Grant yourself superuser role using SQL
- [ ] Test admin access by visiting `/admin`
- [ ] Grant admin roles to other team members as needed

## Role Permissions

### Superuser Can:
- Access all admin features
- Manage restaurants and content
- View analytics
- **Manage user roles** (grant/revoke admin access)
- Access all API endpoints

### Admin Can:
- Access admin panel
- Manage restaurants and content
- View analytics
- Log restaurant visits
- Cannot manage user roles

### User Can:
- Sign in to the app
- View public content
- Cannot access admin features

## Security Notes

1. **Only grant superuser to trusted individuals** - they have full system access
2. **Regularly audit user roles** - remove access for inactive users
3. **Use the principle of least privilege** - grant admin instead of superuser when possible
4. **Keep track of who has access** - document role assignments
5. **Revoke access immediately** when someone leaves the team

## Troubleshooting

### User can't access admin panel after role assignment
- Have them sign out and sign back in
- Check that the role was actually inserted (run the check query)
- Verify the user_id matches exactly

### Multiple people need admin access
- Grant admin role to each person individually
- Don't share accounts - each person should use their own OAuth login

### Need to remove all roles from a user
```sql
DELETE FROM user_roles WHERE user_id = 'USER_ID_HERE';
```

### Need to see who granted a role
```sql
SELECT 
  ur.role,
  ur.created_at,
  u.email as granted_to,
  creator.email as granted_by
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
LEFT JOIN auth.users creator ON ur.created_by = creator.id
ORDER BY ur.created_at DESC;
```
