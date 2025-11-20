# How to Debug the Contact Form

## Check Netlify Function Logs:

1. Go to https://app.netlify.com
2. Select your site
3. Click "Functions" in the top menu
4. Click "submit-contact" function
5. Click "Function log" tab
6. Try submitting the form
7. Watch for errors in the log

## Common Issues:

### Issue 1: Environment variables not set
Error: "Configuration serveur manquante"
Fix: Add the 3 environment variables in Netlify

### Issue 2: Airtable fields don't match
Error: "UNKNOWN_FIELD_NAME"  
Fix: Make sure Airtable field names match exactly

### Issue 3: Function not deployed
Error: 404 or function not found
Fix: Trigger a new deploy after adding the function

## Test the Form:

1. Fill out all required fields
2. Check both checkboxes (Newsletter optional, GDPR required)
3. Click "Envoyer le message"
4. Watch for success/error message
5. Check Netlify function logs
6. Check Airtable for new record

## Quick Test URLs:

- Your site: https://poursenlisenconfiance.fr
- Netlify dashboard: https://app.netlify.com
- Your Airtable base: https://airtable.com/appSf4aSyimnJTB8W
