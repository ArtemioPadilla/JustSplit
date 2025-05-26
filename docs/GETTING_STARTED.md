# Getting Started with CyberEco

> 🚀 **Get up and running with CyberEco development in under 10 minutes**

## ⚡ Quick Setup (3 Steps)

### 1. **Install Prerequisites**
```bash
# Install Node.js 18+ (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install global tools
npm install -g firebase-tools nx
```

### 2. **Clone and Install**
```bash
git clone <your-repository-url>
cd cybereco-monorepo
npm install
```

### 3. **Start Development**
```bash
npm run dev
```

🎉 **Done!** Open your browser:
- **Hub**: http://localhost:3000
- **JustSplit**: http://localhost:4000

---

## 🛠️ Development Environment

### **What You'll See**
- **Hub (Port 3000)**: Authentication and app launcher
- **JustSplit (Port 4000)**: Expense splitting application
- **Hot Reload**: Changes appear instantly
- **TypeScript**: Full type checking and IntelliSense

### **Recommended Tools**
- **VS Code**: Best IDE support with extensions
- **Firebase Tools**: For backend development
- **NX Console**: VS Code extension for NX commands

---

## 📁 Understanding the Structure

```
cybereco-monorepo/
├── apps/                    # 🏠 Applications
│   ├── hub/                # Authentication hub
│   └── justsplit/          # Expense app
├── libs/                   # 📚 Shared code
│   ├── shared-types/       # TypeScript types
│   ├── firebase-config/    # Firebase utilities
│   └── ui-components/      # React components
├── firebase/               # 🔥 Deployment configs
└── docs/                   # 📖 Documentation
```

### **Key Concepts**
- **Monorepo**: All apps in one repository
- **Shared Libraries**: Code reused across apps
- **NX**: Build system with caching and optimization
- **Firebase**: Backend services (auth, database, hosting)

---

## 🧪 Your First Changes

### **1. Try Editing a Component**
```bash
# Open JustSplit's main page
code apps/justsplit/src/app/page.tsx

# Make a change and save
# The page will reload automatically
```

### **2. Run Tests**
```bash
npm run test              # All tests
nx test justsplit-app     # JustSplit only
nx test hub              # Hub only
```

### **3. Check Code Quality**
```bash
npm run lint             # Check style
npm run build            # Verify builds work
```

---

## 🔥 Working with Firebase

### **Using Emulators (Recommended)**
```bash
# Start Firebase emulators
npm run emulators

# In another terminal, start apps
npm run dev
```

**Benefits of Emulators:**
- No cloud costs during development
- Faster than real Firebase
- Offline development
- Easy data reset

### **Emulator UI**
Open http://localhost:4001 to see:
- Authentication users
- Firestore data
- Console logs
- Import/export data

---

## 📋 Common Development Tasks

### **Adding a New Component**
```bash
# Generate component in JustSplit
nx g @nx/react:component MyComponent --project=justsplit-app

# Generate shared component
nx g @nx/react:component SharedButton --project=ui-components
```

### **Adding a New Page**
```bash
# Create new page in JustSplit
mkdir apps/justsplit/src/app/my-page
touch apps/justsplit/src/app/my-page/page.tsx
```

### **Working with Types**
```bash
# Edit shared types
code libs/shared-types/src/index.ts

# Types are automatically available in all apps
```

---

## 🎯 Current Development Focus

### **🚨 Known Issues (Help Needed!)**
1. **JustSplit Runtime Errors**
   - Component prop type mismatches
   - useEffect dependency issues
   - Missing error boundaries

2. **Hub Development Needed**
   - Authentication forms
   - User dashboard
   - App navigation

3. **Cross-App Integration**
   - Token-based authentication
   - User session management

> 💡 **Perfect for new contributors!** These issues are well-documented and great for learning the codebase.

---

## 🤝 Making Your First Contribution

### **1. Pick an Issue**
```bash
# Look for "good first issue" labels
# Or check ROADMAP.md for current priorities
```

### **2. Create a Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-name
```

### **3. Make Changes**
```bash
# Edit code
# Run tests: npm run test
# Check style: npm run lint
```

### **4. Submit PR**
```bash
git add .
git commit -m "feat(justsplit): add new feature"
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

---

## 🆘 Troubleshooting

### **Port Already in Use**
```bash
# Kill processes on ports 3000/4000
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

### **Build Errors**
```bash
# Clear NX cache
npm run clean

# Fresh install
rm -rf node_modules package-lock.json
npm install
```

### **Firebase Issues**
```bash
# Login to Firebase
firebase login

# Clear emulator data
rm -rf emulator-data
```

### **TypeScript Errors**
```bash
# Check specific project
nx run justsplit-app:type-check
nx run hub:type-check
```

---

## 📚 Next Steps

### **Learn the Codebase**
1. **Read [ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand system design
2. **Check [ROADMAP.md](./ROADMAP.md)** - See what's coming next
3. **Browse existing code** - See patterns and conventions

### **Start Contributing**
1. **Fix current issues** - Help stabilize existing features
2. **Add tests** - Improve code coverage
3. **Improve documentation** - Help other developers

### **Get Involved**
1. **Join discussions** - Share ideas and feedback
2. **Report bugs** - Help improve quality
3. **Suggest features** - Shape the platform's future

---

## 💬 Getting Help

- **🐛 Found a bug?** Create an issue with reproduction steps
- **❓ Have questions?** Start a discussion or ask in issues
- **💡 Have ideas?** We love feature suggestions!
- **🤔 Confused about something?** Documentation improvements welcome!

---

> 🎯 **Goal**: Get you productive in 10 minutes, expert in a week!  
> 💪 **You've got this!** The community is here to help.