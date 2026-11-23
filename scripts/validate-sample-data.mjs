import { readFile } from 'node:fs/promises';

const file = new URL('../src/data/copilotUpdates.sample.json', import.meta.url);
const records = JSON.parse(await readFile(file, 'utf8'));
const required = [
  'sysId',
  'number',
  'shortDescription',
  'description',
  'product',
  'source',
  'status',
  'priority',
  'state',
  'assignedTo',
  'modifiedOn'
];
const statuses = new Set(['In development', 'Rolling out', 'Generally available', 'Unknown']);
const priorities = new Set(['1', '2', '3', '4', '5']);
const states = new Set(['Assess', 'Plan', 'Implement', 'Monitor', 'Closed']);
const errors = [];
const ids = new Set();
const numbers = new Set();

if (!Array.isArray(records) || records.length === 0) {
  errors.push('The sample must contain at least one record.');
}

for (const [index, record] of records.entries()) {
  for (const field of required) {
    if (typeof record[field] !== 'string' || record[field].trim() === '') {
      errors.push(`Record ${index + 1} has an invalid ${field}.`);
    }
  }
  if (ids.has(record.sysId)) errors.push(`Duplicate sysId: ${record.sysId}`);
  if (numbers.has(record.number)) errors.push(`Duplicate number: ${record.number}`);
  ids.add(record.sysId);
  numbers.add(record.number);
  if (!statuses.has(record.status)) errors.push(`Invalid status: ${record.status}`);
  if (!priorities.has(record.priority)) errors.push(`Invalid priority: ${record.priority}`);
  if (!states.has(record.state)) errors.push(`Invalid state: ${record.state}`);
  if (Number.isNaN(Date.parse(record.modifiedOn))) errors.push(`Invalid modifiedOn: ${record.modifiedOn}`);
  if (record.sourceUrl && !/^https?:\/\//i.test(record.sourceUrl)) {
    errors.push(`Unsafe sourceUrl: ${record.sourceUrl}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${records.length} ServiceNow-style Copilot update records.`);
