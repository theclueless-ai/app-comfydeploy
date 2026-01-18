# 🚀 Deployment Guide - Vercel

This guide will help you deploy your ComfyDeploy app to Vercel.

## Prerequisites

- A GitHub account
- A Vercel account (free tier works perfectly)
- Your ComfyDeploy API key and Deployment ID
- This code pushed to a GitHub repository

---

## Step-by-Step Deployment

### 1. Push to GitHub

Make sure all your changes are committed and pushed:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings ✅
5. Click "Deploy"

**Option B: Via Vercel CLI**

```bash
npm i -g vercel
vercel
```

### 3. Configure Environment Variables

After deployment, add your environment variables:

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Environment Variables"
3. Add the following variables:

```bash
COMFYDEPLOY_API_KEY=your_api_key_here
COMFYDEPLOY_DEPLOYMENT_ID=your_deployment_id_here
WEBHOOK_BASE_URL=https://your-app.vercel.app
```

**Important:**
- `WEBHOOK_BASE_URL` should be your actual Vercel URL (e.g., `https://my-app.vercel.app`)
- After adding variables, redeploy: Settings → Deployments → Click "..." → Redeploy

### 4. Update ComfyDeploy Webhook Settings (Optional)

If you want to receive webhooks automatically:

1. Go to [ComfyDeploy Dashboard](https://www.comfydeploy.com)
2. Navigate to your deployment settings
3. Set webhook URL to: `https://your-app.vercel.app/api/webhook`

**Note:** The app works with or without webhooks. If webhooks fail, it falls back to polling.

---

## How It Works in Production

### Workflow Execution Flow

```
User uploads images
    ↓
Frontend → /api/run-workflow (converts to base64)
    ↓
ComfyDeploy API (processes workflow)
    ↓
    ├─→ Webhook POST to /api/webhook (instant notification)
    └─→ Polling GET every 3s (fallback)
    ↓
Frontend shows results
```

### Key Points

✅ **No WebSockets needed** - Uses HTTP webhooks + polling
✅ **Vercel Functions** - API routes run as serverless functions
✅ **Edge Compatible** - Works on Vercel's global network
✅ **Auto-scaling** - Handles traffic spikes automatically

---

## Vercel Configuration

Your `next.config.js` is already configured for Vercel:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Allows images from ComfyDeploy CDN
      },
    ],
  },
};

export default nextConfig;
```

---

## Custom Domain (Optional)

1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., `myapp.com`)
3. Follow Vercel's DNS instructions
4. Update `WEBHOOK_BASE_URL` to your custom domain

---

## Monitoring & Debugging

### View Logs

```bash
vercel logs [your-url]
```

Or in Dashboard → Deployments → Click deployment → "Logs"

### Common Issues

**Problem:** Environment variables not working
**Solution:** Redeploy after adding env vars

**Problem:** Images not loading
**Solution:** Check Next.js image domains in `next.config.js`

**Problem:** Webhook not receiving data
**Solution:** Check Vercel function logs, ensure URL is correct

---

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] `WEBHOOK_BASE_URL` points to production URL
- [ ] Custom domain configured (optional)
- [ ] ComfyDeploy webhook URL updated
- [ ] Test workflow execution end-to-end
- [ ] Check Vercel function logs for errors

---

## Limitations & Considerations

### Vercel Free Tier Limits

- ✅ Serverless function timeout: 10 seconds (enough for our API routes)
- ✅ Bandwidth: 100GB/month
- ✅ Function invocations: Unlimited on hobby plan

### In-Memory Storage

⚠️ **Important:** The webhook results are stored in memory (`webhookResults` Map). On Vercel, each function invocation may run on a different instance.

**For Production:** Consider using:
- Vercel KV (Redis)
- Upstash Redis
- Database (PostgreSQL, MongoDB)

Current implementation works for:
- ✅ Low-medium traffic
- ✅ Short-lived results (1 hour TTL)
- ⚠️ May miss webhooks on high traffic (use polling fallback)

---

## Upgrading to Persistent Storage (Optional)

If you need reliable webhook storage, integrate Vercel KV:

```bash
npm install @vercel/kv
```

Update `/app/api/webhook/route.ts`:

```typescript
import { kv } from '@vercel/kv';

// Instead of Map
await kv.set(`webhook:${payload.run_id}`, normalizedResult, { ex: 3600 });
```

---

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- ComfyDeploy Docs: https://docs.comfydeploy.com

---

## Quick Deploy Button (Optional)

Add this to your README for one-click deployment:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)
```
