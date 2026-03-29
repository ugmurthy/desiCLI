import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render } from '../core/output.ts';
import { handleError } from '../core/errors.ts';

export function registerCostsCommands(program: Command) {
  const costs = program.command('costs').description('View cost information');

  costs
    .command('summary')
    .description('Get overall cost summary (admin)')
    .option('--start-date <date>', 'Start date (ISO format)')
    .option('--end-date <date>', 'End date (ISO format)')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching cost summary...').start();
        const result = await client.costs.getSummary({
          startDate: opts.startDate,
          endDate: opts.endDate,
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  costs
    .command('my-summary')
    .description('Get your cost summary')
    .option('--start-date <date>', 'Start date (ISO format)')
    .option('--end-date <date>', 'End date (ISO format)')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching your cost summary...').start();
        const result = await client.costs.getMySummary({
          startDate: opts.startDate,
          endDate: opts.endDate,
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  costs
    .command('dag <id>')
    .description('Get cost details for a DAG')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching DAG costs...').start();
        const result = await client.costs.getDagsById({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  costs
    .command('execution <id>')
    .description('Get cost details for an execution')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching execution costs...').start();
        const result = await client.costs.getExecutionsById({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });
}
