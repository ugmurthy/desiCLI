import type { Command } from 'commander';
import { ConfigManager } from '../core/config.ts';
import { render, success, info } from '../core/output.ts';
import { promptText } from '../utils/prompts.ts';

export function registerConfigCommands(program: Command) {
  const config = program.command('config').description('Manage CLI configuration & profiles');

  // --- show ---
  config
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const cm = new ConfigManager();
      render(cm.getConfig(), program.opts().output ?? 'json');
    });

  // --- get ---
  config
    .command('get <key>')
    .description('Get a config value (e.g. defaultProfile, profiles.default.apiUrl)')
    .action((key: string) => {
      const cm = new ConfigManager();
      const cfg = cm.getConfig() as Record<string, unknown>;
      const value = resolvePath(cfg, key);
      if (value === undefined) {
        info(`Key "${key}" not found.`);
        process.exit(1);
      }
      if (typeof value === 'object') {
        render(value, program.opts().output ?? 'json');
      } else {
        console.log(String(value));
      }
    });

  // --- set ---
  config
    .command('set <key> <value>')
    .description('Set a config value (e.g. defaultProfile, profiles.prod.apiUrl)')
    .action((key: string, value: string) => {
      const cm = new ConfigManager();
      const cfg = cm.getConfig() as Record<string, unknown>;
      setPath(cfg, key, value);
      cm.save(cfg as any);
      success(`Set ${key} = ${value}`);
    });

  // --- profile list ---
  const profile = config.command('profile').description('Manage profiles');

  profile
    .command('list')
    .description('List all profiles')
    .action(() => {
      const cm = new ConfigManager();
      const cfg = cm.getConfig();
      const profiles = Object.entries(cfg.profiles).map(([name, p]) => ({
        name,
        apiUrl: p.apiUrl ?? '',
        tenantSlug: p.tenantSlug ?? '',
        output: p.output ?? '',
        active: name === cfg.defaultProfile ? '✓' : '',
      }));
      render(profiles, program.opts().output ?? 'table');
    });

  // --- profile create ---
  profile
    .command('create')
    .description('Create a new profile')
    .option('--name <name>', 'Profile name')
    .option('--api-url <url>', 'API base URL')
    .option('--tenant <slug>', 'Tenant slug')
    .action(async (opts) => {
      const name = opts.name ?? (await promptText('Profile name'));
      const apiUrl = opts.apiUrl ?? (await promptText('API base URL', 'http://localhost:3000'));
      const tenantSlug = opts.tenant ?? (await promptText('Tenant slug (optional)', ''));

      const cm = new ConfigManager();
      cm.setProfile(name, {
        apiUrl,
        tenantSlug: tenantSlug || undefined,
      });
      success(`Profile "${name}" created.`);
    });

  // --- profile use ---
  profile
    .command('use <name>')
    .description('Set the default profile')
    .action((name: string) => {
      const cm = new ConfigManager();
      const cfg = cm.getConfig();
      if (!cfg.profiles[name]) {
        info(`Profile "${name}" does not exist.`);
        process.exit(1);
      }
      cfg.defaultProfile = name;
      cm.save(cfg);
      success(`Default profile set to "${name}".`);
    });

  // --- profile delete ---
  profile
    .command('delete <name>')
    .description('Delete a profile')
    .action((name: string) => {
      const cm = new ConfigManager();
      const cfg = cm.getConfig();
      if (name === cfg.defaultProfile) {
        info('Cannot delete the active default profile. Switch to another profile first.');
        process.exit(1);
      }
      if (!cfg.profiles[name]) {
        info(`Profile "${name}" does not exist.`);
        process.exit(1);
      }
      delete cfg.profiles[name];
      cm.save(cfg);
      success(`Profile "${name}" deleted.`);
    });
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setPath(obj: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
}
