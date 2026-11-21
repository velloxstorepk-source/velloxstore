# VELOXX Firestore Security Specification

## 1. Data Invariants
1. **Single Owner Admin**: Only ONE `storeConfig/owner` and ONE `admins/{uid}` document can ever exist. They must be created atomically together when `storeConfig/owner` does not yet exist. No subsequent user can ever elevate themselves to `'owner'` or create another `admins/{uid}` record.
2. **Role Integrity**: Normal customers in `users/{uid}` can only be created with `role == 'customer'` (unless `isAdmin()`), and can never mutate their `role` field on update.
3. **PII Isolation**: Customer PII (`users/{uid}`, `users/{uid}/addresses`, `orders/{orderId}`) can only be read by the owning `request.auth.uid` or the verified Owner Admin. Public order tracking uses `orderTracking/{orderNumber}` containing zero PII and forbids `list` queries.
4. **Order Integrity**: Orders must have `paymentMethod == 'COD'`, `status == 'Pending'` on create, positive totals, bounded `items` array (<= 50 items), and `createdAt == request.time`. Orders cannot skip states or be deleted by customers.
5. **Email Spoofing Guard**: Any rule checking `request.auth.token.email` strictly mandates `request.auth.token.email_verified == true`.
6. **Admin Secrets Isolation**: Owner email/Gmail lives in `storeConfig/owner` (readable only by `isAdmin()`). OAuth tokens and SMTP credentials are never stored in Firestore.

## 2. Dirty Dozen Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Duplicate Owner Creation**: Authenticated customer writes `admins/{theirUid}` after `storeConfig/owner` already exists.
2. **Self-Role Escalation on Create**: Customer creates `users/{uid}` with `role: "owner"`.
3. **Self-Role Escalation on Update**: Customer updates `users/{uid}` changing `role` from `"customer"` to `"owner"`.
4. **Unverified Admin Email Spoof**: User with `email: "vellox.store.pk@gmail.com"` and `email_verified: false` tries to read `orders` or write `products`.
5. **Cross-User Order Read**: Customer A tries `get(/orders/{orderB})` or `list(/orders)` without `where('userId', '==', uidA)`.
6. **Customer Status Bypass**: Customer tries to update `orders/{orderId}` setting `status: "Delivered"` or altering `totalAmount`.
7. **Shadow Field Injection on Order**: Payload includes extra ghost key `isPaidOverride: true` on `orders/{orderId}`.
8. **Product Price Tampering**: Non-admin tries to update `products/{id}` changing `price` to `1`.
9. **Coupon Scraping**: Non-admin runs `list` on `/coupons`.
10. **Path ID Poisoning**: Attacker writes document with 500-char ID or invalid characters (`../admin`).
11. **Timestamp Forgery**: Payload submits backdated `createdAt` instead of `request.time`.
12. **Owner Config Exposure**: Unauthenticated or customer user attempts `get(/storeConfig/owner)` or `list(/emailNotificationLogs)`.
