import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render, success, info } from '../core/output.ts';
import { handleError } from '../core/errors.ts';
import { TokenStore } from '../core/credentials.ts';
import { ConfigManager } from '../core/config.ts';
import { promptText, promptPassword, promptConfirm } from '../utils/prompts.ts';

export function registerAuthCommands(program: Command) {
  const auth = program.command('auth').description('Authentication & account management');

  // --- signup ---
  auth
    .command('signup')
    .description('Create a new account')
    .option('--tenant <slug>', 'Tenant slug')
    .action(async (opts) => {
      try {
        const tenant = opts.tenant ?? (await promptText('Tenant slug'));
        const name = await promptText('Your name');
        const email = await promptText('Email');
        const password = await promptPassword('Password');

        const client = getClient(program.opts());
        const spinner = ora('Creating account...').start();
        await client.auth.register({
          tenantSlug: tenant,
          body: { name, email, password },
        });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success(`Account created! Check ${email} to verify.`);
      } catch (err) {
        handleError(err);
      }
    });

  // --- login ---
  auth
    .command('login')
    .description('Log in to your account')
    .option('--tenant <slug>', 'Tenant slug')
    .action(async (opts) => {
      try {
        const configManager = new ConfigManager();
        const profile = configManager.getProfile(program.opts().profile);
        const tenant =
          opts.tenant ?? profile.tenantSlug ?? (await promptText('Tenant slug'));
        const email = await promptText('Email');
        const password = await promptPassword('Password');

        const client = getClient(program.opts());
        const spinner = ora('Logging in...').start();
        const result = await client.auth.login({
          tenantSlug: tenant,
          body: { email, password },
        });
        spinner.stop();

        const fmt = program.opts().output ?? 'table';
        const token = (result as Record<string, unknown>).token as string | undefined;
        if (token) {
          const tokenStore = new TokenStore();
          const profileName = program.opts().profile ?? configManager.getConfig().defaultProfile;
          tokenStore.saveToken(token, email, profileName);
          configManager.setProfile(profileName, { ...profile, tenantSlug: tenant });

          if (fmt === 'json') {
            render(result, fmt);
          } else {
            success(`Logged in as ${email}`);
            info('Token saved to ~/.desi/credentials.json');
          }
        } else {
          if (fmt !== 'json') success('Logged in.');
          render(result, fmt);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // --- logout ---
  auth
    .command('logout')
    .description('Log out and clear stored credentials')
    .action(async () => {
      try {
        const configManager = new ConfigManager();
        const profileName = program.opts().profile ?? configManager.getConfig().defaultProfile;
        const tokenStore = new TokenStore();

        try {
          const client = getClient(program.opts());
          await client.auth.logout();
        } catch {
          // Server logout is best-effort
        }

        tokenStore.clearToken(profileName);
        if ((program.opts().output ?? 'table') !== 'json') success('Logged out. Credentials cleared.');
      } catch (err) {
        handleError(err);
      }
    });

  // --- whoami ---
  auth
    .command('whoami')
    .description('Show current user info')
    .action(async () => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching user info...').start();
        const result = await client.auth.getMe();
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  // --- resend-verification ---
  auth
    .command('resend-verification')
    .description('Resend email verification link')
    .option('--tenant <slug>', 'Tenant slug')
    .action(async (opts) => {
      try {
        const configManager = new ConfigManager();
        const profile = configManager.getProfile(program.opts().profile);
        const tenant =
          opts.tenant ?? profile.tenantSlug ?? (await promptText('Tenant slug'));
        const email = await promptText('Email');

        const client = getClient(program.opts());
        const spinner = ora('Resending verification email...').start();
        await client.auth.resendVerification({
          tenantSlug: tenant,
          body: { email },
        });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success(`Verification email sent to ${email}`);
      } catch (err) {
        handleError(err);
      }
    });

  // --- forgot-password ---
  auth
    .command('forgot-password')
    .description('Request a password reset email')
    .option('--tenant <slug>', 'Tenant slug')
    .action(async (opts) => {
      try {
        const configManager = new ConfigManager();
        const profile = configManager.getProfile(program.opts().profile);
        const tenant =
          opts.tenant ?? profile.tenantSlug ?? (await promptText('Tenant slug'));
        const email = await promptText('Email');

        const client = getClient(program.opts());
        const spinner = ora('Sending password reset email...').start();
        await client.auth.forgotPassword({
          tenantSlug: tenant,
          body: { email },
        });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success(`Password reset email sent to ${email}`);
      } catch (err) {
        handleError(err);
      }
    });

  // --- reset-password ---
  auth
    .command('reset-password')
    .description('Reset password using a reset token')
    .action(async () => {
      try {
        const resetToken = await promptText('Reset token (from email)');
        const newPassword = await promptPassword('New password');

        const client = getClient(program.opts());
        const spinner = ora('Resetting password...').start();
        await client.auth.resetPassword({
          body: { token: resetToken, password: newPassword },
        });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('Password reset successfully. You can now log in.');
      } catch (err) {
        handleError(err);
      }
    });

  // --- api-keys ---
  const apiKeys = auth.command('api-keys').description('Manage API keys');

  apiKeys
    .command('list')
    .description('List your API keys')
    .action(async () => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching API keys...').start();
        const result = await client.auth.getApiKeys();
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  apiKeys
    .command('create')
    .description('Create a new API key')
    .option('--name <name>', 'Key name')
    .action(async (opts) => {
      try {
        const name = opts.name ?? (await promptText('Key name'));
        const client = getClient(program.opts());
        const spinner = ora('Creating API key...').start();
        const result = await client.auth.createApiKeys({ body: { name } });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('API key created.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  apiKeys
    .command('delete <id>')
    .description('Revoke an API key')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, opts) => {
      try {
        if (!opts.yes) {
          const confirmed = await promptConfirm(`Delete API key ${id}?`);
          if (!confirmed) return;
        }
        const client = getClient(program.opts());
        const spinner = ora('Deleting API key...').start();
        await client.auth.deleteApiKeysById({ id });
        spinner.stop();
        if ((program.opts().output ?? 'table') !== 'json') success('API key deleted.');
      } catch (err) {
        handleError(err);
      }
    });
}
