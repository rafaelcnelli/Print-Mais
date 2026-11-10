import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Phase 0 Security Specification & Rule Structure Verification Test Runner
const rulesContent = () => fs.readFileSync('./firestore.rules', 'utf8');

test('Firestore rules enforce default deny catch-all at top', () => {
  const rules = rulesContent();
  assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
});

test('Firestore rules enforce Dirty Dozen guards (verified email, isValidId, strict keys, terminal state locking, request.time)', () => {
  const rules = rulesContent();
  // 1 & 2. Identity & Verified User
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  assert.ok(rules.includes('data.ownerId == request.auth.uid'));
  // 3. Shadow field guard via hasAll and hasOnly
  assert.ok(rules.includes('.keys().hasAll('));
  assert.ok(rules.includes('.keys().hasOnly('));
  // 4. Path ID hardening across all 5 collections
  assert.ok(rules.includes('isValidId(quoteId)'));
  assert.ok(rules.includes('isValidId(transactionId)'));
  assert.ok(rules.includes('isValidId(spoolId)'));
  assert.ok(rules.includes('isValidId(productId)'));
  assert.ok(rules.includes('isValidId(saleId)'));
  // 5. Terminal state locking on Quote and Sale
  assert.ok(rules.includes("existing().status != 'completed'"));
  assert.ok(rules.includes("existing().status != 'concluida'"));
  // 6 & 7 & 8. Temporal integrity and immutable fields
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));
  assert.ok(rules.includes('incoming().createdAt == existing().createdAt'));
  assert.ok(rules.includes('incoming().ownerId == existing().ownerId'));
  // 12. Query enforcer on list
  assert.ok(rules.includes('allow list: if isSignedIn() && existing().ownerId == request.auth.uid;'));
});
