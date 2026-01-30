import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { query } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface User {
  id: number;
  username: string;
  email?: string;
  created_at: Date;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string
    };
  } catch {
    return null;
  }
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const result = await query(
    'SELECT id, username, password, email, created_at FROM users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    created_at: user.created_at
  };
}

export async function createUser(username: string, password: string, email?: string): Promise<User> {
  const hashedPassword = await hashPassword(password);

  const result = await query(
    'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
    [username, hashedPassword, email || null]
  );

  return result.rows[0];
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await query(
    'SELECT id, username, email, created_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
