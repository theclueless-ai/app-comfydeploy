# Setup Guide

This guide will walk you through setting up the theclueless Workflow Studio app.

## Step 1: ComfyDeploy Account Setup

1. **Sign up for ComfyDeploy**
   - Visit [https://www.comfydeploy.com](https://www.comfydeploy.com)
   - Create an account or sign in

2. **Generate an API Key**
   - Go to Settings → API Keys
   - Click "Create new API key"
   - Give it a descriptive name (e.g., "theclueless app")
   - Copy the API key (you won't be able to see it again!)
   - Save it securely

## Step 2: Create Your Workflow

1. **Design in ComfyUI**
   - Create your workflow in ComfyUI
   - For this app, you need two input nodes:
     - `model_image` (for the model photo)
     - `product_image` (for the product photo)

2. **Add External Input Nodes**
   - Use ComfyDeploy's "External Input" nodes
   - These allow you to pass parameters via API
   - Connect them to your workflow

3. **Test Your Workflow**
   - Run it locally in ComfyUI
   - Verify it produces the expected output
   - Make sure the output is an image

## Step 3: Deploy to ComfyDeploy

1. **Upload Workflow**
   - In ComfyDeploy dashboard, click "New Deployment"
   - Upload your workflow JSON
   - Or connect your ComfyUI instance

2. **Configure Deployment**
   - Set a name (e.g., "Model Product Fusion")
   - Choose your machine type
   - Configure autoscaling if needed

3. **Get Deployment ID**
   - Once deployed, copy the Deployment ID
   - It will look like: `dep_xxxxxxxxxxxxx`

## Step 4: Environment Configuration

1. **Create .env file**
   ```bash
   cp .env.example .env
   ```

2. **Fill in the values**
   ```env
   # Your API key from Step 1
   COMFYDEPLOY_API_KEY=sk_xxxxxxxxxxxxx

   # ComfyDeploy API URL (usually this default)
   COMFYDEPLOY_SERVER_URL=https://www.comfydeploy.com/api

   # Your deployment ID from Step 3
   COMFYDEPLOY_DEPLOYMENT_ID=dep_xxxxxxxxxxxxx

   # Your app URL (for webhooks)
   # Local: http://localhost:3000
   # Production: https://your-domain.com
   WEBHOOK_BASE_URL=http://localhost:3000

   # Optional: Secret for webhook validation
   WEBHOOK_SECRET=your_random_secret_here
   ```

## Step 5: Install and Run

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Open the app**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You should see the upload interface

## Step 6: Test the App

1. **Upload images**
   - Upload a model image
   - Upload a product image

2. **Click "Generate"**
   - The workflow will start
   - You'll see "Processing..." status

3. **Wait for results**
   - Results typically take 30-60 seconds
   - The image will appear when complete

## Step 7: Production Deployment

### Using Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial setup"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Add environment variables (same as .env)
   - Deploy!

3. **Update Webhook URL**
   - After deployment, copy your Vercel URL
   - Update `WEBHOOK_BASE_URL` in Vercel environment variables
   - Redeploy

### Using Other Platforms

The app works on any platform supporting Next.js:

**Railway**:
```bash
railway login
railway init
railway up
```

**Render**:
- Connect your repository
- Choose "Web Service"
- Build command: `npm run build`
- Start command: `npm start`

**Docker**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### "Invalid API key" error
- Double-check your API key in .env
- Make sure there are no extra spaces
- Regenerate the key if needed

### "Deployment not found" error
- Verify the deployment ID is correct
- Check that the deployment is active in ComfyDeploy dashboard

### Webhooks not receiving results
- For local development, use ngrok or localtunnel:
  ```bash
  npx localtunnel --port 3000
  ```
- Update WEBHOOK_BASE_URL with the public URL
- For production, ensure your domain is accessible

### Images not uploading
- Check file size (max 10MB by default)
- Verify the file format (PNG, JPG, WEBP)
- Check browser console for errors

### Workflow stuck in "running"
- Check ComfyDeploy dashboard for errors
- Verify your machine has enough resources
- Check the workflow logs in ComfyDeploy

## Advanced Configuration

### Adding More Workflows

Edit `lib/workflows.ts`:

```typescript
export const workflows: WorkflowConfig[] = [
  // Existing workflow
  {
    id: "model-product-fusion",
    // ...
  },
  // Add new workflow
  {
    id: "style-transfer",
    name: "Style Transfer",
    description: "Apply artistic styles",
    deploymentId: process.env.ANOTHER_DEPLOYMENT_ID || "",
    inputs: [
      {
        id: "content_image",
        name: "content_image",
        type: "image",
        label: "Content Image",
        required: true,
      },
      {
        id: "style_image",
        name: "style_image",
        type: "image",
        label: "Style Image",
        required: true,
      },
    ],
  },
];
```

### Custom Styling

1. **Change brand colors** in `tailwind.config.ts`
2. **Modify fonts** in `app/layout.tsx`
3. **Update theme** in `app/globals.css`

### Database Integration

For production, replace in-memory storage with a database:

1. **Install Prisma** (or your preferred ORM)
   ```bash
   npm install @prisma/client
   ```

2. **Update webhook route** to save to database
3. **Update polling** to query database

## Need Help?

- **ComfyDeploy Docs**: [docs.comfydeploy.com](https://docs.comfydeploy.com/)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **GitHub Issues**: Create an issue in this repository

---

**Happy deploying! 🚀**
