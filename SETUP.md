# SupportGenius AI - Complete Setup Guide

This guide will walk you through setting up SupportGenius AI from scratch.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **npm or yarn** - Comes with Node.js
3. **Elasticsearch 8.x** - Options:
   - [Elastic Cloud](https://cloud.elastic.co/) (Recommended - 14-day free trial)
   - Local Elasticsearch installation
4. **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
5. **Git** - [Download here](https://git-scm.com/)

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/SupportGenius.git
cd SupportGenius
```

## Step 2: Set Up Elasticsearch

### Option A: Elastic Cloud (Recommended)

1. Go to [cloud.elastic.co](https://cloud.elastic.co/)
2. Create a free account (14-day trial, no credit card required)
3. Click "Create deployment"
4. Choose your cloud provider and region
5. Wait for deployment to complete (~5 minutes)
6. Save your credentials:
   - Cloud ID
   - Username (usually 'elastic')
   - Password
   - API Key (you can generate one in Kibana)

### Option B: Local Elasticsearch

```bash
# Download and extract Elasticsearch
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.12.0-linux-x86_64.tar.gz
tar -xzf elasticsearch-8.12.0-linux-x86_64.tar.gz
cd elasticsearch-8.12.0/

# Start Elasticsearch
./bin/elasticsearch
```

Save the security credentials printed in the terminal.

## Step 3: Install Dependencies

### Backend

```bash
cd backend
npm install
```

This will install:
- Express for API server
- Elasticsearch client
- TypeScript and related tools
- Winston for logging
- OpenAI SDK

### Frontend

```bash
cd ../frontend
npm install
```

This will install:
- React and React Router
- Vite for development
- TailwindCSS for styling
- Recharts for data visualization
- Axios for API calls

### Elasticsearch Scripts

```bash
cd ../elasticsearch
npm install
```

This will install:
- Elasticsearch client for scripts
- dotenv for environment variables

## Step 4: Configure Environment Variables

### Backend Configuration

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
# Elasticsearch Configuration
ELASTICSEARCH_URL=https://your-deployment-url.elastic.co:443
ELASTICSEARCH_API_KEY=your_api_key_here

# Or use username/password
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password_here

# Server Configuration
PORT=5000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4

# Agent Builder Configuration (if using Kibana)
AGENT_BUILDER_ENDPOINT=https://your-kibana-url.elastic.co/api/agent-builder

# Application Settings
LOG_LEVEL=info
MAX_CONCURRENT_TICKETS=10
AUTO_RESOLVE_THRESHOLD=0.85
```

### Frontend Configuration

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Step 5: Set Up Elasticsearch Indexes

### Create Indexes

```bash
cd ../elasticsearch
npm run setup
```

This will create 5 indexes:
- `support_tickets` - Historical ticket data
- `customer_profiles` - Customer information
- `product_catalog` - Product database
- `knowledge_base` - Support articles
- `resolution_actions` - Workflow templates

You should see output like:
```
🚀 Starting Elasticsearch index setup...

✅ Connected to Elasticsearch 8.12.0
   Cluster: elasticsearch

✅ Index "support_tickets" created successfully
✅ Index "customer_profiles" created successfully
✅ Index "product_catalog" created successfully
✅ Index "knowledge_base" created successfully
✅ Index "resolution_actions" created successfully

🎉 All indexes created successfully!
```

### Seed Demo Data

```bash
npm run seed
```

This will populate the indexes with:
- 200 customer profiles
- 100 products
- 50 knowledge base articles
- 20 resolution action templates
- 500 historical support tickets

You should see:
```
🌱 Starting data seeding...

📊 Generating mock data...
   - 200 customers
   - 100 products
   - 50 knowledge articles
   - 20 resolution actions
   - 500 support tickets

📤 Indexing data into Elasticsearch...

✅ Indexed 200 documents into customer_profiles
✅ Indexed 100 documents into product_catalog
✅ Indexed 50 documents into knowledge_base
✅ Indexed 20 documents into resolution_actions
✅ Indexed 500 documents into support_tickets

🎉 Data seeding completed successfully!
```

## Step 6: Start the Backend

Open a new terminal:

```bash
cd backend
npm run dev
```

You should see:
```
🚀 SupportGenius AI server running on port 5000
📊 Environment: development
🔍 Elasticsearch: https://your-deployment-url.elastic.co
```

Test the API:
```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-13T...",
  "elasticsearch": "connected"
}
```

## Step 7: Start the Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.1.0  ready in 523 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h to show help
```

## Step 8: Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the SupportGenius AI dashboard with:
- Real-time metrics
- Recent agent activity
- Tickets by category
- Navigation to Tickets, Agents, and Analytics pages

## Testing the System

### Submit a Test Ticket

1. Go to the **Tickets** page
2. Click **New Ticket**
3. Fill in the form:
   - Email: `test@example.com`
   - Subject: `Refund request for damaged item`
   - Description: `My order #12345 arrived damaged. Need full refund.`
   - Order ID: `ORD-12345`
4. Click **Submit Ticket**

### Watch Agent Processing

1. Go to the **Agents** page
2. See all 5 agents and their status
3. Monitor confidence levels and processing count

### View Metrics

1. Go to the **Dashboard**
2. See automation rate, resolution time, tickets resolved, and cost savings
3. View tickets by category chart
4. Check recent activity feed

## API Testing with cURL

### Health Check

```bash
curl http://localhost:5000/health
```

### Submit Ticket

```bash
curl -X POST http://localhost:5000/api/tickets/submit \
  -H "Content-Type: application/json" \
  -d '{
    "customer_email": "test@example.com",
    "subject": "Refund request",
    "description": "Item damaged on arrival",
    "order_id": "ORD-12345"
  }'
```

### Get Metrics

```bash
curl http://localhost:5000/api/metrics
```

### Get Agent Status

```bash
curl http://localhost:5000/api/agents/status
```

## Troubleshooting

### Elasticsearch Connection Issues

**Problem**: `Failed to connect to Elasticsearch`

**Solutions**:
1. Verify `ELASTICSEARCH_URL` is correct
2. Check API key or username/password
3. Ensure Elasticsearch is running
4. Check firewall rules if using local Elasticsearch

### Port Already in Use

**Problem**: `Port 5000 is already in use`

**Solution**:
```bash
# Change port in backend/.env
PORT=5001

# Or kill the process using port 5000
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows
```

### Missing Dependencies

**Problem**: Module not found errors

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### OpenAI API Errors

**Problem**: OpenAI API key not working

**Solutions**:
1. Verify API key is correct
2. Check you have credits available
3. Ensure API key has proper permissions

## Next Steps

Now that you have SupportGenius AI running:

1. **Customize Agents**: Edit files in `backend/src/agents/` to add custom logic
2. **Add Integrations**: Connect to real payment gateways, shipping APIs
3. **Customize UI**: Modify React components in `frontend/src/`
4. **Configure Workflows**: Create custom Elastic Workflows for your business
5. **Deploy**: Follow deployment guide for production setup

## Development Commands

### Backend

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Run compiled production build
npm run lint     # Lint TypeScript code
npm run format   # Format code with Prettier
```

### Frontend

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Lint code
```

### Elasticsearch

```bash
npm run setup    # Create indexes
npm run seed     # Seed demo data
npm run reset    # Drop and recreate everything
```

## Need Help?

- **Documentation**: Check README.md and HACKATHON_SUBMISSION.md
- **Issues**: [GitHub Issues](https://github.com/yourusername/SupportGenius/issues)
- **Email**: support@supportgenius.ai

---

**Congratulations! Your SupportGenius AI system is now ready to automate customer support! 🎉**
