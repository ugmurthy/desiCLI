import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface Credential {
  token: string;
  email: string;
  expiresAt?: string;
}

type Credentials = Record<string, Credential>;

const CONFIG_DIR = join(homedir(), '.desi');
const CRED_FILE = join(CONFIG_DIR, 'credentials.json');

function readCreds(): Credentials {
  if (!existsSync(CRED_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CRED_FILE, 'utf-8')) as Credentials;
  } catch {
    return {};
  }
}

function writeCreds(creds: Credentials): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
  try {
    chmodSync(CRED_FILE, 0o600);
  } catch {
    // best effort on non-POSIX
  }
}

export class TokenStore {
  getToken(profile = 'default'): string | null {
    const creds = readCreds();
    return creds[profile]?.token ?? null;
  }

  getEmail(profile = 'default'): string | null {
    const creds = readCreds();
    return creds[profile]?.email ?? null;
  }

  saveToken(token: string, email: string, profile = 'default'): void {
    const creds = readCreds();
    creds[profile] = { token, email };
    writeCreds(creds);
  }

  clearToken(profile = 'default'): void {
    const creds = readCreds();
    delete creds[profile];
    writeCreds(creds);
  }
}
