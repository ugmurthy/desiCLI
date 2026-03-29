import { ApiClient } from 'desiClient';
import chalk from 'chalk';
import { ConfigManager } from './config.ts';
import { TokenStore } from './credentials.ts';

export function getClient(opts?: {
  token?: string;
  apiUrl?: string;
  profile?: string;
  verbose?: boolean;
}): ApiClient {
  const configManager = new ConfigManager();
  const tokenStore = new TokenStore();
  const profile = configManager.getProfile(opts?.profile);

  // Token resolution: flag > env > stored credential
  const token =
    opts?.token ||
    process.env.DESI_API_TOKEN ||
    tokenStore.getToken(opts?.profile ?? configManager.getConfig().defaultProfile) ||
    undefined;

  // API URL resolution: flag > env > profile > default
  const apiUrl =
    opts?.apiUrl ??
    process.env.DESI_BACKEND_URL ??
    profile.apiUrl ??
    'http://localhost:3000';

  if (opts?.verbose) {
    console.error(chalk.dim(`[debug] API URL: ${apiUrl}`));
    console.error(chalk.dim(`[debug] Token: ${token ? token.slice(0, 12) + '…' : '(none)'}`));
    console.error(chalk.dim(`[debug] Profile: ${opts?.profile ?? configManager.getConfig().defaultProfile}`));
  }

  const client = new ApiClient({
    baseUrl: apiUrl,
    token,
    timeout: 0,
  });

  if (opts?.verbose) {
    installVerboseInterceptors(client, apiUrl);
  }

  return client;
}

function installVerboseInterceptors(client: ApiClient, baseUrl: string): void {
  // Access the underlying axios instance via a request/response wrapper
  // We monkey-patch the client's service methods aren't directly accessible,
  // so we use the ApiClient's internal axios interceptors via its constructor pattern.
  // Since ApiClient uses axios internally and exposes it through the constructor,
  // we can hook into requests by wrapping the methods.
  const axiosInstance = (client as any).client;
  if (!axiosInstance?.interceptors) return;

  axiosInstance.interceptors.request.use((config: any) => {
    const method = (config.method ?? 'GET').toUpperCase();
    const url = config.url ?? '';
    console.error(chalk.dim(`[debug] → ${method} ${url}`));
    if (config.params) {
      console.error(chalk.dim(`[debug]   params: ${JSON.stringify(config.params)}`));
    }
    if (config.data) {
      console.error(chalk.dim(`[debug]   body: ${JSON.stringify(config.data)}`));
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response: any) => {
      console.error(chalk.dim(`[debug] ← ${response.status} ${response.statusText ?? ''}`));
      return response;
    },
    (error: any) => {
      if (error.response) {
        console.error(chalk.dim(`[debug] ← ${error.response.status} ${error.response.statusText ?? ''}`));
        if (error.response.data) {
          console.error(chalk.dim(`[debug]   body: ${JSON.stringify(error.response.data)}`));
        }
      } else {
        console.error(chalk.dim(`[debug] ← Error: ${error.message}`));
      }
      throw error;
    }
  );
}
