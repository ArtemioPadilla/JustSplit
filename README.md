# CyberEco Platform

> 🌐 **A modular platform for digital lifestyle management**  
> Starting with expense splitting, expanding to productivity, health, education, and more.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=flat-square&logo=Firebase&logoColor=white)](https://firebase.google.com/)
[![NX](https://img.shields.io/badge/NX-143055?style=flat-square&logo=nx&logoColor=white)](https://nx.dev/)

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development
npm run dev

# 3. Open in browser
# Hub: http://localhost:3000
# JustSplit: http://localhost:4000
```

That's it! 🎉 You're now running the CyberEco platform locally.

## 🏗️ What is CyberEco?

CyberEco is a **platform** that hosts multiple lifestyle management applications:

- **🏠 Hub** - Central authentication and app launcher
- **💰 JustSplit** - Expense splitting and financial management
- **🚀 Future Apps** - TaskFlow, HealthTrack, LearnPath, TimeSync, DataVault

## 📁 Project Structure

```
cybereco-monorepo/
├── apps/
│   ├── hub/                 # 🏠 Authentication hub (port 3000)
│   └── justsplit/           # 💰 Expense splitting app (port 4000)
├── libs/
│   ├── shared-types/        # 📝 Common TypeScript types
│   ├── firebase-config/     # 🔥 Firebase utilities
│   └── ui-components/       # 🎨 Shared UI components
├── firebase/                # 🔥 Firebase configurations
└── docs/                    # 📚 Documentation
```

## 🚀 Development Commands

### Essential Commands
```bash
npm run dev              # Start all apps
npm run test             # Run all tests
npm run build            # Build all apps
npm run lint             # Check code quality
```

### App-Specific Commands
```bash
nx serve hub             # Start Hub only
nx serve justsplit-app   # Start JustSplit only
nx test hub              # Test Hub only
nx test justsplit-app    # Test JustSplit only
```

### Firebase Development
```bash
npm run emulators        # Start Firebase emulators
npm run hosting:justsplit # Test JustSplit with hosting emulator
npm run hosting:hub      # Test Hub with hosting emulator
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 + React 18 |
| **Language** | TypeScript |
| **Monorepo** | NX Workspace |
| **Backend** | Firebase (Auth, Firestore, Hosting) |
| **Styling** | CSS Modules |
| **Testing** | Jest + React Testing Library |

## 🎯 Current Status & Next Steps

### ✅ Completed
- [x] NX monorepo setup with proper configuration
- [x] Basic Hub and JustSplit applications structure
- [x] Shared libraries (types, Firebase config, UI components)
- [x] Firebase emulator integration
- [x] Development workflow and documentation

### 🔄 In Progress
- [ ] Fix JustSplit runtime errors and stabilize
- [ ] Implement Hub authentication functionality
- [ ] Set up cross-app authentication flow

### 📋 Next Priorities
1. **Fix JustSplit Issues** - Resolve runtime errors and component issues
2. **Hub Development** - Build core authentication features
3. **Firebase Setup** - Configure production environments
4. **Testing** - Increase test coverage to 70%+
5. **CI/CD** - Set up automated testing and deployment

> 📖 **See [ROADMAP.md](./docs/ROADMAP.md) for detailed next steps**

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 1. **Setup Development Environment**
```bash
git clone <repository-url>
cd cybereco-monorepo
npm install
npm run dev
```

### 2. **Make Changes**
```bash
git checkout -b feature/your-feature-name
# Make your changes
npm run test    # Ensure tests pass
npm run lint    # Check code quality
```

### 3. **Submit Changes**
```bash
git commit -m "feat(justsplit): add expense splitting feature"
git push origin feature/your-feature-name
# Create Pull Request
```

### 📋 Contribution Guidelines
- **Code Style**: Follow TypeScript strict mode and ESLint rules
- **Testing**: Write tests for new features (aim for 70% coverage)
- **Documentation**: Update docs for any architectural changes
- **Commits**: Use [conventional commits](https://conventionalcommits.org/)

## 🏗️ Architecture

### Monorepo Benefits
- **Shared Code**: Common types, utilities, and components
- **Fast Builds**: NX caching and incremental builds
- **Type Safety**: End-to-end TypeScript coverage
- **Independent Deployment**: Apps can be deployed separately

### Firebase Multi-Project Setup
- **Hub Firebase Project**: Handles all authentication
- **App Firebase Projects**: Handle app-specific data (JustSplit, future apps)
- **Emulator Support**: Full local development without cloud dependencies

## 📚 Documentation

### For Developers
- **[Getting Started](./docs/GETTING_STARTED.md)** - Detailed setup guide
- **[Development Guide](./docs/DEVELOPMENT.md)** - Daily development workflow
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and patterns
- **[Contributing](./docs/CONTRIBUTING.md)** - How to contribute effectively

### For Users
- **[JustSplit Features](./docs/JUSTSPLIT.md)** - Complete feature overview
- **[Deployment](./docs/DEPLOYMENT.md)** - How to deploy your own instance

## 🔮 Future Vision

CyberEco will expand into a comprehensive digital lifestyle platform:

| App | Purpose | Status |
|-----|---------|--------|
| **Hub** | Authentication & launcher | 🔄 In Development |
| **JustSplit** | Expense splitting | 🔄 Active Development |
| **TaskFlow** | Project management | 📋 Planned |
| **HealthTrack** | Fitness tracking | 📋 Planned |
| **LearnPath** | Education progress | 📋 Planned |
| **TimeSync** | Calendar management | 📋 Planned |
| **DataVault** | Personal data backup | 📋 Planned |

## 🆘 Need Help?

- **🐛 Found a bug?** Create an [issue](https://github.com/your-repo/issues)
- **💡 Have an idea?** Start a [discussion](https://github.com/your-repo/discussions)
- **📖 Documentation unclear?** Let us know in an issue
- **🤔 Need guidance?** Check our [Getting Started guide](./docs/GETTING_STARTED.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>🌟 Star this repo if you find it useful!</strong><br>
  <sub>Built with ❤️ for the open source community</sub>
</div>