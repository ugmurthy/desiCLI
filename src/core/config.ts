import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface Profile {
  apiUrl?: string;
  tenantSlug?: string;
  output?: 'table' | 'json' | 'plain';
  defaultAgent?: string;
}

export interface Config {
  defaultProfile: string;
  profiles: Record<string, Profile>;
}

const CONFIG_DIR = join(homedir(), '.desi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function defaultConfig(): Config {
  return {
    defaultProfile: 'default',
    profiles: {
      default: {
        apiUrl: 'http://localhost:3000',
      },
    },
  };
}

export class ConfigManager {
  private config: Config;

  constructor() {
    this.config = this.load();
  }

  load(): Config {
    if (!existsSync(CONFIG_FILE)) {
      const config = defaultConfig();
      this.save(config);
      return config;
    }
    try {
      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw) as Config;
    } catch {
      return defaultConfig();
    }
  }

  save(config?: Config): void {
    const data = config ?? this.config;
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2) + '\n');
    this.config = data;
  }

  getProfile(name?: string): Profile {
    const profileName = name ?? this.config.defaultProfile;
    return this.config.profiles[profileName] ?? {};
  }

  setProfile(name: string, profile: Profile): void {
    this.config.profiles[name] = profile;
    this.save();
  }

  getConfig(): Config {
    return this.config;
  }
}
