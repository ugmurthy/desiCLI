import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render } from '../core/output.ts';
import { handleError } from '../core/errors.ts';

export function registerBillingCommands(program: Command) {
  const billing = program.command('billing').description('View billing information');

  billing
    .command('usage')
    .description('Get current billing period usage')
    .action(async () => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching usage...').start();
        const result = await client.billing.getUsage();
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  billing
    .command('history')
    .description('Get usage history')
    .option('--start-date <date>', 'Start date (ISO format)')
    .option('--end-date <date>', 'End date (ISO format)')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip results', '0')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching usage history...').start();
        const result = await client.billing.getUsageHistory({
          startDate: opts.startDate,
          endDate: opts.endDate,
          limit: parseInt(opts.limit, 10),
          offset: parseInt(opts.offset, 10),
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  billing
    .command('invoices')
    .description('List invoices')
    .option('--status <status>', 'Filter by status (draft|pending|paid|cancelled)')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip results', '0')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching invoices...').start();
        const result = await client.billing.getInvoices({
          status: opts.status,
          limit: parseInt(opts.limit, 10),
          offset: parseInt(opts.offset, 10),
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  billing
    .command('invoice <id>')
    .description('Get invoice details')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching invoice...').start();
        const result = await client.billing.getInvoicesById({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });
}
