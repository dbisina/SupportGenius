const { Client } = require('@elastic/elasticsearch');
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

// Mock data generators
function generateCustomers(count = 200) {
  const customers = [];
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const totalOrders = Math.floor(Math.random() * 50) + 1;
    const avgOrderValue = Math.random() * 200 + 50;

    customers.push({
      customer_id: `CUST-${String(i + 1).padStart(6, '0')}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      name: `${firstName} ${lastName}`,
      lifetime_value: totalOrders * avgOrderValue,
      total_orders: totalOrders,
      total_returns: Math.floor(Math.random() * 5),
      avg_order_value: avgOrderValue,
      last_order_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      support_tickets_count: Math.floor(Math.random() * 10),
      vip_status: Math.random() > 0.9,
      order_history: generateOrderHistory(totalOrders),
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
  }
  return customers;
}

function generateOrderHistory(count) {
  const orders = [];
  const statuses = ['delivered', 'shipped', 'processing', 'cancelled', 'returned'];

  for (let i = 0; i < Math.min(count, 10); i++) {
    orders.push({
      order_id: `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      total: Math.random() * 300 + 20,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }
  return orders;
}

function generateProducts(count = 100) {
  const products = [];
  const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Sports', 'Books', 'Toys'];
  const productNames = [
    'Wireless Headphones',
    'Smart Watch',
    'Laptop',
    'T-Shirt',
    'Jeans',
    'Coffee Maker',
    'Yoga Mat',
    'Novel',
    'Board Game',
  ];

  for (let i = 0; i < count; i++) {
    const name = productNames[Math.floor(Math.random() * productNames.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];

    products.push({
      product_id: `PROD-${String(i + 1).padStart(6, '0')}`,
      name: `${name} ${i + 1}`,
      category,
      description: `High-quality ${name.toLowerCase()} for everyday use`,
      price: Math.random() * 500 + 20,
      common_issues: ['Defective', 'Not as described', 'Sizing issue', 'Shipping damage'][
        Math.floor(Math.random() * 4)
      ],
      return_policy_days: [30, 60, 90][Math.floor(Math.random() * 3)],
      warranty_months: [0, 12, 24][Math.floor(Math.random() * 3)],
      defect_rate: Math.random() * 0.05,
      tags: [category.toLowerCase(), 'popular', 'trending'],
      in_stock: Math.random() > 0.1,
      stock_quantity: Math.floor(Math.random() * 1000),
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
  }
  return products;
}

function generateKnowledgeArticles(count = 50) {
  const articles = [];
  const categories = ['Refund Policy', 'Shipping', 'Returns', 'Product Issues', 'Account'];
  const titles = [
    'How to request a refund',
    'Shipping times and tracking',
    'Return policy guidelines',
    'Troubleshooting common issues',
    'Account management tips',
  ];

  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];

    articles.push({
      article_id: `KB-${String(i + 1).padStart(6, '0')}`,
      title: `${title} - Version ${i + 1}`,
      content: `Detailed information about ${title.toLowerCase()}. This article provides step-by-step instructions and best practices.`,
      category,
      tags: [category.toLowerCase().replace(' ', '-'), 'help', 'guide'],
      helpful_count: Math.floor(Math.random() * 500),
      view_count: Math.floor(Math.random() * 5000),
      author: 'Support Team',
      published: true,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      last_updated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }
  return articles;
}

function generateResolutionActions(count = 20) {
  const actions = [];
  const actionTypes = ['refund', 'exchange', 'shipping_label', 'escalate', 'email_notification'];
  const actionNames = [
    'Full Refund',
    'Partial Refund',
    'Product Exchange',
    'Return Label',
    'Escalate to Manager',
    'Send Apology Email',
  ];

  for (let i = 0; i < count; i++) {
    const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const actionName = actionNames[Math.floor(Math.random() * actionNames.length)];

    actions.push({
      action_id: `ACT-${String(i + 1).padStart(6, '0')}`,
      action_type: actionType,
      action_name: `${actionName} - ${i + 1}`,
      description: `Automated workflow for ${actionName.toLowerCase()}`,
      workflow_template: {
        steps: ['validate', 'execute', 'notify'],
        timeout: 300,
      },
      success_rate: 0.85 + Math.random() * 0.14,
      avg_execution_time: Math.floor(Math.random() * 120) + 10,
      total_executions: Math.floor(Math.random() * 1000),
      conditions: `category == "${actionType}" AND confidence > 0.8`,
      parameters: {
        requires_manager_approval: Math.random() > 0.7,
      },
      requires_approval: Math.random() > 0.7,
      category: actionType,
      enabled: true,
      created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
  }
  return actions;
}

function generateSupportTickets(count = 500, customers) {
  const tickets = [];
  const categories = ['refund', 'shipping', 'product_issue', 'account', 'other'];
  const priorities = ['urgent', 'high', 'medium', 'low'];
  const statuses = ['resolved', 'processing', 'escalated'];
  const subjects = [
    'Refund request for order',
    'Item not delivered',
    'Product arrived damaged',
    'Wrong item shipped',
    'Account login issue',
    'Tracking number not working',
  ];

  for (let i = 0; i < count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const automated = Math.random() > 0.15; // 85% automation rate

    const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    const resolutionTime = status === 'resolved' ? Math.floor(Math.random() * 240) + 5 : null;
    const resolvedAt =
      status === 'resolved' ? new Date(createdAt.getTime() + resolutionTime * 60 * 1000) : null;

    tickets.push({
      ticket_id: `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      customer_id: customer.customer_id,
      order_id:
        customer.order_history.length > 0
          ? customer.order_history[0].order_id
          : `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      subject: `${subjects[Math.floor(Math.random() * subjects.length)]} #${i + 1}`,
      description: `Customer reported issue with their order. ${
        category === 'refund' ? 'Requesting full refund.' : 'Needs assistance.'
      }`,
      category,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status,
      resolution:
        status === 'resolved'
          ? `Issue resolved through ${automated ? 'automated' : 'manual'} process. ${
              category === 'refund' ? 'Refund processed.' : 'Customer satisfied.'
            }`
          : null,
      resolution_time_minutes: resolutionTime,
      automated,
      agent_confidence: automated ? 0.8 + Math.random() * 0.19 : 0.5 + Math.random() * 0.3,
      created_at: createdAt,
      resolved_at: resolvedAt,
      metadata: {
        ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0',
      },
    });
  }
  return tickets;
}

async function bulkIndex(indexName, data) {
  const body = data.flatMap((doc) => [{ index: { _index: indexName } }, doc]);

  const { errors, items } = await client.bulk({ refresh: true, body });

  if (errors) {
    const erroredDocuments = [];
    items.forEach((action, i) => {
      const operation = Object.keys(action)[0];
      if (action[operation].error) {
        erroredDocuments.push({
          status: action[operation].status,
          error: action[operation].error,
          document: data[i],
        });
      }
    });
    console.error(`❌ ${erroredDocuments.length} documents failed to index`);
    console.error(JSON.stringify(erroredDocuments[0], null, 2));
  } else {
    console.log(`✅ Indexed ${data.length} documents into ${indexName}`);
  }
}

async function seedData() {
  console.log('🌱 Starting data seeding...\n');

  try {
    // Generate data
    console.log('📊 Generating mock data...');
    const customers = generateCustomers(200);
    const products = generateProducts(100);
    const articles = generateKnowledgeArticles(50);
    const actions = generateResolutionActions(20);
    const tickets = generateSupportTickets(500, customers);

    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${articles.length} knowledge articles`);
    console.log(`   - ${actions.length} resolution actions`);
    console.log(`   - ${tickets.length} support tickets\n`);

    // Index data
    console.log('📤 Indexing data into Elasticsearch...\n');
    await bulkIndex('customer_profiles', customers);
    await bulkIndex('product_catalog', products);
    await bulkIndex('knowledge_base', articles);
    await bulkIndex('resolution_actions', actions);
    await bulkIndex('support_tickets', tickets);

    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total documents indexed: ${customers.length + products.length + articles.length + actions.length + tickets.length}`);
    console.log('\n✨ Your SupportGenius AI system is ready to use!');
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

async function main() {
  await seedData();
}

main().catch(console.error);
