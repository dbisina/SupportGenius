const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const client = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: process.env.ELASTICSEARCH_API_KEY
    ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
    : {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      },
});

const INDEXES = [
  'support_tickets',
  'customer_profiles',
  'product_catalog',
  'knowledge_base',
  'resolution_actions',
  'pipeline_traces',
];

async function setupIndexes() {
  console.log('🚀 Starting Elasticsearch index setup...\n');

  for (const indexName of INDEXES) {
    try {
      // Check if index exists
      const exists = await client.indices.exists({ index: indexName });

      if (exists) {
        console.log(`⚠️  Index "${indexName}" already exists. Deleting...`);
        await client.indices.delete({ index: indexName });
      }

      // Read mapping file
      const mappingPath = path.join(__dirname, '../mappings', `${indexName}.json`);
      const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

      // Create index with mapping
      await client.indices.create({
        index: indexName,
        body: mapping,
      });

      console.log(`✅ Index "${indexName}" created successfully`);
    } catch (error) {
      console.error(`❌ Error creating index "${indexName}":`, error.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 All indexes created successfully!');
  console.log('\n📊 Next step: Run "node elasticsearch/scripts/seed-data.js" to populate with data');
}

// Test Elasticsearch connection
async function testConnection() {
  try {
    const info = await client.info();
    console.log(`✅ Connected to Elasticsearch ${info.version.number}`);
    console.log(`   Cluster: ${info.cluster_name}\n`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Elasticsearch:', error.message);
    console.error('\n💡 Make sure to:');
    console.error('   1. Set ELASTICSEARCH_URL in backend/.env');
    console.error('   2. Set ELASTICSEARCH_API_KEY or USERNAME/PASSWORD');
    console.error('   3. Elasticsearch cluster is running and accessible\n');
    process.exit(1);
  }
}

async function main() {
  await testConnection();
  await setupIndexes();
}

main().catch(console.error);
