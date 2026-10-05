import assert from 'node:assert/strict';

const baseUrl = process.env.TICKETDESK_BASE_URL ?? 'http://localhost:5080';
const email = process.env.TICKETDESK_EMAIL ?? 'admin@ticketdesk.local';
const password = process.env.TICKETDESK_PASSWORD ?? 'TicketDesk123!';
const checks = [];
const check = (name, callback) => {
  callback();
  checks.push(name);
  process.stdout.write(`✓ ${name}\n`);
};

async function json(response) {
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: 'wrong-password-for-test' }),
});
check('invalid login is rejected with 401', () => assert.equal(badLogin.status, 401));

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginBody = await json(login);
check('valid login returns a bearer token', () => {
  assert.equal(login.status, 200);
  assert.equal(typeof loginBody?.token, 'string');
  assert.ok(loginBody.token.length > 20);
  assert.equal(loginBody.name, 'Demo Admin');
});
const headers = { authorization: `Bearer ${loginBody.token}`, 'content-type': 'application/json' };

const initialResponse = await fetch(`${baseUrl}/api/tickets`, { headers });
const initialTickets = await json(initialResponse);
check('ticket listing returns an array of ticket records', () => {
  assert.equal(initialResponse.status, 200);
  assert.ok(Array.isArray(initialTickets));
  if (initialTickets.length) {
    for (const field of ['id', 'title', 'status', 'priority', 'requester']) assert.ok(field in initialTickets[0]);
  }
});

const filteredResponse = await fetch(`${baseUrl}/api/tickets?status=Open`, { headers });
const filteredTickets = await json(filteredResponse);
check('status filter returns only open tickets', () => {
  assert.equal(filteredResponse.status, 200);
  assert.ok(filteredTickets.every(ticket => ticket.status === 'Open'));
});

const uniqueTitle = `API regression ${Date.now()}`;
let createdId;
try {
  const createResponse = await fetch(`${baseUrl}/api/tickets`, {
    method: 'POST', headers,
    body: JSON.stringify({ title: uniqueTitle, description: 'Created by automated API regression checks.', category: 'Software', priority: 'High', status: 'Open', requester: 'API Test Runner', assignee: 'QA Analyst' }),
  });
  const created = await json(createResponse);
  createdId = created?.id;
  check('ticket creation returns 201 with a new open ticket', () => {
    assert.equal(createResponse.status, 201);
    assert.equal(typeof createdId, 'number');
    assert.equal(created.title, uniqueTitle);
    assert.equal(created.status, 'Open');
  });

  const updateResponse = await fetch(`${baseUrl}/api/tickets/${createdId}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ...created, title: uniqueTitle, description: 'Updated by automated API regression checks.', priority: 'Critical', status: 'In Progress', assignee: 'QA Analyst' }),
  });
  check('ticket update returns 204', () => assert.equal(updateResponse.status, 204));

  const dashboardResponse = await fetch(`${baseUrl}/api/tickets/dashboard`, { headers });
  const dashboard = await json(dashboardResponse);
  check('dashboard reports numeric ticket counts including the updated critical ticket', () => {
    assert.equal(dashboardResponse.status, 200);
    for (const field of ['total', 'open', 'inProgress', 'resolved', 'critical']) assert.equal(typeof dashboard[field], 'number');
    assert.ok(dashboard.total >= initialTickets.length + 1);
    assert.ok(dashboard.critical >= 1);
  });

  const deleteResponse = await fetch(`${baseUrl}/api/tickets/${createdId}`, { method: 'DELETE', headers });
  check('ticket deletion returns 204', () => assert.equal(deleteResponse.status, 204));

  const finalResponse = await fetch(`${baseUrl}/api/tickets`, { headers });
  const finalTickets = await json(finalResponse);
  check('deleted ticket is absent from the ticket list', () => {
    assert.equal(finalResponse.status, 200);
    assert.ok(finalTickets.every(ticket => ticket.id !== createdId));
  });
} finally {
  if (createdId) {
    const cleanup = await fetch(`${baseUrl}/api/tickets/${createdId}`, { method: 'DELETE', headers });
    if (cleanup.status !== 204 && cleanup.status !== 404) process.stderr.write(`Cleanup warning: delete returned ${cleanup.status}\n`);
  }
}

process.stdout.write(`\n${checks.length} API checks passed.\n`);
