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

// ─── Realistic Customer Data ───

const CUSTOMER_PERSONAS = [
  { first: 'Marcus', last: 'Chen', vip: true, ltv: 12500, orders: 47, returns: 1, avgOrder: 265 },
  { first: 'Sarah', last: 'Mitchell', vip: true, ltv: 8900, orders: 34, returns: 2, avgOrder: 261 },
  { first: 'Priya', last: 'Patel', vip: true, ltv: 15200, orders: 62, returns: 0, avgOrder: 245 },
  { first: 'James', last: 'Rodriguez', vip: false, ltv: 3200, orders: 18, returns: 3, avgOrder: 177 },
  { first: 'Emily', last: 'Thompson', vip: false, ltv: 1850, orders: 12, returns: 1, avgOrder: 154 },
  { first: 'David', last: 'Kim', vip: false, ltv: 920, orders: 6, returns: 2, avgOrder: 153 },
  { first: 'Olivia', last: 'Nakamura', vip: true, ltv: 22000, orders: 89, returns: 1, avgOrder: 247 },
  { first: 'Robert', last: 'Williams', vip: false, ltv: 450, orders: 3, returns: 1, avgOrder: 150 },
  { first: 'Aisha', last: 'Johnson', vip: false, ltv: 2100, orders: 14, returns: 0, avgOrder: 150 },
  { first: 'Michael', last: 'O\'Brien', vip: false, ltv: 1500, orders: 8, returns: 4, avgOrder: 187 },
  { first: 'Sofia', last: 'Andersson', vip: true, ltv: 9800, orders: 41, returns: 2, avgOrder: 239 },
  { first: 'Daniel', last: 'Garcia', vip: false, ltv: 680, orders: 4, returns: 0, avgOrder: 170 },
  { first: 'Luna', last: 'Park', vip: false, ltv: 3900, orders: 22, returns: 1, avgOrder: 177 },
  { first: 'Thomas', last: 'Brown', vip: false, ltv: 1200, orders: 7, returns: 2, avgOrder: 171 },
  { first: 'Rachel', last: 'Goldberg', vip: true, ltv: 11400, orders: 52, returns: 1, avgOrder: 219 },
  { first: 'Kevin', last: 'Murphy', vip: false, ltv: 550, orders: 3, returns: 3, avgOrder: 183 },
  { first: 'Hannah', last: 'Lee', vip: false, ltv: 2800, orders: 16, returns: 0, avgOrder: 175 },
  { first: 'Carlos', last: 'Rivera', vip: false, ltv: 780, orders: 5, returns: 1, avgOrder: 156 },
  { first: 'Jessica', last: 'Taylor', vip: false, ltv: 4200, orders: 24, returns: 2, avgOrder: 175 },
  { first: 'Brandon', last: 'Wilson', vip: false, ltv: 320, orders: 2, returns: 1, avgOrder: 160 },
];

function generateCustomers(count = 200) {
  const customers = [];
  for (let i = 0; i < count; i++) {
    const persona = CUSTOMER_PERSONAS[i % CUSTOMER_PERSONAS.length];
    const suffix = Math.floor(i / CUSTOMER_PERSONAS.length);
    const name = suffix === 0 ? `${persona.first} ${persona.last}` : `${persona.first} ${persona.last} ${suffix > 0 ? String.fromCharCode(65 + (suffix % 26)) : ''}`.trim();

    const totalOrders = Math.max(1, persona.orders + Math.floor((Math.random() - 0.5) * 6));
    const avgOrderValue = persona.avgOrder + (Math.random() - 0.5) * 40;
    const ltv = persona.ltv + Math.floor((Math.random() - 0.5) * persona.ltv * 0.2);

    customers.push({
      customer_id: `CUST-${String(i + 1).padStart(6, '0')}`,
      email: `${persona.first.toLowerCase()}.${persona.last.toLowerCase().replace("'", '')}${i > 19 ? i : ''}@${['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'proton.me'][i % 5]}`,
      name,
      lifetime_value: ltv,
      total_orders: totalOrders,
      total_returns: persona.returns + (Math.random() > 0.7 ? 1 : 0),
      avg_order_value: Math.round(avgOrderValue * 100) / 100,
      last_order_date: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000),
      support_tickets_count: Math.floor(Math.random() * 8),
      vip_status: persona.vip || (ltv > 10000),
      order_history: generateOrderHistory(totalOrders, i),
      created_at: new Date(Date.now() - (365 + Math.random() * 730) * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
  }
  return customers;
}

function generateOrderHistory(count, seed) {
  const orders = [];
  const productSamples = [
    { name: 'ProMax Wireless Headphones', price: 189.99 },
    { name: 'UltraFit Running Shoes', price: 129.95 },
    { name: 'ChefPro Espresso Machine', price: 449.00 },
    { name: 'CloudSleep Memory Foam Pillow', price: 79.99 },
    { name: 'TechGuard Laptop Sleeve 15"', price: 49.99 },
    { name: 'AquaPure Water Bottle 32oz', price: 34.95 },
    { name: 'FlexPower Resistance Band Set', price: 24.99 },
    { name: 'SmartHome LED Bulb 4-Pack', price: 39.99 },
    { name: 'OrganicBlend Coffee Beans 2lb', price: 28.50 },
    { name: 'Adventure Series Backpack 40L', price: 159.00 },
  ];

  for (let i = 0; i < Math.min(count, 10); i++) {
    const product = productSamples[(seed + i) % productSamples.length];
    const qty = Math.floor(Math.random() * 3) + 1;
    const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'processing', 'cancelled', 'returned'];
    orders.push({
      order_id: `ORD-${String(seed * 100 + i + 1000).padStart(6, '0')}`,
      date: new Date(Date.now() - (i * 15 + Math.random() * 30) * 24 * 60 * 60 * 1000),
      total: Math.round(product.price * qty * 100) / 100,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      items: [{ product_id: `PROD-${String((seed + i) % 100 + 1).padStart(6, '0')}`, name: product.name, quantity: qty, price: product.price }],
    });
  }
  return orders;
}

// ─── Realistic Product Catalog ───

const PRODUCTS = [
  { name: 'ProMax Wireless Headphones', category: 'Electronics', price: 189.99, desc: 'Premium noise-cancelling Bluetooth headphones with 40-hour battery life, ANC 3.0, and memory foam ear cushions. Supports aptX HD and LDAC codecs for studio-quality audio.', issues: ['Bluetooth connectivity drops after firmware update', 'Left ear cup produces static at high volume', 'ANC microphone stops working in cold weather', 'Ear cushion detaching after 6 months'], returnDays: 30, warranty: 24, defect: 0.032 },
  { name: 'UltraFit Running Shoes', category: 'Clothing', price: 129.95, desc: 'Lightweight carbon-plate running shoes with responsive ZoomX foam, breathable Flyknit upper, and reflective accents. Available in sizes 6-15 M/W.', issues: ['Sole separation at toe box after 200 miles', 'Size runs half-size small', 'Carbon plate cracking on hard surfaces', 'Color bleeds when wet'], returnDays: 60, warranty: 6, defect: 0.045 },
  { name: 'ChefPro Espresso Machine', category: 'Home & Kitchen', price: 449.00, desc: 'Semi-automatic espresso machine with 15-bar pressure pump, PID temperature control, integrated grinder with 30 settings, and steam wand for latte art. 58mm commercial portafilter.', issues: ['Grinder jams with oily dark roast beans', 'Steam wand leaks after descaling', 'PID display shows incorrect temperature', 'Water tank seal degrading after 1 year'], returnDays: 30, warranty: 24, defect: 0.028 },
  { name: 'CloudSleep Memory Foam Pillow', category: 'Home & Kitchen', price: 79.99, desc: 'Gel-infused memory foam pillow with adjustable loft. CertiPUR-US certified, hypoallergenic bamboo-derived rayon cover. Contoured design for side and back sleepers.', issues: ['Chemical smell persists beyond 72 hours off-gassing', 'Memory foam loses shape after 3 months', 'Cover zipper breaks during washing', 'Gel layer separating from foam core'], returnDays: 90, warranty: 12, defect: 0.015 },
  { name: 'TechGuard Laptop Sleeve 15"', category: 'Electronics', price: 49.99, desc: 'Shockproof neoprene laptop sleeve with military-grade drop protection, water-resistant YKK zippers, and accessory pocket. Fits 14.5" to 15.6" laptops.', issues: ['Zipper teeth misaligning after repeated use', 'Water seeps through stitching in heavy rain', 'Interior lining pilling and scratching laptop'], returnDays: 30, warranty: 12, defect: 0.012 },
  { name: 'AquaPure Water Bottle 32oz', category: 'Sports', price: 34.95, desc: 'Triple-insulated stainless steel water bottle. Keeps drinks cold 24 hours / hot 12 hours. BPA-free sport cap with one-hand operation. Powder-coated finish.', issues: ['Lid seal deteriorates causing leaks', 'Dent in bottle upon delivery', 'Powder coating chipping at bottom edge', 'Metallic taste not going away after washing'], returnDays: 30, warranty: 12, defect: 0.022 },
  { name: 'FlexPower Resistance Band Set', category: 'Sports', price: 24.99, desc: '5-piece resistance band set (10-50 lbs) with door anchor, ankle straps, and carrying bag. Natural latex construction with reinforced connection points.', issues: ['Band snapped during use causing injury', 'Carabiner clip breaking under load', 'Door anchor foam padding tearing', 'Resistance levels not matching labeled weight'], returnDays: 60, warranty: 6, defect: 0.038 },
  { name: 'SmartHome LED Bulb 4-Pack', category: 'Electronics', price: 39.99, desc: 'WiFi-enabled color-changing LED bulbs (16M colors, 2700K-6500K white). Works with Alexa, Google Home, and HomeKit. 800 lumens, 9W, A19 base. No hub required.', issues: ['Bulbs losing WiFi connection randomly', 'Color accuracy drift after firmware update', 'Flickering when dimmed below 20%', 'Not connecting to 5GHz networks'], returnDays: 30, warranty: 24, defect: 0.025 },
  { name: 'OrganicBlend Coffee Beans 2lb', category: 'Home & Kitchen', price: 28.50, desc: 'Single-origin Ethiopian Yirgacheffe beans, medium roast. Fair Trade & USDA Organic certified. Tasting notes: blueberry, dark chocolate, citrus. Roasted within 48 hours of shipping.', issues: ['Beans arrived stale/past roast date', 'Bag vacuum seal broken during shipping', 'Inconsistent roast level between batches', 'Foreign object found in bag'], returnDays: 30, warranty: 0, defect: 0.008 },
  { name: 'Adventure Series Backpack 40L', category: 'Sports', price: 159.00, desc: 'Waterproof hiking backpack with aluminum frame, ventilated back panel, rain cover, and hydration reservoir pocket. 40L capacity with compression straps and multiple attachment points.', issues: ['Shoulder strap buckle cracking under load', 'Waterproof coating peeling after sun exposure', 'Zippers corroding on saltwater trips', 'Hip belt padding insufficient for loads over 25 lbs'], returnDays: 60, warranty: 12, defect: 0.019 },
  { name: 'NovaPro 4K Monitor 27"', category: 'Electronics', price: 549.99, desc: '27-inch 4K IPS monitor with HDR600, 144Hz refresh rate, 1ms response time. USB-C 90W power delivery, built-in KVM switch. Factory calibrated Delta E < 2.', issues: ['Dead pixels appearing after 2 months', 'USB-C not delivering full 90W charge', 'Backlight bleed in corners', 'Firmware update bricking OSD controls'], returnDays: 30, warranty: 36, defect: 0.021 },
  { name: 'ZenMat Pro Yoga Mat', category: 'Sports', price: 89.00, desc: '6mm thick natural rubber yoga mat with alignment markers, moisture-wicking microfiber surface, and carrying strap. Non-toxic, biodegradable, free of PVC and latex.', issues: ['Mat surface becoming slippery when sweaty', 'Strong rubber smell persisting weeks', 'Alignment markers fading after cleaning', 'Edges curling up and not laying flat'], returnDays: 60, warranty: 6, defect: 0.014 },
  { name: 'PureAir HEPA Purifier', category: 'Home & Kitchen', price: 279.99, desc: 'True HEPA H13 air purifier for rooms up to 800 sq ft. 3-stage filtration (pre-filter, HEPA, activated carbon). Real-time PM2.5 display, auto mode, whisper-quiet 24dB sleep mode.', issues: ['Filter replacement indicator activating too early', 'PM2.5 sensor giving inaccurate readings', 'Auto mode fan speed fluctuating constantly', 'Rattling noise at highest fan speed'], returnDays: 30, warranty: 24, defect: 0.018 },
  { name: 'SwiftCharge Power Bank 20K', category: 'Electronics', price: 59.99, desc: '20,000mAh portable charger with 65W USB-C PD output, dual USB-A QC3.0 ports, and pass-through charging. LED display shows exact battery percentage. TSA airline approved.', issues: ['Not delivering advertised 65W output', 'Battery percentage display inaccurate', 'USB-C port loosening over time', 'Overheating during fast charge in warm environments'], returnDays: 30, warranty: 18, defect: 0.029 },
  { name: 'ComfortKnit Throw Blanket', category: 'Home & Kitchen', price: 64.99, desc: 'Oversized 60x80" chenille knit throw blanket. Machine washable, fade-resistant. Hypoallergenic polyester with cotton-blend edging. Available in 12 colors.', issues: ['Excessive shedding/pilling after first wash', 'Color significantly different from website photo', 'Shrinkage beyond stated 5% tolerance', 'Unraveling at knit edges'], returnDays: 30, warranty: 0, defect: 0.011 },
];

function generateProducts(count = 100) {
  const products = [];
  for (let i = 0; i < count; i++) {
    const base = PRODUCTS[i % PRODUCTS.length];
    const variant = Math.floor(i / PRODUCTS.length);
    const priceVariance = 1 + (Math.random() - 0.5) * 0.15;
    products.push({
      product_id: `PROD-${String(i + 1).padStart(6, '0')}`,
      name: variant === 0 ? base.name : `${base.name} V${variant + 1}`,
      category: base.category,
      description: base.desc,
      price: Math.round(base.price * priceVariance * 100) / 100,
      common_issues: base.issues,
      return_policy_days: base.returnDays,
      warranty_months: base.warranty,
      defect_rate: base.defect + (Math.random() - 0.5) * 0.01,
      tags: [base.category.toLowerCase().replace(/ & /g, '-'), 'popular'],
      in_stock: Math.random() > 0.08,
      stock_quantity: Math.floor(Math.random() * 500) + 10,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
  }
  return products;
}

// ─── Detailed Knowledge Base ───

const KB_ARTICLES = [
  {
    title: 'Refund Policy — Full & Partial Refunds',
    category: 'refund_policy',
    content: `REFUND ELIGIBILITY: All purchases are eligible for a full refund within 30 days of delivery for most products (60 days for Clothing, 90 days for Home & Kitchen sleep products). The item must be in original packaging and unused condition.\n\nFULL REFUND PROCESS: Customers receive a prepaid return label via email. Once the returned item is received and inspected (1-3 business days), the refund is processed to the original payment method. Credit card refunds take 5-10 business days to appear.\n\nPARTIAL REFUND: Items returned with minor damage, missing accessories, or outside the standard window (but within 60 days) may qualify for a partial refund of 50-80% of the purchase price. The partial amount is determined by our quality inspection team.\n\nNON-REFUNDABLE: Personalized items, digital downloads, gift cards, and items marked as "Final Sale" are not eligible for refund. Shipping costs are non-refundable unless the return is due to our error.\n\nVIP CUSTOMERS: Platinum and Gold VIP members receive an extended 90-day return window on all products, priority refund processing (1-2 business days), and free return shipping regardless of reason.\n\nEXCEPTION POLICY: For orders over $200 where the customer has a clean history (fewer than 2 returns in the past year), managers may authorize a full refund even outside the standard window at their discretion. This applies especially when the product has a known defect.`,
    tags: ['refund', 'return', 'policy', 'money-back', 'partial-refund', 'vip'],
    helpful: 487,
  },
  {
    title: 'Shipping Policy — Delivery Times, Tracking & Lost Packages',
    category: 'shipping_policy',
    content: `STANDARD SHIPPING (Free over $50): 5-7 business days via USPS/FedEx Ground. Tracking number emailed within 24 hours of shipment.\n\nEXPRESS SHIPPING ($12.99): 2-3 business days via FedEx Express. Available for orders placed before 2 PM EST.\n\nOVERNIGHT SHIPPING ($24.99): Next business day delivery via FedEx Priority Overnight. Orders must be placed before 12 PM EST. Not available for P.O. boxes or APO/FPO addresses.\n\nTRACKING ISSUES: If a tracking number shows no movement for 5+ business days, the package may be lost in transit. Customer should wait 2 additional days, then contact support for a replacement or refund. We file a claim with the carrier automatically.\n\nLOST PACKAGES: If tracking shows "Delivered" but customer did not receive the package: (1) Ask customer to check with neighbors and building management, (2) Wait 48 hours as packages sometimes update late, (3) If still missing, we send a replacement at no charge for first occurrence. For repeat claims (3+ in 12 months), require photo evidence or police report.\n\nDAMAGED IN SHIPPING: If the outer box or product is damaged upon delivery, customer should photograph the damage and contact us within 7 days. We ship a replacement immediately and provide a return label for the damaged item. No need to return damaged items under $50.\n\nINTERNATIONAL: We ship to 45 countries. Customs duties and import taxes are the responsibility of the recipient. International orders cannot be expedited.`,
    tags: ['shipping', 'delivery', 'tracking', 'lost-package', 'damaged', 'express'],
    helpful: 623,
  },
  {
    title: 'Product Returns — Step-by-Step Guide',
    category: 'product_support',
    content: `HOW TO INITIATE A RETURN:\n1. Log into your account at support.example.com/returns\n2. Select the order and item(s) to return\n3. Choose your return reason (helps us improve!)\n4. Print the prepaid return shipping label\n5. Pack the item securely in original packaging if possible\n6. Drop off at any FedEx or USPS location\n\nRETURN WINDOW BY CATEGORY:\n- Electronics: 30 days from delivery\n- Clothing & Shoes: 60 days (must be unworn with tags)\n- Home & Kitchen: 30 days (90 days for sleep products like pillows/mattresses)\n- Sports & Outdoors: 60 days\n- Food & Consumables: 30 days (unopened only)\n\nEXCHANGES: To exchange for a different size/color, select "Exchange" during the return process. The replacement ships as soon as your return is scanned by the carrier — no need to wait for it to arrive at our warehouse.\n\nREFUND TIMING: Refunds are processed within 1-3 business days of receiving the return. Credit card refunds take 5-10 additional business days. Store credit is instant.\n\nDEFECTIVE ITEMS: Products with manufacturer defects can be returned at any time within the warranty period. No restocking fee applies. We cover all return shipping costs.`,
    tags: ['return', 'exchange', 'how-to', 'defective', 'warranty-return'],
    helpful: 412,
  },
  {
    title: 'Electronics Troubleshooting — Common Issues & Fixes',
    category: 'product_support',
    content: `WIRELESS HEADPHONES:\n- Bluetooth not connecting: Reset by holding power + volume down for 10 seconds. Remove device from phone's Bluetooth list and re-pair.\n- Audio cutting out: Ensure firmware is updated via the companion app. Move away from WiFi routers (2.4GHz interference).\n- ANC not working: Check that ANC mode is enabled (triple-tap left ear cup). Clean microphone ports with compressed air.\n\nSMART HOME DEVICES:\n- WiFi connection drops: Ensure device is on 2.4GHz network (not 5GHz). Move closer to router or add a WiFi extender. Check for firmware updates.\n- Not responding to voice: Retrain voice model in app. Check microphone isn't muted (physical switch).\n\nMONITORS:\n- Dead pixels: Single dead pixel is within industry standard. 3+ dead pixels qualify for warranty replacement.\n- USB-C not charging: Ensure cable supports PD (Power Delivery). Try different USB-C port on the monitor. Check laptop compatibility.\n- No signal: Try different cable. Reset monitor to factory settings. Update graphics drivers.\n\nPOWER BANKS:\n- Not charging devices: Use included cable (third-party cables may not support PD). Check that the correct port is used (USB-C for PD, USB-A for QC).\n- Overheating: Stop charging immediately. Let cool for 30 minutes. If persistent, stop using and contact support for warranty replacement.`,
    tags: ['electronics', 'troubleshooting', 'headphones', 'monitor', 'smart-home', 'power-bank'],
    helpful: 891,
  },
  {
    title: 'Account Management — Password Reset, Email Change, Deletion',
    category: 'account_management',
    content: `PASSWORD RESET:\n1. Go to login page and click "Forgot Password"\n2. Enter the email associated with your account\n3. Check inbox (and spam folder) for reset link (valid 24 hours)\n4. If no email received after 5 minutes: verify the correct email, check spam, try requesting again\n5. For security, password must be 12+ characters with uppercase, lowercase, number, and symbol\n\nEMAIL CHANGE:\n- Log in with current credentials\n- Go to Account Settings > Personal Information\n- Enter new email and verify with a confirmation link sent to BOTH old and new addresses\n- If you no longer have access to old email, contact support with government-issued ID for verification\n\nACCOUNT DELETION (GDPR/CCPA):\n- Request via Account Settings > Privacy > Delete Account\n- 30-day grace period during which you can cancel the deletion\n- All personal data, order history, and saved payment methods are permanently erased\n- Active subscriptions are cancelled immediately, with prorated refunds issued\n- We retain anonymized transaction records for tax compliance (7 years)\n\nTWO-FACTOR AUTHENTICATION:\n- Strongly recommended for all accounts\n- Supports authenticator apps (Google Authenticator, Authy) and SMS\n- Recovery codes provided at setup — store them safely\n- Lost access to 2FA: Contact support with photo ID verification, takes 24-48 hours`,
    tags: ['account', 'password', 'email', 'deletion', 'privacy', '2fa', 'security'],
    helpful: 334,
  },
  {
    title: 'Warranty Claims — How to File and What\'s Covered',
    category: 'product_support',
    content: `WARRANTY COVERAGE:\n- Manufacturer defects in materials and workmanship\n- Premature wear beyond normal use expectations\n- Component failures (batteries, motors, electronics)\n\nNOT COVERED:\n- Physical damage from drops, impacts, or misuse\n- Water damage (unless product is rated waterproof)\n- Normal wear and tear (fading, minor scratches)\n- Modifications or unauthorized repairs\n\nWARRANTY PERIODS BY CATEGORY:\n- Electronics: 24 months (monitors: 36 months)\n- Power banks & chargers: 18 months\n- Clothing & shoes: 6 months\n- Home & Kitchen appliances: 24 months\n- Sports equipment: 6-12 months\n\nHOW TO FILE:\n1. Contact support with order number and description of the defect\n2. Provide photos or video demonstrating the issue\n3. Our team evaluates within 2 business days\n4. If approved: choose replacement (same model or equivalent) or store credit\n5. Defective item must be returned (we provide free shipping label)\n\nEXPEDITED WARRANTY FOR VIP:\nPlatinum members get same-day warranty approval and advance replacement (new item ships before defective one is returned).`,
    tags: ['warranty', 'claim', 'defect', 'replacement', 'coverage'],
    helpful: 556,
  },
  {
    title: 'Coupon & Promotional Credit Policy',
    category: 'billing',
    content: `COUPON TYPES:\n- Percentage off (10-30% typically): Applied to subtotal before tax and shipping\n- Fixed amount ($5, $10, $25): Applied after other discounts\n- Free shipping: Overrides standard shipping cost\n- BOGO (Buy One Get One): Second item of equal or lesser value\n\nRESTRICTIONS:\n- Only one promotional coupon per order (stackable with store credit)\n- Coupons cannot be applied retroactively to placed orders\n- Minimum purchase requirements must be met after other discounts\n- Some exclusions: gift cards, sale items, new releases (first 30 days)\n\nSTORE CREDIT:\n- Issued as digital credit to your account balance\n- Never expires\n- Can be combined with coupons and other payment methods\n- Not transferable between accounts\n- Issued for: warranty replacements where original model is discontinued, service recovery compensation, referral rewards\n\nPRICE MATCH / ADJUSTMENT:\n- If an item drops in price within 14 days of purchase, we'll refund the difference\n- Price match against Amazon, Best Buy, and Target for identical items\n- Submit price match request via support with link to lower price\n\nSERVICE RECOVERY COMPENSATION:\n- Delayed shipments (7+ days late): $10 credit\n- Wrong item shipped: 15% coupon + free express return/reship\n- Multiple failed deliveries: $25 credit + free overnight on replacement\n- Bad customer experience: Up to $50 credit at agent discretion`,
    tags: ['coupon', 'promo', 'discount', 'store-credit', 'price-match', 'compensation'],
    helpful: 289,
  },
  {
    title: 'Escalation Procedures — When and How to Escalate',
    category: 'general',
    content: `AUTO-ESCALATION TRIGGERS:\n- Refund amount exceeds $200\n- Customer has filed 3+ tickets in 7 days\n- Ticket mentions legal action, BBB, or social media threat\n- Product safety concern or injury report\n- VIP customer with negative sentiment on 2+ consecutive tickets\n- Agent confidence score below 0.6\n\nMANUAL ESCALATION REASONS:\n- Complex multi-order issues spanning 90+ days\n- Suspected fraud or account compromise\n- Bulk/wholesale order disputes\n- Requests involving personal data (GDPR Article 17, CCPA)\n- Unresolved issues after 2 automated resolution attempts\n\nESCALATION TIERS:\n- Tier 1 (AI Agent): Standard automated resolution — 85% of tickets\n- Tier 2 (Senior Support): Complex cases, high-value customers — reviewed within 4 hours\n- Tier 3 (Support Manager): Legal, safety, VIP critical — reviewed within 1 hour\n- Tier 4 (VP Customer Success): Public PR risk, lawsuit threats — immediate\n\nSLA BY TIER:\n- Tier 1: Resolved in under 5 minutes (automated)\n- Tier 2: First response within 4 hours, resolved within 24 hours\n- Tier 3: First response within 1 hour, resolved within 8 hours\n- Tier 4: Immediate response, resolved within 4 hours`,
    tags: ['escalation', 'sla', 'tier', 'manager', 'legal', 'safety'],
    helpful: 198,
  },
];

function generateKnowledgeArticles(count = 50) {
  const articles = [];
  for (let i = 0; i < count; i++) {
    const base = KB_ARTICLES[i % KB_ARTICLES.length];
    const variant = Math.floor(i / KB_ARTICLES.length);
    articles.push({
      article_id: `KB-${String(i + 1).padStart(6, '0')}`,
      title: variant === 0 ? base.title : `${base.title} (Updated ${2024 - variant})`,
      content: base.content,
      category: base.category,
      tags: base.tags,
      helpful_count: base.helpful + Math.floor((Math.random() - 0.3) * 100),
      view_count: base.helpful * 8 + Math.floor(Math.random() * 2000),
      author: 'Support Team',
      published: true,
      created_at: new Date(Date.now() - (180 + Math.random() * 365) * 24 * 60 * 60 * 1000),
      last_updated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }
  return articles;
}

// ─── Resolution Actions ───

const RESOLUTION_TEMPLATES = [
  { type: 'refund', name: 'Full Refund to Original Payment', desc: 'Process a complete refund to the customer\'s original payment method. Validates order total, checks refund eligibility window, and triggers payment processor reversal.', success: 0.96, avgTime: 8, execs: 2847 },
  { type: 'refund', name: 'Partial Refund (Percentage)', desc: 'Issue a partial refund based on product condition, usage, or time since purchase. Calculates pro-rated amount and processes to original payment method.', success: 0.93, avgTime: 10, execs: 1523 },
  { type: 'replacement', name: 'Same-Item Replacement', desc: 'Ship an identical replacement product to the customer. Checks inventory availability, creates new order, and generates prepaid return label for defective item.', success: 0.91, avgTime: 15, execs: 1892 },
  { type: 'replacement', name: 'Equivalent Product Swap', desc: 'When the original item is out of stock, offer an equivalent or upgraded alternative. Calculates price difference and adjusts accordingly.', success: 0.87, avgTime: 20, execs: 734 },
  { type: 'shipping_label', name: 'Prepaid Return Label', desc: 'Generate and email a prepaid FedEx/USPS return shipping label. Includes tracking, pickup scheduling option, and estimated refund timeline.', success: 0.98, avgTime: 3, execs: 4102 },
  { type: 'coupon', name: 'Service Recovery Coupon', desc: 'Issue a percentage-off or fixed-amount coupon as goodwill compensation. Applied to customer account automatically. Stackable with store credit.', success: 0.94, avgTime: 2, execs: 3211 },
  { type: 'coupon', name: 'Store Credit to Account', desc: 'Add store credit balance to customer account. Never expires, visible on next checkout. Used for warranty replacements of discontinued items.', success: 0.97, avgTime: 2, execs: 1845 },
  { type: 'account_update', name: 'Account Information Update', desc: 'Update customer account details including email, shipping address, subscription preferences, or notification settings. Sends verification to both old and new contact info.', success: 0.99, avgTime: 5, execs: 967 },
  { type: 'escalation', name: 'Tier 2 Human Escalation', desc: 'Route the ticket to a senior support representative with full context package. Includes customer history summary, attempted resolutions, and AI recommendation.', success: 0.82, avgTime: 45, execs: 612 },
  { type: 'escalation', name: 'Tier 3 Manager Escalation', desc: 'Immediate escalation to support management for critical issues: safety concerns, legal threats, PR risk, or VIP customers with repeated failures. 1-hour SLA.', success: 0.78, avgTime: 90, execs: 156 },
  { type: 'email_notification', name: 'Status Update Email', desc: 'Send a detailed status update email to the customer with current ticket status, expected resolution timeline, and next steps. Personalized with order and account details.', success: 0.99, avgTime: 1, execs: 8934 },
  { type: 'email_notification', name: 'Resolution Confirmation', desc: 'Send confirmation email after resolution is applied. Includes refund amount/timeline, replacement tracking, coupon code, or other action-specific details.', success: 0.99, avgTime: 1, execs: 7621 },
];

function generateResolutionActions(count = 20) {
  const actions = [];
  for (let i = 0; i < count; i++) {
    const base = RESOLUTION_TEMPLATES[i % RESOLUTION_TEMPLATES.length];
    const variant = Math.floor(i / RESOLUTION_TEMPLATES.length);
    actions.push({
      action_id: `ACT-${String(i + 1).padStart(6, '0')}`,
      action_type: base.type,
      action_name: variant === 0 ? base.name : `${base.name} Alt-${variant}`,
      description: base.desc,
      workflow_template: { steps: ['validate', 'authorize', 'execute', 'confirm', 'notify'], timeout: 300 },
      success_rate: Math.min(0.99, base.success + (Math.random() - 0.5) * 0.04),
      avg_execution_time: base.avgTime + Math.floor((Math.random() - 0.5) * 4),
      total_executions: base.execs + Math.floor((Math.random() - 0.5) * 200),
      conditions: `action_type == "${base.type}"`,
      parameters: { requires_manager_approval: base.type === 'escalation' || base.avgTime > 30 },
      requires_approval: base.type === 'escalation',
      category: base.type,
      enabled: true,
      created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
  }
  return actions;
}

// ─── Realistic Support Tickets ───

const TICKET_TEMPLATES = [
  // === REFUND ===
  { cat: 'refund', pri: 'high', subj: 'Order #{orderId} — want a full refund, item is defective', desc: 'I purchased {product} two weeks ago and it arrived with a {issue}. I\'ve tried the troubleshooting steps from your website (resetting the device, checking connections) but nothing works. This was a birthday gift for my daughter and I\'m really disappointed. I need a full refund processed back to my Visa card ending in 4821. Order was placed on {orderDate}. Please handle this urgently — I\'ve been a loyal customer for {years} years.', sentiment: 'negative' },
  { cat: 'refund', pri: 'urgent', subj: 'CHARGED TWICE for order #{orderId} — need immediate refund', desc: 'I just checked my bank statement and I was charged $189.99 TWICE for the same order #{orderId}. This is unacceptable. The first charge on {orderDate} and a duplicate charge two days later. I need the duplicate charge refunded immediately. My rent is due and this double charge has put my account into overdraft. I am extremely frustrated with this situation.', sentiment: 'angry' },
  { cat: 'refund', pri: 'medium', subj: 'Returning {product} — not what I expected', desc: 'Hi, I received my {product} last week (order #{orderId}) and unfortunately it doesn\'t meet my expectations. The {issue} and it just doesn\'t work for what I need. The product is still in original packaging and unused. Could you please send me a return label and process a refund? I\'d like the refund to go back to my original payment method. Thank you for your help.', sentiment: 'neutral' },
  { cat: 'refund', pri: 'low', subj: 'Requesting partial refund — minor cosmetic damage on {product}', desc: 'My {product} from order #{orderId} arrived with some minor cosmetic scratches on the surface. It still works perfectly fine so I don\'t need to return it, but I was wondering if you could offer a partial refund or store credit for the cosmetic damage? Maybe 15-20% off? I\'ve attached photos of the scratches. The box was also slightly dented so I think it happened during shipping.', sentiment: 'neutral' },

  // === SHIPPING ===
  { cat: 'shipping', pri: 'high', subj: 'Package lost in transit — order #{orderId} no tracking updates for 8 days', desc: 'My order #{orderId} shipped on {orderDate} but the tracking number {tracking} has shown "In Transit to Next Facility" for 8 days now with no updates. I paid for express shipping ($12.99) to get it by Friday for a camping trip and now the trip has passed. The package contains a {product} that I still need. Can you either locate the package or send a replacement with overnight shipping? I\'m very frustrated that express shipping was useless.', sentiment: 'negative' },
  { cat: 'shipping', pri: 'urgent', subj: 'Delivered to wrong address — need immediate reship', desc: 'The tracking for order #{orderId} shows "Delivered" but I DID NOT receive it. I checked with my neighbors, the front desk, and the mailroom — nothing. The delivery photo shows a completely different house than mine. I live at 742 Maple Street but it looks like it was delivered to a house with a red door — mine is blue. I need this {product} for a presentation tomorrow. Please send a replacement with overnight shipping ASAP.', sentiment: 'angry' },
  { cat: 'shipping', pri: 'medium', subj: 'When will order #{orderId} ship? Ordered 4 days ago', desc: 'I placed order #{orderId} four days ago and it still shows "Processing." I selected standard shipping but expected it to at least ship by now. My account shows no tracking number yet. Is there a delay? I need the {product} within the next week for an event. Could you please check on the status and let me know when it will ship? Thanks!', sentiment: 'neutral' },
  { cat: 'shipping', pri: 'low', subj: 'Can I change shipping address for order #{orderId}?', desc: 'Hi, I just realized I put in my old apartment address for order #{orderId}. I moved last month and forgot to update my default address. The new address is 456 Oak Avenue, Apt 12B, Portland, OR 97201. The order hasn\'t shipped yet so I\'m hoping you can update it. The {product} is the right one, just wrong address. Thank you!', sentiment: 'positive' },

  // === PRODUCT ISSUE ===
  { cat: 'product_issue', pri: 'urgent', subj: '{product} stopped working completely after 2 months', desc: 'My {product} (order #{orderId}, purchased {orderDate}) has completely stopped working. Yesterday it was fine, today it won\'t turn on at all. I\'ve tried charging it for 6 hours, different cables, different outlets — nothing. The LED light doesn\'t even come on. This product is only 2 months old and still under warranty. I rely on this daily for work and need an immediate replacement or I\'ll have to buy a competitor\'s product. This is my third issue with your products and I\'m starting to lose faith in the brand.', sentiment: 'angry' },
  { cat: 'product_issue', pri: 'high', subj: 'Safety concern — {product} overheating during use', desc: 'I need to report a serious safety issue with my {product} (order #{orderId}). During normal use yesterday, it became extremely hot to the touch — I estimate over 150°F. I could barely hold it. I immediately unplugged it and set it on a non-flammable surface. There\'s now a visible discoloration/burn mark on the bottom of the unit. I have two small children in the house and this is a serious safety hazard. I need this addressed immediately. I have photos and video of the overheating.', sentiment: 'angry' },
  { cat: 'product_issue', pri: 'medium', subj: '{product} — {issue}', desc: 'I\'ve been using my {product} for about 3 months now (order #{orderId}) and I\'m experiencing an issue: {issue}. It\'s not a complete failure but it\'s definitely getting worse over time. I followed all the care/maintenance instructions in the manual. Is this a known issue? Is there a fix or should I send it in for warranty repair/replacement? I do like the product otherwise and would prefer to keep using it if possible.', sentiment: 'neutral' },
  { cat: 'product_issue', pri: 'low', subj: 'Minor issue with {product} — seeking advice', desc: 'Hello! Quick question about my {product} from order #{orderId}. I noticed a minor {issue} but I\'m not sure if it\'s actually a defect or just normal for this product. It doesn\'t affect functionality much but I wanted to check before my return window closes. Is this something that qualifies for a warranty claim? Or is there maybe a setting I\'m missing? Thanks for any guidance!', sentiment: 'positive' },

  // === ACCOUNT ===
  { cat: 'account', pri: 'urgent', subj: 'ACCOUNT HACKED — unauthorized orders placed', desc: 'Someone has hacked into my account and placed 3 orders totaling over $1,200 that I did not authorize! The orders are #{orderId}, ORD-FAKE01, and ORD-FAKE02. They changed my shipping address to somewhere in Florida — I live in California. I need you to: 1) Cancel ALL three orders immediately, 2) Refund any charges, 3) Lock my account, 4) Reset my password. I\'ve already changed my email password and enabled 2FA there. This is extremely urgent and I\'m very worried about my payment information being compromised.', sentiment: 'angry' },
  { cat: 'account', pri: 'high', subj: 'Can\'t log in — password reset not working', desc: 'I\'ve been trying to log into my account for 3 days and it keeps saying my password is incorrect. I\'ve tried the "Forgot Password" link 5 times but I never receive the reset email. I\'ve checked spam, junk, all folders — nothing. My email is {email} and I know it\'s the right one because I can see old order confirmation emails from you at that address. I have $45 in store credit and several pending orders. Please help me regain access to my account.', sentiment: 'negative' },
  { cat: 'account', pri: 'medium', subj: 'Please update my email address on file', desc: 'Hi, I recently changed my personal email from {email} to a new address. I\'d like to update my account email. I can verify my identity with my order history — my last 3 orders were #{orderId} for a {product}. I also have the last 4 digits of my payment card: 4821. I no longer have access to the old email so I can\'t use the self-service email change. Can a support agent make this update for me?', sentiment: 'neutral' },
  { cat: 'account', pri: 'low', subj: 'How do I delete my account? (GDPR request)', desc: 'Under GDPR Article 17 (Right to Erasure), I am requesting the complete deletion of my account and all associated personal data. My customer ID is {customerId} and email is {email}. Please confirm: 1) All personal data will be deleted, 2) My order history will be anonymized, 3) Saved payment methods will be removed, 4) Marketing preferences will be cleared. I understand there may be a 30-day processing period. Please send confirmation when complete.', sentiment: 'neutral' },

  // === OTHER ===
  { cat: 'other', pri: 'medium', subj: 'Feedback on recent purchase — {product}', desc: 'I just wanted to share some feedback on my recent {product} purchase (order #{orderId}). Overall I\'m really happy with it! The quality is great and it arrived faster than expected. One small suggestion: the packaging could be more eco-friendly — there was a lot of unnecessary plastic wrap inside the box. Also, the setup instructions could be clearer for the initial WiFi pairing step. But overall, great product and I\'ll definitely be ordering from you again.', sentiment: 'positive' },
  { cat: 'other', pri: 'low', subj: 'Do you offer bulk/wholesale pricing?', desc: 'Hi, I\'m an event coordinator and I\'m interested in purchasing 50 units of the {product} for corporate gifts at our annual conference in March. Do you offer any bulk pricing or wholesale discounts for orders of this size? We\'d also need custom gift wrapping if possible. Our company is TechEvents Inc. and we\'ve purchased from you before (customer #{customerId}). Looking forward to hearing about available options.', sentiment: 'positive' },
  { cat: 'other', pri: 'medium', subj: 'Price match request — found {product} cheaper elsewhere', desc: 'I purchased the {product} from you last week for $189.99 (order #{orderId}) and I just found the exact same product on Amazon for $159.99. According to your price match policy, you should match this within 14 days of purchase. Here\'s the Amazon link. I\'d like a refund of the $30 difference. Can you process this price adjustment to my original payment method?', sentiment: 'neutral' },
];

function generateSupportTickets(count = 500, customers) {
  const tickets = [];
  const productNames = PRODUCTS.map(p => p.name);
  const issues = PRODUCTS.flatMap(p => p.issues);

  for (let i = 0; i < count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const template = TICKET_TEMPLATES[i % TICKET_TEMPLATES.length];
    const product = productNames[Math.floor(Math.random() * productNames.length)];
    const issue = issues[Math.floor(Math.random() * issues.length)];
    const order = customer.order_history.length > 0
      ? customer.order_history[Math.floor(Math.random() * customer.order_history.length)]
      : { order_id: `ORD-${String(Math.floor(Math.random() * 99999)).padStart(6, '0')}`, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) };

    const yearsCustomer = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000)) + 1;
    const tracking = `FX${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
    const orderDate = new Date(order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const subject = template.subj
      .replace('{orderId}', order.order_id)
      .replace('{product}', product)
      .replace('{issue}', issue.toLowerCase());

    const description = template.desc
      .replace(/\{product\}/g, product)
      .replace(/\{orderId\}/g, order.order_id)
      .replace(/\{orderDate\}/g, orderDate)
      .replace(/\{issue\}/g, issue.toLowerCase())
      .replace(/\{email\}/g, customer.email)
      .replace(/\{customerId\}/g, customer.customer_id)
      .replace(/\{tracking\}/g, tracking)
      .replace(/\{years\}/g, yearsCustomer);

    const status = Math.random() < 0.70 ? 'resolved' : (Math.random() < 0.7 ? 'processing' : 'escalated');
    const automated = status === 'resolved' ? Math.random() > 0.12 : false;
    const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    const resolutionTime = status === 'resolved' ? Math.floor(Math.random() * 120) + 2 : null;
    const resolvedAt = status === 'resolved' ? new Date(createdAt.getTime() + resolutionTime * 60 * 1000) : null;

    const resolutions = {
      refund: [
        `Full refund of $${order.total?.toFixed(2) || '89.99'} processed to customer's original payment method. Confirmation email sent with estimated 5-7 business day timeline for credit to appear.`,
        `Partial refund of 20% ($${((order.total || 89.99) * 0.2).toFixed(2)}) issued as store credit for cosmetic damage. Customer accepted the offer and will keep the product.`,
        `Refund processed and prepaid return label generated (FedEx tracking: ${tracking}). Customer notified via email with drop-off instructions.`,
      ],
      shipping: [
        `Replacement order created with overnight FedEx Priority shipping (${tracking}). Original lost package claim filed with carrier. $10 service recovery credit applied to customer account.`,
        `Shipping address updated successfully before package left the warehouse. Customer confirmed the new address. Estimated delivery in 3-5 business days.`,
        `Package located at local FedEx facility — was misrouted. Rescheduled delivery for tomorrow. Customer notified with updated tracking.`,
      ],
      product_issue: [
        `Warranty replacement approved and shipping today via express. Defective unit return label provided (${tracking}). Quality team notified of the reported defect pattern.`,
        `Troubleshooting resolved the issue — customer guided through firmware reset procedure. Product now functioning normally. Follow-up scheduled in 7 days.`,
        `Safety report filed with product team (Case #SR-${Math.floor(Math.random() * 9999)}). Customer issued full refund + $25 credit. Product recalled from inventory for inspection.`,
      ],
      account: [
        `Account secured: password reset, all sessions terminated, 2FA enabled. Three unauthorized orders cancelled and full refund of $1,247.94 processed. Fraud team notified for investigation.`,
        `Password reset link sent via alternate verification method (SMS). Customer regained access. Recommended enabling 2FA for future security.`,
        `Email address updated after identity verification via order history and payment card match. Confirmation sent to both old and new email addresses.`,
      ],
      other: [
        `Feedback forwarded to product and packaging teams. $5 store credit applied as thank you. Customer will be notified when eco-friendly packaging rolls out next quarter.`,
        `Price match approved — $30 difference refunded to original payment method. Customer satisfied with the resolution.`,
        `Bulk pricing quote of 15% discount ($161.49/unit) sent for 50 units. Custom gift wrapping available at $3/unit. Quote valid for 30 days.`,
      ],
    };

    const catResolutions = resolutions[template.cat] || resolutions.other;

    tickets.push({
      ticket_id: `TKT-${String(i + 1).padStart(6, '0')}`,
      customer_id: customer.customer_id,
      order_id: order.order_id,
      subject,
      description,
      category: template.cat,
      priority: template.pri,
      status,
      resolution: status === 'resolved' ? catResolutions[Math.floor(Math.random() * catResolutions.length)] : null,
      resolution_time_minutes: resolutionTime,
      automated,
      agent_confidence: automated ? 0.82 + Math.random() * 0.17 : 0.45 + Math.random() * 0.35,
      sentiment: template.sentiment,
      created_at: createdAt,
      resolved_at: resolvedAt,
      metadata: {
        action_type: ['refund', 'replacement', 'shipping_label', 'coupon', 'account_update', 'escalation'][Math.floor(Math.random() * 6)],
        source: ['web', 'email', 'chat', 'phone'][Math.floor(Math.random() * 4)],
      },
    });
  }
  return tickets;
}

// ─── Bulk Indexing ───

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
    console.error(`  ${erroredDocuments.length} documents failed to index`);
    console.error(JSON.stringify(erroredDocuments[0], null, 2));
  } else {
    console.log(`  Indexed ${data.length} documents into ${indexName}`);
  }
}

async function seedData() {
  console.log('Starting data seeding...\n');

  try {
    console.log('Generating realistic data...');
    const customers = generateCustomers(200);
    const products = generateProducts(100);
    const articles = generateKnowledgeArticles(50);
    const actions = generateResolutionActions(20);
    const tickets = generateSupportTickets(500, customers);

    console.log(`  ${customers.length} customers (with detailed personas, VIP tiers, order histories)`);
    console.log(`  ${products.length} products (with real descriptions, known issues, warranty info)`);
    console.log(`  ${articles.length} knowledge articles (with full policy content, procedures)`);
    console.log(`  ${actions.length} resolution actions (with workflow templates, success rates)`);
    console.log(`  ${tickets.length} support tickets (with realistic customer stories)\n`);

    // Clear existing data
    console.log('Clearing existing data...');
    const indexes = ['customer_profiles', 'product_catalog', 'knowledge_base', 'resolution_actions', 'support_tickets'];
    for (const idx of indexes) {
      try {
        await client.deleteByQuery({ index: idx, body: { query: { match_all: {} } }, refresh: true });
        console.log(`  Cleared ${idx}`);
      } catch (e) {
        // Index might not exist yet
      }
    }

    console.log('\nIndexing data into Elasticsearch...\n');
    await bulkIndex('customer_profiles', customers);
    await bulkIndex('product_catalog', products);
    await bulkIndex('knowledge_base', articles);
    await bulkIndex('resolution_actions', actions);
    await bulkIndex('support_tickets', tickets);

    console.log('\nData seeding completed!');
    console.log(`Total documents indexed: ${customers.length + products.length + articles.length + actions.length + tickets.length}`);
    console.log('\nSample ticket preview:');
    console.log(`  Subject: ${tickets[0].subject}`);
    console.log(`  Description: ${tickets[0].description.substring(0, 150)}...`);
  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
}

seedData().catch(console.error);
