# Security Specification — 3D Print Manager & Precificador

## 1. Data Invariants

1. **Identity Ownership (`ownerId`)**: Every document in `/quotes/{quoteId}`, `/transactions/{transactionId}`, `/spools/{spoolId}`, `/products/{productId}`, and `/sales/{saleId}` MUST have an `ownerId` matching `request.auth.uid`, validated with `^[a-zA-Z0-9_\-]+$` and length `1..128`.
2. **Verified Authentication**: Every standard write operation (`create`, `update`, `delete`) requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates `isValidId(docId)` (`size() <= 128` and regex `^[a-zA-Z0-9_\-]+$`). `list` operations do NOT call `isValidId` on path variables, and instead enforce `resource.data.ownerId == request.auth.uid`.
4. **Strict Key Allowlisting & Anti-Shadow Fields**: Every `create` checks `data.keys().hasAll(...) && data.keys().hasOnly(...)`. Every `update` checks `isValid[Entity](incoming())` first, then restricts mutated fields via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
5. **Terminal State Locking**: Once a `Quote` reaches `status == 'completed'` or a `Sale` reaches `status == 'concluida'`, no further updates are permitted (`existing().status != 'completed'` and `existing().status != 'concluida'`).
6. **Temporal Integrity & Immortal Fields**: On `create`, `createdAt == request.time && updatedAt == request.time`. On `update`, `createdAt == existing().createdAt && ownerId == existing().ownerId && updatedAt == request.time`.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Quote/Product/Sale Create**: `{ "ownerId": "other_user_123", ... }` -> Rejected (`ownerId != request.auth.uid`).
2. **Unverified Email Write**: Valid Quote/Sale payload sent by user with `request.auth.token.email_verified == false` -> Rejected (`isVerifiedUser()` fails).
3. **Shadow Field Injection on Transaction/Product Create**: Valid payload plus `"isAdmin": true` -> Rejected (`keys().hasOnly(...)` fails).
4. **Path ID Poisoning**: Creating `/products/invalid$id!with*bad^chars` -> Rejected (`isValidId(productId)` fails).
5. **Terminal State Bypass on Completed Quote/Sale**: Updating a Quote where `existing().status == 'completed'` or Sale where `existing().status == 'concluida'` -> Rejected.
6. **Immortal Field Mutation (`ownerId` transfer)**: Updating `ownerId` on an existing `/spools/{spoolId}` or `/products/{productId}` document -> Rejected (`incoming().ownerId == existing().ownerId` and `affectedKeys().hasOnly(...)` fail).
7. **Immortal Field Mutation (`createdAt` tampering)**: Updating `createdAt` on an existing `/transactions/{transactionId}` document -> Rejected (`incoming().createdAt == existing().createdAt` fails).
8. **Client Timestamp Forgery**: Creating a `/sales/{saleId}` document with a past or future `createdAt` != `request.time` -> Rejected (`incoming().createdAt == request.time` fails).
9. **Value Poisoning on Update (Oversized String)**: Updating `name` on `/products/{productId}` with a 5000-character string -> Rejected (`isValidProduct(incoming())` enforces `size() <= 150`).
10. **Invalid Enum Injection**: Creating `/sales/{saleId}` with `paymentMethod: "crypto"` -> Rejected (`paymentMethod` enum validation fails).
11. **Negative Inventory Weight/Stock Poisoning**: Updating `/spools/{spoolId}` or `/products/{productId}` with negative stock/weight -> Rejected (`>= 0` fails).
12. **Cross-Tenant List Scraping**: Querying `/sales` or `/products` without filtering `where('ownerId', '==', request.auth.uid)` -> Rejected (`allow list` enforces `resource.data.ownerId == request.auth.uid`).
