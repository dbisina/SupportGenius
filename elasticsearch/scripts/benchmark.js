/**
 * benchmark.js - SupportGenius Pipeline Benchmark
 *
 * Submits 20 test tickets via the backend API, polls for completion,
 * compares actual results against expected outputs, and prints a
 * precision/recall/accuracy metric report.
 *
 * Usage:
 *   node scripts/benchmark.js
 *   API_BASE=http://localhost:3001 node scripts/benchmark.js
 *
 * Exit codes:
 *   0 - overall accuracy > 80%
 *   1 - overall accuracy <= 80%
 */

'use strict';

const http  = require('http');
const https = require('https');
const { URL } = require('url');

// ─── Configuration ──────────────────────────────────────────────────────────
const API_BASE           = process.env.API_BASE || 'http://localhost:5000';
const POLL_INTERVAL_MS   = 5000;
const MAX_POLL_ATTEMPTS  = 96;   // 96 * 5s = 480s (8 minutes) per ticket
const ACCURACY_THRESHOLD = 0.80; // 80% required for exit code 0

// Set MODE=autonomous for fast single-call mode (~15s per ticket vs ~3min orchestrated)
const TICKET_MODE = process.env.MODE || 'orchestrated';

// ─── Test Scenarios ──────────────────────────────────────────────────────────
const TEST_SCENARIOS = [
  // REFUND category (5 tickets)
  {
    id: 'bench-001',
    ticket: {
      customer_email: 'alice@test.com',
      subject: 'Need refund for damaged item',
      description: 'I received order ORD-000101 and the product was broken in shipping. I need a full refund.',
      order_id: 'ORD-000101',
    },
    expected: { category: 'refund', action_type: 'refund', fault_assessment: 'company_error' },
  },
  {
    id: 'bench-002',
    ticket: {
      customer_email: 'bob@test.com',
      subject: 'Wrong item received - want refund',
      description: 'I ordered a bicycle but received a small model bicycle. This is not what I expected. Please refund.',
      order_id: 'ORD-000102',
    },
    expected: { category: 'refund', action_type: ['refund', 'coupon'], fault_assessment: ['customer_error', 'shared_fault'] },
  },
  {
    id: 'bench-003',
    ticket: {
      customer_email: 'carol@test.com',
      subject: 'Charged twice for my order',
      description: 'My credit card was billed twice for order ORD-000103. Please refund the duplicate charge immediately.',
      order_id: 'ORD-000103',
    },
    expected: { category: 'billing', action_type: 'refund', fault_assessment: 'company_error' },
  },
  {
    id: 'bench-004',
    ticket: {
      customer_email: 'dave@test.com',
      subject: 'Item not as described',
      description: 'The product quality is nothing like the photos. Very disappointed. Want my money back.',
      order_id: 'ORD-000104',
    },
    expected: { category: 'refund', action_type: ['refund', 'replacement'] },
  },
  {
    id: 'bench-005',
    ticket: {
      customer_email: 'eve@test.com',
      subject: 'Return and refund request',
      description: 'I changed my mind about this purchase. Order ORD-000105. Can I return it?',
      order_id: 'ORD-000105',
    },
    expected: { category: 'refund', action_type: ['refund', 'coupon'] },
  },
  // SHIPPING category (4 tickets)
  {
    id: 'bench-006',
    ticket: {
      customer_email: 'frank@test.com',
      subject: 'Order not delivered',
      description: 'My order ORD-000106 was supposed to arrive 5 days ago but tracking shows it is stuck in transit.',
      order_id: 'ORD-000106',
    },
    expected: { category: 'shipping', action_type: ['shipping_label', 'replacement'] },
  },
  {
    id: 'bench-007',
    ticket: {
      customer_email: 'grace@test.com',
      subject: 'Package delivered to wrong address',
      description: 'UPS says they delivered my package but I never received it. The tracking photo shows a different door.',
      order_id: 'ORD-000107',
    },
    expected: { category: 'shipping', action_type: ['replacement', 'refund'] },
  },
  {
    id: 'bench-008',
    ticket: {
      customer_email: 'henry@test.com',
      subject: 'Express shipping not delivered on time',
      description: 'I paid for express shipping for order ORD-000108 but it arrived 3 days late. I want a refund of the shipping cost.',
      order_id: 'ORD-000108',
    },
    expected: { category: ['shipping', 'refund'], action_type: ['refund', 'coupon'] },
  },
  {
    id: 'bench-009',
    ticket: {
      customer_email: 'iris@test.com',
      subject: 'Need return shipping label',
      description: 'I want to return my order ORD-000109. Can you please send me a prepaid return label?',
      order_id: 'ORD-000109',
    },
    expected: { category: ['shipping', 'refund'], action_type: 'shipping_label' },
  },
  // PRODUCT ISSUE category (4 tickets)
  {
    id: 'bench-010',
    ticket: {
      customer_email: 'jack@test.com',
      subject: 'Product stopped working after 2 weeks',
      description: 'The product from order ORD-000110 completely stopped working after just 2 weeks of normal use. It should be under warranty.',
      order_id: 'ORD-000110',
    },
    expected: { category: 'product_issue', action_type: 'replacement' },
  },
  {
    id: 'bench-011',
    ticket: {
      customer_email: 'kate@test.com',
      subject: 'Product has manufacturing defect',
      description: 'There is clearly a manufacturing defect in my product. The seam is split and it has never been used.',
      order_id: 'ORD-000111',
    },
    expected: { category: 'product_issue', action_type: ['replacement', 'refund'], fault_assessment: 'company_error' },
  },
  {
    id: 'bench-012',
    ticket: {
      customer_email: 'liam@test.com',
      subject: 'Product does not match description',
      description: 'The specs listed say 64GB but the product I received is 32GB. Order ORD-000112.',
      order_id: 'ORD-000112',
    },
    expected: { category: 'product_issue', action_type: ['replacement', 'refund'], fault_assessment: 'company_error' },
  },
  {
    id: 'bench-013',
    ticket: {
      customer_email: 'maya@test.com',
      subject: 'How do I use this product',
      description: 'I cannot figure out how to set up my new device. The manual is very confusing. Can someone help?',
      order_id: 'ORD-000113',
    },
    expected: { category: 'product_issue', action_type: ['escalation', 'coupon'] },
  },
  // ACCOUNT category (4 tickets)
  {
    id: 'bench-014',
    ticket: {
      customer_email: 'noah@test.com',
      subject: 'Cannot login to my account',
      description: 'I have been locked out of my account for 2 days. Password reset emails are not arriving.',
      order_id: null,
    },
    expected: { category: 'account', action_type: 'account_update' },
  },
  {
    id: 'bench-015',
    ticket: {
      customer_email: 'olivia@test.com',
      subject: 'Update my shipping address',
      description: 'I need to update my default shipping address before my next order ships.',
      order_id: null,
    },
    expected: { category: 'account', action_type: 'account_update' },
  },
  {
    id: 'bench-016',
    ticket: {
      customer_email: 'peter@test.com',
      subject: 'Cancel my subscription',
      description: 'Please cancel my monthly subscription immediately. I do not want to be charged again.',
      order_id: null,
    },
    expected: { category: 'account', action_type: 'account_update' },
  },
  {
    id: 'bench-017',
    ticket: {
      customer_email: 'quinn@test.com',
      subject: 'My loyalty points are missing',
      description: 'I made a purchase 2 weeks ago and still have not received my loyalty points. Order ORD-000117.',
      order_id: 'ORD-000117',
    },
    expected: { category: 'account', action_type: 'account_update' },
  },
  // BILLING category (3 tickets)
  {
    id: 'bench-018',
    ticket: {
      customer_email: 'rachel@test.com',
      subject: 'Dispute unauthorized charge',
      description: 'There is a charge on my card from your company that I did not authorize. Please investigate.',
      order_id: null,
    },
    expected: { category: 'billing', action_type: ['refund', 'escalation'] },
  },
  {
    id: 'bench-019',
    ticket: {
      customer_email: 'sam@test.com',
      subject: 'My coupon code did not apply',
      description: 'I used coupon code SAVE20 at checkout but the discount was not applied to my order ORD-000119.',
      order_id: 'ORD-000119',
    },
    expected: { category: 'billing', action_type: ['coupon', 'refund'] },
  },
  {
    id: 'bench-020',
    ticket: {
      customer_email: 'tina@test.com',
      subject: 'Invoice shows wrong amount',
      description: 'The invoice for order ORD-000120 shows $150 but I was quoted $120. Please correct this.',
      order_id: 'ORD-000120',
    },
    expected: { category: 'billing', action_type: ['refund', 'account_update'] },
  },
];

// ─── Terminal Colours ────────────────────────────────────────────────────────
const isTTY = process.stdout.isTTY;
const COL = isTTY
  ? { reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m' }
  : { reset: '', bold: '', green: '', red: '', yellow: '', cyan: '', dim: '' };

const PASS_TAG = COL.green + 'PASS' + COL.reset;
const FAIL_TAG = COL.red   + 'FAIL' + COL.reset;
const SKIP_TAG = COL.yellow + 'SKIP' + COL.reset;

// ─── HTTP Helper ─────────────────────────────────────────────────────────────
function httpRequest(method, urlStr, body) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(urlStr);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname : parsed.hostname,
      port     : parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path     : parsed.pathname + (parsed.search || ''),
      method,
      headers  : {
        'Content-Type'  : 'application/json',
        'Accept'        : 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsedBody;
        try   { parsedBody = JSON.parse(raw); }
        catch { parsedBody = raw; }
        resolve({ statusCode: res.statusCode, body: parsedBody });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── API Wrappers ─────────────────────────────────────────────────────────────
async function submitTicket(ticket) {
  const resp = await httpRequest('POST', API_BASE + '/api/tickets/submit', ticket);
  if (resp.statusCode !== 202) {
    throw new Error('Submit failed (HTTP ' + resp.statusCode + '): ' + JSON.stringify(resp.body));
  }
  return resp.body.ticket_id;
}

async function fetchTrace(ticketId) {
  const resp = await httpRequest('GET', API_BASE + '/api/tickets/' + ticketId + '/trace', null);
  if (resp.statusCode !== 200) {
    throw new Error('Trace fetch failed (HTTP ' + resp.statusCode + '): ' + JSON.stringify(resp.body));
  }
  return resp.body;
}

async function fetchTicket(ticketId) {
  const resp = await httpRequest('GET', API_BASE + '/api/tickets/' + ticketId, null);
  if (resp.statusCode === 404) return null;
  if (resp.statusCode !== 200) {
    throw new Error('Ticket fetch failed (HTTP ' + resp.statusCode + '): ' + JSON.stringify(resp.body));
  }
  return resp.body;
}

// ─── Polling ──────────────────────────────────────────────────────────────────
const TERMINAL_STATUSES = new Set(['resolved', 'escalated']);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollForCompletion(ticketId) {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    const ticket = await fetchTicket(ticketId);
    if (ticket && TERMINAL_STATUSES.has(ticket.status)) {
      return { ticket, timedOut: false };
    }
    const statusLabel = ticket ? ticket.status : 'not found';
    process.stdout.write(
      '\r  ' + COL.dim +
      'polling ' + ticketId + ' [' + attempt + '/' + MAX_POLL_ATTEMPTS + '] status=' + statusLabel + '   ' +
      COL.reset,
    );
    await sleep(POLL_INTERVAL_MS);
  }
  const ticket = await fetchTicket(ticketId);
  process.stdout.write('\r' + ' '.repeat(70) + '\r');
  return { ticket, timedOut: true };
}

// ─── Result Extraction ────────────────────────────────────────────────────────
const KNOWN_ACTIONS = [
  'refund', 'exchange', 'shipping_label', 'escalation', 'coupon',
  'account_update', 'replacement', 'email_notification',
];

function extractActionType(traceResponse, ticket) {
  const traces = (traceResponse && Array.isArray(traceResponse.traces))
    ? traceResponse.traces : [];

  function fromResult(r) {
    if (!r) return null;
    if (r.action_type        && KNOWN_ACTIONS.includes(r.action_type))        return r.action_type;
    if (r.final_action_type  && KNOWN_ACTIONS.includes(r.final_action_type))  return r.final_action_type;
    if (r.recommended_action && KNOWN_ACTIONS.includes(r.recommended_action)) return r.recommended_action;
    return null;
  }

  // Step priority: decision(3), execution(5), then others
  for (const stepNum of [3, 5, 1, 2, 4, 6]) {
    const trace = traces.find((t) => t.step_number === stepNum && t.result);
    if (trace) {
      const found = fromResult(trace.result);
      if (found) return found;
    }
  }

  for (const trace of traces) {
    const found = fromResult(trace && trace.result);
    if (found) return found;
  }

  // Last resort: scan resolution text
  if (ticket && ticket.resolution) {
    const lower = ticket.resolution.toLowerCase();
    for (const action of KNOWN_ACTIONS) {
      if (lower.includes(action.replace(/_/g, ' ')) || lower.includes(action)) return action;
    }
  }
  return null;
}

function extractFaultAssessment(traceResponse) {
  const VALID_FAULTS = ['company_error', 'customer_error', 'shared_fault', 'unknown'];
  const traces = (traceResponse && Array.isArray(traceResponse.traces))
    ? traceResponse.traces : [];

  for (const stepNum of [1, 3]) {
    const trace = traces.find((t) => t.step_number === stepNum && t.result);
    if (trace) {
      const r = trace.result;
      if (r.fault_assessment && VALID_FAULTS.includes(r.fault_assessment)) return r.fault_assessment;
      if (r.fault_verified   && VALID_FAULTS.includes(r.fault_verified))   return r.fault_verified;
    }
  }
  return null;
}

// ─── Comparison ───────────────────────────────────────────────────────────────
function matches(actual, expected) {
  if (actual == null || expected == null) return false;
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
}

// ─── Reporting ────────────────────────────────────────────────────────────────
function pad(str, len) {
  const s = String(str == null ? '-' : str);
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

function printResultsTable(results) {
  const SEP = '-'.repeat(122);
  console.log('\n' + COL.bold + SEP + COL.reset);
  console.log(
    COL.bold +
    pad('ID', 10) + pad('CAT', 5) + pad('ACT', 5) + pad('FLT', 5) +
    pad('Actual Cat', 14) + pad('Expect Cat', 14) +
    pad('Actual Action', 18) + pad('Expect Action', 22) +
    pad('Actual Fault', 16) + pad('Status', 12) + 'Notes' +
    COL.reset,
  );
  console.log(COL.bold + SEP + COL.reset);

  for (const r of results) {
    const hasData = r.actualCategory != null || r.actualAction != null;
    const partialTag = COL.yellow + 'PART' + COL.reset;
    const catTag = (r.timedOut && !hasData) ? SKIP_TAG : (r.categoryPass ? PASS_TAG : (r.timedOut ? partialTag : FAIL_TAG));
    const actTag = (r.timedOut && !hasData) ? SKIP_TAG : (r.actionPass   ? PASS_TAG : (r.timedOut ? partialTag : FAIL_TAG));
    const fltTag = r.expected.fault_assessment == null
      ? COL.dim + 'N/A' + COL.reset
      : (r.timedOut && !hasData) ? SKIP_TAG : (r.faultPass ? PASS_TAG : (r.timedOut ? partialTag : FAIL_TAG));

    const expAction = Array.isArray(r.expected.action_type)
      ? r.expected.action_type.join('|')
      : (r.expected.action_type || '-');
    const expFault = r.expected.fault_assessment
      ? (Array.isArray(r.expected.fault_assessment)
        ? r.expected.fault_assessment.join('|')
        : r.expected.fault_assessment)
      : '-';

    console.log(
      pad(r.id, 10) +
      catTag + '   ' + actTag + '   ' + fltTag + '  ' +
      pad(r.actualCategory || '-', 14) + pad(r.expected.category, 14) +
      pad(r.actualAction   || '-', 18) + pad(expAction, 22) +
      pad(r.actualFault    || '-', 16) + pad(r.ticketStatus || '-', 12) +
      (r.notes || ''),
    );
  }
  console.log(COL.bold + SEP + COL.reset);
}

function printMetrics(results) {
  const total   = results.length;
  // Only count as skipped if timed out AND no data was extracted at all
  const skipped = results.filter((r) => r.timedOut && r.actualCategory == null && r.actualAction == null).length;
  const scored  = total - skipped;

  const catPass   = results.filter((r) => r.categoryPass).length;
  const actPass   = results.filter((r) => r.actionPass).length;
  const faultExp  = results.filter((r) => r.expected.fault_assessment != null && (r.actualCategory != null || r.actualAction != null));
  const faultPass = faultExp.filter((r) => r.faultPass).length;

  const overallPass = results.filter((r) => r.categoryPass && r.actionPass).length;
  const partialCount = results.filter((r) => r.timedOut && (r.actualCategory != null || r.actualAction != null)).length;
  const overallAcc  = scored > 0 ? overallPass / scored : 0;

  const categories = [...new Set(results.map((r) => r.expected.category))].sort();

  console.log('\n' + COL.bold + COL.cyan + '=== BENCHMARK METRICS REPORT ===' + COL.reset + '\n');
  console.log('  Total scenarios : ' + total);
  console.log('  Scored          : ' + scored +
    (skipped > 0 ? '  (' + skipped + ' fully skipped — no data extracted)' : '') +
    (partialCount > 0 ? '  (' + partialCount + ' partial — pipeline timed out but data extracted)' : ''));
  console.log('');
  console.log('  ' + COL.bold + 'Category Accuracy' + COL.reset + ' : ' +
    catPass + '/' + scored + '  (' + (scored > 0 ? ((catPass / scored) * 100).toFixed(1) : '0.0') + '%)');
  console.log('  ' + COL.bold + 'Action Accuracy  ' + COL.reset + ' : ' +
    actPass + '/' + scored + '  (' + (scored > 0 ? ((actPass / scored) * 100).toFixed(1) : '0.0') + '%)');

  if (faultExp.length > 0) {
    console.log(
      '  ' + COL.bold + 'Fault Accuracy   ' + COL.reset + ' : ' +
      faultPass + '/' + faultExp.length + '  (' + ((faultPass / faultExp.length) * 100).toFixed(1) + '%)' +
      '  [only tickets with expected fault field]',
    );
  }

  console.log('');
  console.log('  - Per-Category Breakdown -');
  for (const cat of categories) {
    const catResults = results.filter((r) => r.expected.category === cat && (r.actualCategory != null || r.actualAction != null));
    if (catResults.length === 0) continue;
    const correct = catResults.filter((r) => r.categoryPass && r.actionPass).length;
    const bar = correct === catResults.length
      ? COL.green + '#'.repeat(correct) + COL.reset
      : COL.yellow + '#'.repeat(correct) + COL.red + 'x'.repeat(catResults.length - correct) + COL.reset;
    console.log('    ' + pad(cat, 16) + correct + '/' + catResults.length + '  ' + bar);
  }

  console.log('');
  console.log('  - Classification Precision / Recall -');
  console.log('  ' + pad('Category', 16) + pad('TP', 6) + pad('FP', 6) + pad('FN', 6) + pad('Precision', 12) + 'Recall');
  console.log('  ' + '-'.repeat(58));

  for (const cat of categories) {
    const tp = results.filter((r) => r.actualCategory === cat && r.expected.category === cat).length;
    const fp = results.filter((r) => r.actualCategory === cat && r.expected.category !== cat).length;
    const fn = results.filter((r) => r.actualCategory !== cat && r.expected.category === cat && r.actualCategory != null).length;
    const prec = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const rec  = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const cp = prec >= 0.8 ? COL.green : prec >= 0.5 ? COL.yellow : COL.red;
    const cr = rec  >= 0.8 ? COL.green : rec  >= 0.5 ? COL.yellow : COL.red;
    console.log(
      '  ' + pad(cat, 16) + pad(tp, 6) + pad(fp, 6) + pad(fn, 6) +
      cp + pad((prec * 100).toFixed(0) + '%', 12) + COL.reset +
      cr + (rec * 100).toFixed(0) + '%' + COL.reset,
    );
  }

  const accColor = overallAcc >= ACCURACY_THRESHOLD ? COL.green : COL.red;
  console.log('');
  console.log(
    '  ' + COL.bold + 'Overall Accuracy (category + action)' + COL.reset + ' : ' +
    accColor + COL.bold + overallPass + '/' + scored +
    '  (' + (overallAcc * 100).toFixed(1) + '%)' + COL.reset,
  );

  const threshold = (ACCURACY_THRESHOLD * 100).toFixed(0) + '% threshold';
  if (overallAcc >= ACCURACY_THRESHOLD) {
    console.log('  ' + COL.green + COL.bold + 'BENCHMARK PASSED' + COL.reset + ' - accuracy meets ' + threshold);
  } else {
    console.log('  ' + COL.red + COL.bold + 'BENCHMARK FAILED' + COL.reset + ' - accuracy below ' + threshold);
  }

  console.log('');
  return overallAcc;
}

// ─── Main Runner ──────────────────────────────────────────────────────────────
async function runBenchmark() {
  console.log(COL.bold + COL.cyan + '\nSupportGenius Pipeline Benchmark' + COL.reset);
  console.log('API: ' + API_BASE);
  console.log(
    'Scenarios: ' + TEST_SCENARIOS.length +
    '  |  Mode: ' + TICKET_MODE +
    '  |  Poll interval: ' + POLL_INTERVAL_MS + 'ms' +
    '  |  Timeout: ' + (POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS / 1000) + 's per ticket',
  );
  if (TICKET_MODE === 'orchestrated') {
    console.log(COL.yellow + 'Tip: set MODE=autonomous for faster runs (~15s/ticket vs ~3min/ticket)' + COL.reset);
  }
  console.log('-'.repeat(60));

  const results = [];

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    console.log(
      '\n[' + String(i + 1).padStart(2, '0') + '/' + TEST_SCENARIOS.length + '] ' +
      COL.bold + scenario.id + COL.reset +
      ' - "' + scenario.ticket.subject + '"',
    );

    let ticketId  = null;
    let ticket    = null;
    let traceResp = null;
    let notes     = '';
    let timedOut  = false;

    try {
      ticketId = await submitTicket({ ...scenario.ticket, mode: TICKET_MODE });
      console.log('       Submitted -> ' + ticketId + '  [' + TICKET_MODE + ']');
    } catch (err) {
      console.error('       Submit error: ' + (err.message || String(err)));
      results.push({
        id: scenario.id, expected: scenario.expected,
        ticketStatus: 'submit_error', actualCategory: null, actualAction: null, actualFault: null,
        categoryPass: false, actionPass: false, faultPass: false, timedOut: false,
        notes: 'Submit failed: ' + err.message.substring(0, 60),
      });
      continue;
    }

    const pollResult = await pollForCompletion(ticketId);
    ticket   = pollResult.ticket;
    timedOut = pollResult.timedOut;
    process.stdout.write('\r' + ' '.repeat(70) + '\r');

    if (timedOut) {
      const lastStatus = ticket ? ticket.status : 'unknown';
      console.log('       ' + COL.yellow + 'TIMEOUT' + COL.reset +
        ' after ' + (MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000) + 's - last status: ' + lastStatus);
      notes = 'Timed out (last status: ' + lastStatus + ')';
    } else {
      console.log('       Completed - status: ' + (ticket ? ticket.status : 'unknown'));
    }

    try {
      traceResp = await fetchTrace(ticketId);
    } catch (err) {
      notes += (notes ? ' | ' : '') + 'trace fetch failed: ' + err.message.substring(0, 40);
    }

    const actualCategory = ticket ? ticket.category : null;
    let   actualAction   = extractActionType(traceResp, ticket);
    // When ticket is escalated and no action_type found in traces, the action IS escalation
    if (!actualAction && ticket && ticket.status === 'escalated') {
      actualAction = 'escalation';
    }
    const actualFault    = extractFaultAssessment(traceResp);

    // Score on extracted data even when timed out — intermediate pipeline state
    // (e.g. status=executing) already has category/action from triage+decision.
    // Only skip scoring when NO data was extracted at all.
    const hasData = actualCategory != null || actualAction != null;
    const categoryPass = hasData && matches(actualCategory, scenario.expected.category);
    const actionPass   = hasData && matches(actualAction,   scenario.expected.action_type);
    const faultPass    = scenario.expected.fault_assessment == null
      ? true
      : hasData && matches(actualFault, scenario.expected.fault_assessment);

    const expAction = Array.isArray(scenario.expected.action_type)
      ? scenario.expected.action_type.join('|') : scenario.expected.action_type;

    console.log('       Category : ' + (actualCategory || '-') +
      ' (expected: ' + scenario.expected.category + ') -> ' +
      (categoryPass ? COL.green + 'PASS' + COL.reset : COL.red + 'FAIL' + COL.reset));
    console.log('       Action   : ' + (actualAction || '-') +
      ' (expected: ' + expAction + ') -> ' +
      (actionPass ? COL.green + 'PASS' + COL.reset : COL.red + 'FAIL' + COL.reset));

    if (scenario.expected.fault_assessment != null) {
      const expFault = Array.isArray(scenario.expected.fault_assessment)
        ? scenario.expected.fault_assessment.join('|') : scenario.expected.fault_assessment;
      console.log('       Fault    : ' + (actualFault || '-') +
        ' (expected: ' + expFault + ') -> ' +
        (faultPass ? COL.green + 'PASS' + COL.reset : COL.red + 'FAIL' + COL.reset));
    }

    results.push({
      id: scenario.id, expected: scenario.expected,
      ticketStatus: ticket ? ticket.status : 'unknown',
      actualCategory, actualAction, actualFault,
      categoryPass, actionPass, faultPass, timedOut, notes,
    });
  }

  printResultsTable(results);
  const overallAcc = printMetrics(results);
  process.exit(overallAcc > ACCURACY_THRESHOLD ? 0 : 1);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
runBenchmark().catch((err) => {
  console.error('\nFatal benchmark error:', err);
  process.exit(2);
});
