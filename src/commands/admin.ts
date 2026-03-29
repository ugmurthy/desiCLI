import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render, success } from '../core/output.ts';
import { handleError } from '../core/errors.ts';
import { promptText, promptConfirm } from '../utils/prompts.ts';

export function registerAdminCommands(program: Command) {
  const admin = program.command('admin').description('Admin operations (requires admin access)');

  const tenants = admin.command('tenants').description('Manage tenants');

  // --- list ---
  tenants
    .command('list')
    .description('List all tenants')
    .option('--status <status>', 'Filter by status: active, suspended, pending')
    .option('--plan <plan>', 'Filter by plan: free, pro, enterprise')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip results', '0')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching tenants...').start();
        const result = await client.admin.getTenants({
          status: opts.status,
          plan: opts.plan,
          limit: opts.limit,
          offset: opts.offset,
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  // --- create ---
  tenants
    .command('create')
    .description('Create a new tenant')
    .option('--name <name>', 'Tenant name')
    .option('--slug <slug>', 'Tenant slug')
    .option('--plan <plan>', 'Plan: free, pro, enterprise')
    .action(async (opts) => {
      try {
        const name = opts.name ?? (await promptText('Tenant name'));
        const slug = opts.slug ?? (await promptText('Tenant slug'));
        const plan = opts.plan ?? 'free';

        const client = getClient(program.opts());
        const spinner = ora('Creating tenant...').start();
        const result = await client.admin.createTenants({
          body: { name, slug, plan },
        });
        spinner.stop();
        success('Tenant created.');
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  // --- get ---
  tenants
    .command('get <id>')
    .description('Get tenant by ID')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching tenant...').start();
        const result = await client.admin.getTenantsById({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  // --- update ---
  tenants
    .command('update <id>')
    .description('Update a tenant')
    .option('--name <name>', 'New tenant name')
    .option('--plan <plan>', 'New plan: free, pro, enterprise')
    .option('--status <status>', 'New status: active, suspended')
    .action(async (id: string, opts) => {
      try {
        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.plan) body.plan = opts.plan;
        if (opts.status) body.status = opts.status;

        const client = getClient(program.opts());
        const spinner = ora('Updating tenant...').start();
        const result = await client.admin.updateTenantsById({ id, body });
        spinner.stop();
        success('Tenant updated.');
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  // --- delete ---
  tenants
    .command('delete <id>')
    .description('Delete or suspend a tenant')
    .option('--action <action>', 'Action: suspend or delete', 'delete')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, opts) => {
      try {
        if (!opts.yes) {
          const confirmed = await promptConfirm(
            `${opts.action === 'suspend' ? 'Suspend' : 'Delete'} tenant ${id}?`
          );
          if (!confirmed) return;
        }

        const client = getClient(program.opts());
        const spinner = ora(`${opts.action === 'suspend' ? 'Suspending' : 'Deleting'} tenant...`).start();
        const result = await client.admin.deleteTenantsById({
          id,
          action: opts.action,
        });
        spinner.stop();
        success(`Tenant ${opts.action === 'suspend' ? 'suspended' : 'deleted'}.`);
        if (result) render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });
}
