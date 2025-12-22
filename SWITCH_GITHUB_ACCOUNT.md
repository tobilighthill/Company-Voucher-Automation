# Switch to tobilighthill GitHub Account

## Step-by-Step Instructions:

### Step 1: Open Windows Credential Manager
1. Press `Windows Key` + `R`
2. Type: `control /name Microsoft.CredentialManager`
3. Press Enter

### Step 2: Remove GitHub Credentials
1. Click on "Windows Credentials"
2. Scroll down to find entries that say:
   - `git:https://github.com`
   - Or any GitHub-related credentials
3. Click on each one and select "Remove"

### Step 3: Configure Git for tobilighthill
Run these commands in your terminal:

```bash
# Set your name for this repository
git config user.name "tobilighthill"

# Set your email (use tobilighthill's email)
git config user.email "tobilighthill@example.com"
```

### Step 4: Try Pushing Again
```bash
git push origin master
```

When prompted:
- **Username**: Enter `tobilighthill`
- **Password**: Enter your GitHub password OR Personal Access Token

---

## ✅ RECOMMENDED: Use Personal Access Token Instead

GitHub no longer accepts passwords for authentication. Use a token:

### Create Token:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "Voucher System"
4. Check: `repo`
5. Click "Generate token"
6. **COPY THE TOKEN**

### Use Token When Pushing:
```bash
git push origin master
```

When prompted:
- **Username**: `tobilighthill`
- **Password**: Paste the token you copied

---

## 🚀 Quick Commands:

```bash
# 1. Configure Git
git config user.name "tobilighthill"
git config user.email "your-tobilighthill-email@example.com"

# 2. Add files
git add .

# 3. Commit
git commit -m "Initial commit - Cash Voucher System"

# 4. Push (will ask for credentials)
git push -u origin master
```

When it asks for credentials, use:
- Username: `tobilighthill`
- Password: Your Personal Access Token (not your GitHub password)

---

## 📝 Important Notes:

1. **GitHub Password Authentication is Deprecated**
   - You MUST use a Personal Access Token
   - Regular passwords won't work

2. **Token is Like a Password**
   - Keep it secret
   - Don't share it
   - Don't commit it to your code

3. **Token Permissions**
   - Make sure the token has `repo` access
   - This allows pushing to repositories

---

## ✅ After Successful Push:

Once pushed, you can deploy to:
- Netlify (easiest)
- Vercel
- GitHub Pages
- Any hosting platform

All will work perfectly on desktop and mobile!
