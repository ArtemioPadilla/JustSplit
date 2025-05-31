# Low-Cost Optimization Guide

This guide provides strategies to minimize operational costs while running JustSplit, whether on Firebase or self-hosted infrastructure.

## Cost Analysis

### Firebase Costs (Free Tier Limits)
- **Firestore**: 1GB storage, 50K reads, 20K writes, 20K deletes per day
- **Authentication**: Unlimited email/password, 10K SMS verifications/month
- **Hosting**: 10GB storage, 360MB/day bandwidth
- **Cloud Functions**: 2M invocations, 400K GB-seconds, 200K CPU-seconds per month

### Self-Hosting Costs
- **VPS**: $5-20/month (DigitalOcean, Linode, Vultr)
- **Domain**: $10-15/year
- **SSL**: Free with Let's Encrypt
- **Backup Storage**: $5/month for 100GB

## Firebase Optimization Strategies

### 1. Firestore Optimization

#### Efficient Data Structure
```typescript
// ❌ Bad: Nested data requiring multiple reads
interface User {
  id: string;
  expenses: Expense[]; // Large array
  settlements: Settlement[]; // Another large array
}

// ✅ Good: Flat structure with references
interface User {
  id: string;
  name: string;
  email: string;
}

// Separate collections with indexes
interface Expense {
  id: string;
  userId: string; // Reference
  amount: number;
}
```

#### Query Optimization
```typescript
// ❌ Bad: Reading all documents
const allExpenses = await getDocs(collection(db, 'expenses'));

// ✅ Good: Filtered and paginated queries
const userExpenses = await getDocs(
  query(
    collection(db, 'expenses'),
    where('userId', '==', userId),
    where('date', '>=', startDate),
    orderBy('date', 'desc'),
    limit(20)
  )
);
```

#### Implement Caching
```typescript
// Local cache for frequently accessed data
class FirestoreCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  async get(key: string, fetcher: () => Promise<any>) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 2. Batch Operations

```typescript
// ❌ Bad: Individual writes
for (const expense of expenses) {
  await setDoc(doc(db, 'expenses', expense.id), expense);
}

// ✅ Good: Batch writes (max 500 operations)
const batch = writeBatch(db);
expenses.forEach(expense => {
  batch.set(doc(db, 'expenses', expense.id), expense);
});
await batch.commit();
```

### 3. Offline Persistence

```typescript
// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.log('Browser doesn\'t support offline');
  }
});
```

### 4. Optimize Cloud Functions

```typescript
// ❌ Bad: Cold starts and unnecessary executions
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  // Heavy initialization here
  await sendWelcomeEmail(user.email);
});

// ✅ Good: Lightweight and conditional
let emailClient: EmailClient;

export const onUserCreate = functions
  .runWith({ memory: '256MB' }) // Minimum memory
  .auth.user().onCreate(async (user) => {
    if (!user.email) return; // Skip if no email
    
    // Lazy initialization
    if (!emailClient) {
      emailClient = new EmailClient();
    }
    
    await emailClient.sendWelcome(user.email);
  });
```

## Storage Optimization

### 1. Image Optimization

```typescript
// Compress images before upload
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target!.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Max dimensions
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.8); // 80% quality
      };
    };
  });
}
```

### 2. Data Cleanup

```typescript
// Scheduled function to clean old data
export const cleanupOldData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 6 months old
    
    // Delete old completed expenses
    const oldExpenses = await getDocs(
      query(
        collection(db, 'expenses'),
        where('settled', '==', true),
        where('date', '<', cutoffDate)
      )
    );
    
    const batch = writeBatch(db);
    oldExpenses.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

## Network Optimization

### 1. Minimize Bundle Size

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Replace large libraries with smaller alternatives
      config.resolve.alias = {
        ...config.resolve.alias,
        'moment': 'dayjs',
        'lodash': 'lodash-es'
      };
    }
    return config;
  },
  
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  }
};
```

### 2. Implement Service Worker

```javascript
// public/sw.js
const CACHE_NAME = 'justsplit-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

## Monitoring and Alerts

### 1. Usage Monitoring

```typescript
// Monitor Firestore usage
export const monitorUsage = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const usage = await getProjectUsage(); // Custom implementation
    
    const limits = {
      reads: 50000 * 0.8, // 80% of daily limit
      writes: 20000 * 0.8,
      storage: 1024 * 1024 * 1024 * 0.8 // 80% of 1GB
    };
    
    if (usage.reads > limits.reads) {
      await sendAlert('Approaching Firestore read limit');
    }
    
    if (usage.writes > limits.writes) {
      await sendAlert('Approaching Firestore write limit');
    }
    
    if (usage.storage > limits.storage) {
      await sendAlert('Approaching storage limit');
    }
  });
```

### 2. Cost Tracking Dashboard

```typescript
// pages/admin/costs.tsx
export default function CostDashboard() {
  const [metrics, setMetrics] = useState({
    dailyReads: 0,
    dailyWrites: 0,
    storageUsed: 0,
    bandwidth: 0
  });

  return (
    <div>
      <h2>Firebase Usage</h2>
      <div>
        <p>Reads: {metrics.dailyReads} / 50,000 ({(metrics.dailyReads / 50000 * 100).toFixed(1)}%)</p>
        <p>Writes: {metrics.dailyWrites} / 20,000 ({(metrics.dailyWrites / 20000 * 100).toFixed(1)}%)</p>
        <p>Storage: {(metrics.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB / 1 GB</p>
        <p>Bandwidth: {(metrics.bandwidth / 1024 / 1024).toFixed(2)} MB / 360 MB</p>
      </div>
    </div>
  );
}
```

## Self-Hosting Cost Optimization

### 1. Choose the Right VPS

| Provider | RAM | CPU | Storage | Bandwidth | Price/month |
|----------|-----|-----|---------|-----------|-------------|
| DigitalOcean | 1GB | 1 vCPU | 25GB | 1TB | $6 |
| Linode | 1GB | 1 vCPU | 25GB | 1TB | $5 |
| Vultr | 1GB | 1 vCPU | 25GB | 2TB | $6 |
| Hetzner | 2GB | 1 vCPU | 20GB | 20TB | €3.79 |

### 2. Optimize Resource Usage

```yaml
# docker-compose.yml with resource limits
services:
  app:
    image: justsplit-app
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 3. Use CDN for Static Assets

- Cloudflare (Free tier)
- BunnyCDN ($0.01/GB)
- jsDelivr (Free for open source)

### 4. Database Optimization

```sql
-- Create proper indexes
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_settlements_status ON settlements(status) WHERE status = 'pending';

-- Regular maintenance
VACUUM ANALYZE expenses;
REINDEX TABLE expenses;
```

## Cost Comparison

### Monthly Cost Estimates

| Setup | Users | Storage | Requests | Cost/month |
|-------|-------|---------|----------|------------|
| Firebase Free | <100 | <1GB | <1.5M | $0 |
| Firebase Paid | 1000 | 10GB | 15M | ~$25 |
| VPS Small | 500 | 25GB | Unlimited | $5-10 |
| VPS Medium | 5000 | 100GB | Unlimited | $20-40 |

## Best Practices Summary

1. **Always paginate queries** - Never load all data at once
2. **Cache aggressively** - Both client and server side
3. **Optimize images** - Compress and use modern formats
4. **Monitor usage** - Set up alerts before hitting limits
5. **Clean up old data** - Implement data retention policies
6. **Use batch operations** - Reduce write operations
7. **Enable offline mode** - Reduce redundant reads
8. **Choose the right hosting** - Firebase for <100 users, VPS for more