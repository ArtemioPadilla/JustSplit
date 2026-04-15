# Troubleshooting Common Issues

> **🛠️ Self-Service Solutions**: Most CyberEco issues can be resolved quickly with these step-by-step solutions. We've organized them by frequency and impact to help you get back on track fast.

## 🚨 Critical Issues (Immediate Resolution Needed)

### 🔐 Cannot Access Account

**Symptoms**: Login fails, password reset not working, 2FA problems

**🔍 Diagnosis Steps**:
1. **Check your caps lock** - Password is case-sensitive
2. **Verify email spelling** - Even small typos prevent login
3. **Check 2FA device time** - Must be synchronized
4. **Look for account lockout message** - Too many failed attempts

**✅ Solutions**:

**Option 1: Password Reset**
```
1. Go to login page → "Forgot Password"
2. Enter your exact email address
3. Check email (including spam folder)
4. Click reset link within 1 hour
5. Create new strong password
6. Try logging in
```

**Option 2: 2FA Recovery**
```
1. On 2FA prompt, click "Use backup code"
2. Enter one of your saved recovery codes
3. Go to Settings → Security
4. Disable and re-enable 2FA
5. Set up new authenticator app
6. Save new recovery codes
```

**Option 3: Account Recovery**
```
If above options fail:
1. Email: recovery@cybereco.io
2. Include: Account email, approximate creation date
3. Attach: Photo ID for verification
4. Response time: Within 2 hours
```

### 💰 Missing or Incorrect Expense Data

**Symptoms**: Expenses disappeared, amounts wrong, participants missing

**🔍 Diagnosis Steps**:
1. **Check internet connection** - Data may not be synced
2. **Verify you're in correct group** - May be viewing wrong group
3. **Check expense filters** - Date range or category filters active
4. **Look for "Draft" status** - Expense may not be saved

**✅ Solutions**:

**Option 1: Force Sync**
```
Mobile App:
1. Pull down on expense list to refresh
2. Check "Sync status" in settings
3. If stuck, log out and log back in

Web App:
1. Refresh browser page (Ctrl+R / Cmd+R)
2. Clear browser cache and cookies
3. Try incognito/private browsing mode
```

**Option 2: Recover Draft Expenses**
```
1. Go to Profile → Drafts
2. Look for unsaved expenses
3. Complete and save any drafts
4. Check if missing expense appears
```

**Option 3: Data Recovery Request**
```
If data truly lost:
1. Email: data-recovery@cybereco.io
2. Include: Expense description, approximate date
3. Include: Group name and participants
4. We can recover from backups within 30 days
```

### 🔔 Notifications Not Working

**Symptoms**: Not receiving expense notifications, reminders, or updates

**🔍 Diagnosis Steps**:
1. **Check notification settings** in app and device
2. **Verify email deliverability** - Check spam folder
3. **Test with different notification types**
4. **Check "Do Not Disturb" settings** on device

**✅ Solutions**:

**Mobile Notifications**:
```
iOS:
1. Settings → Notifications → CyberEco
2. Ensure "Allow Notifications" is ON
3. Check Alert Style and Sound settings
4. Verify Banner and Lock Screen options

Android:
1. Settings → Apps → CyberEco → Notifications
2. Enable all notification categories
3. Check "Do Not Disturb" exceptions
4. Verify battery optimization settings
```

**Email Notifications**:
```
1. Go to Hub → Settings → Notifications
2. Verify email address is correct
3. Check all notification types you want
4. Test with "Send Test Email" button
5. Add support@cybereco.io to contacts
```

## ⚠️ Common Issues (Frequently Encountered)

### 📱 App Performance Problems

**Symptoms**: Slow loading, crashes, freezing, high battery usage

**✅ Quick Fixes**:

**General Performance**:
```
1. Close app completely and reopen
2. Restart your device
3. Check available storage (need 500MB+)
4. Update app to latest version
5. Close other apps running in background
```

**Android Specific**:
```
1. Settings → Apps → CyberEco → Storage
2. Clear Cache (NOT Clear Data)
3. Check if app is on SD card (move to internal)
4. Disable battery optimization for CyberEco
```

**iOS Specific**:
```
1. Settings → General → iPhone Storage
2. Check CyberEco storage usage
3. Offload and reinstall if very large
4. Check iOS version compatibility
```

**Web App Performance**:
```
Browser Optimization:
1. Clear browser cache and cookies
2. Disable unnecessary browser extensions
3. Try different browser (Chrome, Firefox, Safari)
4. Check for browser updates
5. Disable ad blockers temporarily
```

### 🤝 Friend/Group Invitation Issues

**Symptoms**: Invitations not sending, friends can't join, group code not working

**✅ Solutions**:

**Invitation Not Received**:
```
1. Verify email address spelling exactly
2. Check recipient's spam/junk folder
3. Try different invitation method:
   - Direct email invite
   - Share group code
   - Send group link
4. Confirm recipient has CyberEco account
```

**Group Code Problems**:
```
1. Ensure code is entered exactly (case-sensitive)
2. Check if group is set to "Private" (invite-only)
3. Verify group isn't at member limit
4. Try generating new group code
```

**Permission Issues**:
```
1. Check if you're group admin
2. Verify group privacy settings
3. Ensure recipient isn't blocked
4. Check if group is archived/inactive
```

### 💱 Currency and Calculation Problems

**Symptoms**: Wrong amounts, currency conversion errors, rounding issues

**✅ Solutions**:

**Currency Conversion**:
```
1. Check internet connection for live rates
2. Verify base currency in group settings
3. Manual rate override if needed:
   - Edit expense → Advanced → Exchange Rate
   - Use rate from your bank/payment method
4. Check date - rates change daily
```

**Calculation Errors**:
```
1. Verify all amounts add up to total
2. Check for hidden taxes or tips
3. Use "Auto-balance" for small discrepancies
4. Round to nearest cent if needed
5. Consider payment processing fees
```

**Split Not Adding Up**:
```
1. Check rounding method in settings
2. Look for "Remainder" distribution
3. Manually adjust amounts if needed
4. Use percentage split for exact ratios
```

### 📸 Receipt Scanning Issues

**Symptoms**: Receipt not recognized, wrong amounts extracted, scanning fails

**✅ Solutions**:

**Improve Scan Quality**:
```
1. Good lighting - avoid shadows
2. Flat receipt on dark background
3. Hold phone steady, avoid blurry images
4. Clean camera lens
5. Ensure entire receipt is in frame
```

**Manual Extraction**:
```
If auto-scan fails:
1. Take photo anyway
2. Select "Manual Entry"
3. Type amounts while viewing photo
4. Attach photo to expense
5. Save for future reference
```

**Supported Receipt Types**:
```
✅ Restaurant receipts
✅ Retail store receipts  
✅ Gas station receipts
✅ Hotel bills
❌ Handwritten receipts
❌ Severely faded receipts
❌ Crumpled or torn receipts
```

## 🐛 Technical Issues

### 🌐 Sync and Connection Problems

**Symptoms**: Data not syncing across devices, "connection error" messages

**✅ Solutions**:

**Check Network Connection**:
```
1. Verify internet connectivity
2. Try different network (WiFi vs mobile data)
3. Check if other apps work normally
4. Test on different device
```

**Force Data Sync**:
```
1. Pull-to-refresh on main screens
2. Log out and log back in
3. Check "Last Sync" time in settings
4. Contact support if sync is >24 hours old
```

**Firewall/Network Issues**:
```
Corporate/School Networks:
1. Check if CyberEco domains are blocked
2. Try mobile data instead of WiFi
3. Contact IT about domain whitelist:
   - *.cybereco.io
   - *.firebase.com
   - *.googleapis.com
```

### 💾 Data Export/Import Issues

**Symptoms**: Export fails, files corrupted, import not working

**✅ Solutions**:

**Export Problems**:
```
1. Try smaller date range
2. Export by category instead of all data
3. Use different format (CSV vs PDF)
4. Check available storage space
5. Try from web app instead of mobile
```

**Import Issues**:
```
1. Verify file format is supported
2. Check file isn't corrupted
3. Ensure column headers match template
4. Remove special characters from data
5. Import in smaller batches
```

### 🔄 Update and Installation Issues

**Symptoms**: App won't update, installation fails, version conflicts

**✅ Solutions**:

**App Store Updates**:
```
iOS:
1. App Store → Updates → Check for CyberEco
2. If stuck, try: Settings → General → Reset → Reset Network Settings
3. Sign out and back into App Store

Android:
1. Play Store → My Apps → CyberEco → Update
2. If stuck, clear Play Store cache
3. Try manual APK download from our website
```

**Web App Updates**:
```
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache completely
3. Check for browser updates
4. Try incognito/private mode
```

## 🎛️ Settings and Configuration Issues

### 👤 Profile and Privacy Settings

**Symptoms**: Settings not saving, privacy controls not working, profile errors

**✅ Solutions**:

**Settings Not Saving**:
```
1. Check internet connection
2. Don't navigate away until "Saved" confirmation
3. Try different browser/device
4. Clear browser cache
5. Check if account has proper permissions
```

**Privacy Controls**:
```
1. Review each privacy setting individually
2. Test with trusted friend to verify
3. Check group-level privacy overrides
4. Understand public vs private vs friends settings
```

### 🔔 Notification Preferences

**Symptoms**: Too many notifications, not getting important alerts, wrong frequency

**✅ Solutions**:

**Customize Notification Types**:
```
Recommended Settings:
✅ Security alerts (always on)
✅ Payment reminders
✅ New expense notifications
❓ Weekly summaries (personal preference)
❌ Marketing updates (unless wanted)
```

**Frequency Adjustment**:
```
1. Hub → Settings → Notifications → Frequency
2. Set reminder frequency per expense type
3. Choose quiet hours
4. Set maximum notifications per day
```

## 🆘 Emergency Procedures

### 🚨 Suspected Security Breach

**If you suspect unauthorized access**:

```
IMMEDIATE ACTIONS (within 5 minutes):
1. Change password immediately
2. Enable 2FA if not already active
3. Log out all devices: Settings → Security → Sign Out All
4. Check recent activity log
5. Email security@cybereco.io with details

FOLLOW-UP ACTIONS (within 24 hours):
1. Review all recent expenses and changes
2. Check connected accounts and permissions
3. Inform group members if group data affected
4. Enable additional security features
5. Consider contacting bank if payment info involved
```

### 💔 Critical Data Loss

**If important data appears lost**:

```
DON'T PANIC - WE HAVE BACKUPS:
1. Stop using the app immediately
2. Don't try to "fix" it yourself
3. Email emergency@cybereco.io immediately
4. Include: Account email, what's missing, when noticed
5. We maintain 30-day rolling backups of all data

RECOVERY TIMEFRAME:
- Recent data (last 24 hours): 2-4 hours
- Older data (last 30 days): 4-8 hours
- Very old data: Contact for assessment
```

## 📞 When to Contact Support

### 🟢 Self-Service First
Try these troubleshooting steps first for:
- Login issues (except account recovery)
- App performance problems
- Basic feature questions
- Settings and configuration

### 🟡 Contact Support For
- Data sync issues lasting >24 hours
- Payment or billing problems
- Group management conflicts
- Export/import failures
- Recurring technical problems

### 🔴 Emergency Contact For
- Suspected security breach
- Critical data loss
- Account compromise
- Privacy violation concerns

## 📧 Support Contact Information

**📧 General Support**: `support@cybereco.io`
- Response time: Within 24 hours
- Include: Account email, specific issue, steps tried

**🚨 Emergency Support**: `emergency@cybereco.io`
- Response time: Within 2 hours
- For critical issues only

**🔐 Security Issues**: `security@cybereco.io`
- Response time: Within 1 hour
- For suspected breaches or vulnerabilities

**📊 Data Recovery**: `data-recovery@cybereco.io`
- Response time: Within 4 hours
- For lost or corrupted data

## 💡 Prevention Tips

### 🛡️ Avoid Common Issues
1. **Keep apps updated** - Enable automatic updates
2. **Use strong passwords** - Different for each account
3. **Enable 2FA** - Essential security protection
4. **Regular backups** - Export data monthly
5. **Monitor activity** - Check recent activity weekly

### 📚 Stay Informed
1. **Read update notes** - Know what's changed
2. **Follow community forums** - Learn from other users
3. **Join user groups** - Local and virtual meetups
4. **Subscribe to security alerts** - Stay aware of issues

---

> **🔧 Remember**: CyberEco is designed to be reliable and user-friendly, but when issues arise, we're here to help. Most problems have simple solutions, and our support team is committed to resolving any issues quickly and completely.