export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, google_sub TEXT NOT NULL UNIQUE, email TEXT NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_nonces (nonce_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS businesses (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS businesses_owner ON businesses(owner_id);
CREATE TABLE IF NOT EXISTS business_images (id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, position INTEGER NOT NULL, mime TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS images_business ON business_images(business_id, position);
CREATE TABLE IF NOT EXISTS public_businesses (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS public_business_images (id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES public_businesses(id) ON DELETE CASCADE, position INTEGER NOT NULL, mime TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS public_images_business ON public_business_images(business_id, position);
CREATE TABLE IF NOT EXISTS product_images (id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES public_businesses(id) ON DELETE CASCADE, product_index INTEGER NOT NULL, position INTEGER NOT NULL, mime TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS product_images_business ON product_images(business_id, product_index, position);
CREATE TABLE IF NOT EXISTS business_management (business_id TEXT PRIMARY KEY REFERENCES public_businesses(id) ON DELETE CASCADE, token_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS publication_limits (bucket TEXT PRIMARY KEY, total INTEGER NOT NULL, expires_at INTEGER NOT NULL);
`;

