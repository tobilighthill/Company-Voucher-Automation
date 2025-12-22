# 🚀 GitHub Deployment Guide - Fix Authentication Issue

## ⚠️ Current Issue:
You're logged in as `Odelolasolomon` but trying to push to `tobilighthill/Company-Voucher-Automation`.

---

## ✅ SOLUTION 1: Use Personal Access Token (Recommended)

### Step 1: Create a Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "Voucher System Deploy"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Update Remote URL with Token
Run this command (replace `YOUR_TOKEN` with the token you copied):

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/tobilighthill/Company-Voucher-Automation.git
```

### Step 3: Push to GitHub
```bash
git add .
git commit -m "Initial commit - Cash Voucher System"
git push -u origin master
```

---

## ✅ SOLUTION 2: Switch GitHub Account

### Option A: Use Git Credential Manager
```bash
# Remove cached credentials
git credential-cache exit

# Or on Windows:
git credential-manager-core erase https://github.com

# Then try pushing again - it will ask for new credentials
git push origin master
```

### Option B: Configure Git User
```bash
# Set the correct user for this repository
git config user.name "tobilighthill"
git config user.email "your-tobilighthill-email@example.com"

# Then push
git push origin master
```

---

## ✅ SOLUTION 3: Use SSH Instead (Most Secure)

### Step 1: Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "your-tobilighthill-email@example.com"
# Press Enter to accept default location
# Enter a passphrase (or leave empty)
```

### Step 2: Add SSH Key to GitHub
```bash
# Copy the public key
cat ~/.ssh/id_ed25519.pub

# Go to: https://github.com/settings/keys
# Click "New SSH key"
# Paste the key and save
```

### Step 3: Change Remote to SSH
```bash
git remote set-url origin git@github.com:tobilighthill/Company-Voucher-Automation.git
git push -u origin master
```

---

## 🎯 EASIEST METHOD: Deploy to Netlify Directly (No GitHub Needed!)

If you just want to deploy quickly without GitHub:

### Step 1: Go to Netlify
1. Visit: https://app.netlify.com
2. Sign up (free)

### Step 2: Drag & Drop Deploy
1. Click "Add new site" → "Deploy manually"
2. Drag your entire `Voucher` folder onto the page
3. Done! You get a URL like: `https://lighthill-voucher.netlify.app`

### Step 3: Update Site Name (Optional)
1. Go to "Site settings" → "Site details"
2. Click "Change site name"
3. Enter: `lighthill-voucher` or any name you want

---

## 📋 Quick Commands Reference

### If using Personal Access Token:
```bash
# Update remote with token
git remote set-url origin https://YOUR_TOKEN@github.com/tobilighthill/Company-Voucher-Automation.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - Cash Voucher System"

# Push
git push -u origin master
```

### If switching accounts:
```bash
# Clear credentials
git credential-manager-core erase https://github.com

# Configure user
git config user.name "tobilighthill"
git config user.email "tobilighthill@example.com"

# Push (will ask for credentials)
git push origin master
```

---

## 🚀 After Successful Push

Once pushed to GitHub, you can:

### Option 1: Deploy to Netlify from GitHub
1. Go to Netlify
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub
4. Select `Company-Voucher-Automation` repository
5. Click "Deploy"
6. Auto-deploys on every push!

### Option 2: Deploy to Vercel
1. Go to vercel.com
2. Import GitHub repository
3. Deploy

### Option 3: Deploy to GitHub Pages
```bash
# Create gh-pages branch
git checkout -b gh-pages
git push origin gh-pages

# Enable in GitHub:
# Settings → Pages → Source: gh-pages branch
# Your site: https://tobilighthill.github.io/Company-Voucher-Automation/
```

---

## ✅ Recommended: Use Personal Access Token

**This is the easiest and most reliable method:**

1. Create token at: https://github.com/settings/tokens
2. Copy the token
3. Run:
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/tobilighthill/Company-Voucher-Automation.git
   git push -u origin master
   ```

**That's it!**
