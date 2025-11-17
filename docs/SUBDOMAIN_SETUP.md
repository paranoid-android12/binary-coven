# Admin Subdomain Setup Guide

This guide explains how to configure your application so that admin routes are accessible via `admin.domainname.com` instead of `domainname.com/admin`.

## Overview

The application is already configured with middleware that handles subdomain routing. When you access `admin.domainname.com`, the middleware:

1. Detects the `admin.` subdomain
2. Rewrites paths to `/admin` routes internally
3. Handles authentication and redirects
4. Blocks `/admin` routes on the main domain (redirects to admin subdomain)

## Code Changes

The middleware (`src/middleware.ts`) has been updated to:
- ✅ Detect `admin.` subdomain and route to `/admin` paths
- ✅ Block `/admin` routes on main domain and redirect to admin subdomain
- ✅ Handle localhost for local development

**No code changes needed** - the routing logic is already in place!

## DNS Configuration

### Production Setup

1. **Add A Record for Admin Subdomain**
   - In your DNS provider (Cloudflare, Route 53, etc.)
   - Add an A record: `admin` → Your server IP address
   - Or add a CNAME: `admin` → `yourdomain.com`

2. **Example DNS Records:**
   ```
   A     @              → 192.0.2.1        (main domain)
   A     admin          → 192.0.2.1        (admin subdomain)
   ```

3. **Wait for DNS Propagation**
   - DNS changes can take 5 minutes to 48 hours
   - Use `dig admin.yourdomain.com` or `nslookup admin.yourdomain.com` to verify

### SSL Certificate

If using HTTPS, ensure your SSL certificate covers the subdomain:
- **Let's Encrypt**: Use wildcard certificate (`*.yourdomain.com`) or add `admin.yourdomain.com` to certificate
- **Cloudflare**: Automatically handles subdomain SSL
- **Other providers**: Add `admin.yourdomain.com` to your certificate

## Server/Hosting Configuration

### Next.js Deployment (Vercel, Netlify, etc.)

Most modern hosting platforms automatically handle subdomains:

1. **Vercel**
   - Add `admin.yourdomain.com` as a domain in project settings
   - Vercel automatically routes it to your app
   - Middleware handles the rest

2. **Netlify**
   - Add `admin.yourdomain.com` as a custom domain
   - Netlify handles routing automatically

3. **Custom Server (Node.js/Express)**
   - Ensure your server accepts requests for both domains
   - The middleware will handle routing based on the `Host` header

### Apache/XAMPP Configuration

If using Apache (like XAMPP), you need to configure virtual hosts:

1. **Edit `httpd-vhosts.conf`** (usually in `xampp/apache/conf/extra/`):

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot "/Applications/XAMPP/xamppfiles/htdocs/binary-coven"
    
    <Directory "/Applications/XAMPP/xamppfiles/htdocs/binary-coven">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    ServerName admin.yourdomain.com
    DocumentRoot "/Applications/XAMPP/xamppfiles/htdocs/binary-coven"
    
    <Directory "/Applications/XAMPP/xamppfiles/htdocs/binary-coven">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

2. **Enable virtual hosts** in `httpd.conf`:
```apache
Include conf/extra/httpd-vhosts.conf
```

3. **Restart Apache**

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    root /path/to/binary-coven;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name admin.yourdomain.com;
    
    root /path/to/binary-coven;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Local Development Setup

### Option 1: Using `admin.localhost` (Recommended)

Modern browsers support `*.localhost` subdomains automatically:

1. **Access admin via:** `http://admin.localhost:3000`
2. **Access main site via:** `http://localhost:3000`
3. **No configuration needed!**

### Option 2: Edit `/etc/hosts` File

1. **Edit hosts file:**
   ```bash
   sudo nano /etc/hosts  # macOS/Linux
   # or
   notepad C:\Windows\System32\drivers\etc\hosts  # Windows
   ```

2. **Add entries:**
   ```
   127.0.0.1       localhost
   127.0.0.1       admin.localhost
   ```

3. **Access:**
   - Main: `http://localhost:3000`
   - Admin: `http://admin.localhost:3000`

### Option 3: Use a Local Domain

1. **Edit hosts file:**
   ```
   127.0.0.1       binary-coven.local
   127.0.0.1       admin.binary-coven.local
   ```

2. **Access:**
   - Main: `http://binary-coven.local:3000`
   - Admin: `http://admin.binary-coven.local:3000`

## How It Works

### Request Flow

1. **User visits `admin.domainname.com`**
   - Browser sends request with `Host: admin.domainname.com` header

2. **Middleware Intercepts**
   - Detects `admin.` subdomain (line 22 in middleware.ts)
   - Rewrites paths to `/admin` routes (lines 33-35)
   - Checks authentication (lines 38-51)

3. **User visits `domainname.com/admin`**
   - Middleware detects main domain (not admin subdomain)
   - Redirects to `admin.domainname.com/admin` (lines 62-83)

### Internal Routing

All admin pages still use `/admin/*` paths internally:
- `/admin` → Dashboard
- `/admin/login` → Login page
- `/admin/sessions` → Session management
- `/admin/students` → Student management
- `/admin/users` → Admin user management

The middleware handles the subdomain-to-path mapping automatically.

## Testing

### Test Checklist

1. ✅ **Main domain works:** `https://yourdomain.com` → Shows student game
2. ✅ **Admin subdomain works:** `https://admin.yourdomain.com` → Shows admin login
3. ✅ **Redirect works:** `https://yourdomain.com/admin` → Redirects to `https://admin.yourdomain.com/admin`
4. ✅ **Admin routes work:** `https://admin.yourdomain.com/sessions` → Shows sessions page
5. ✅ **Authentication works:** Unauthenticated users redirected to login

### Debugging

If subdomain routing isn't working:

1. **Check DNS:**
   ```bash
   dig admin.yourdomain.com
   nslookup admin.yourdomain.com
   ```

2. **Check Host Header:**
   - Open browser DevTools → Network tab
   - Check request headers for `Host: admin.yourdomain.com`

3. **Check Middleware:**
   - Add console.log in middleware.ts to debug:
   ```typescript
   console.log('Host:', hostname);
   console.log('Is Admin Subdomain:', isAdminSubdomain);
   ```

4. **Check Server Logs:**
   - Verify requests are reaching your server
   - Check for routing errors

## Security Considerations

1. **CORS Settings:** Ensure API routes allow requests from admin subdomain
2. **Cookie Domain:** Admin session cookies should work across subdomains
3. **SSL Required:** Always use HTTPS in production
4. **Rate Limiting:** Consider rate limiting on admin login endpoint

## Troubleshooting

### Issue: Subdomain not resolving
- **Solution:** Check DNS propagation, wait up to 48 hours
- **Quick test:** Use `curl -H "Host: admin.yourdomain.com" http://your-ip/`

### Issue: SSL certificate error
- **Solution:** Ensure certificate includes `admin.yourdomain.com` or use wildcard cert

### Issue: Redirect loop
- **Solution:** Check middleware logic, ensure protocol detection works correctly

### Issue: Local development not working
- **Solution:** Use `admin.localhost` or configure `/etc/hosts` file

## Summary

✅ **Code is ready** - Middleware handles subdomain routing  
✅ **DNS needed** - Add `admin` A/CNAME record pointing to your server  
✅ **Server config** - Ensure server accepts requests for admin subdomain  
✅ **SSL needed** - Add subdomain to certificate or use wildcard  
✅ **Test** - Verify routing works in both production and development

The application is already configured to work with subdomains. You just need to set up DNS and server configuration!

