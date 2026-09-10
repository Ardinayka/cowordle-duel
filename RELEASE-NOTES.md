# Production preparation

This release adds shared D1 request limits (independent create/auth/search/play/exit budgets), request-triggered bounded cleanup, accessible board review, short-screen overflow fallback, and four static public guides with a sitemap and canonical metadata.

Cleanup is attempted once per minute during API traffic, up to 500 records per table. It is not a wall-clock retention guarantee while idle. Request-limit keys contain hashed IP/session identifiers, not raw addresses. This is abuse reduction, not DDoS protection.

Remaining launch gates: physical iOS/Android QA, scheduled cleanup support, production capacity/load checks, confirmed backup export and restore workflow, cost monitoring, verified data residency, complete controller/contact/privacy and terms details, brand clearance, permanent domain and Search Console verification. No payment destination, paid features, domain purchase or migration is included.

Source tests use SQLite and a simulated DOM. Browser security policy prevented visual testing in this session. Public guide canonicals and sitemap currently use https://lexivanto-beta.garrettardi.chatgpt.site and must change together when the permanent domain is approved.
