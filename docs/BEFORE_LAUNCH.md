# Before a public launch

Things we knowingly postponed for the demo/pitch stage. Do these before real users.

## Accounts and email
- [ ] Buy a domain and connect it to the website (Vercel) and server (Render).
- [ ] Set up a proper email service on that domain (confirmation and password-reset emails).
- [ ] Turn **Confirm email** back ON in Supabase (Authentication > Sign In / Providers > Email).
- [ ] Optional: "Sign in with Google".
- [ ] Add the live website address in Supabase (Authentication > URL Configuration).

## Legal and trust
- [ ] Lawyer reviews Privacy Policy, Terms and Financial Disclaimer.
- [ ] Check Indian rules on data protection (DPDP Act) and on any investment/insurance/lending features.

## Safety
- [ ] Turn on Supabase "Leaked password protection" (blocks passwords found in data leaks; may need a paid plan).
- [ ] Security review and penetration check.
- [ ] AI usage limits per user and cost alerts.
- [ ] Backups and error monitoring switched on.

## Current demo-stage choices
- Sign-in is **email + password**; email confirmation is OFF for now.
- Password reset emails use Supabase's built-in sender, which only reaches the project team until a real email service is added.
