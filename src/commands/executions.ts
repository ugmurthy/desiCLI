import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render, success } from '../core/output.ts';
import { handleError } from '../core/errors.ts';
import { promptConfirm } from '../utils/prompts.ts';

export function registerExecutionsCommands(program: Command) {
  const executions = program.command('executions').description('Manage executions');

  executions
    .command('list')
    .description('List executions')
    .option('--status <status>', 'Filter by status')
    .option('--dag-id <id>', 'Filter by DAG ID')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip results', '0')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching executions...').start();
        const result = await client.executions.list({
          status: opts.status,
          dagId: opts.dagId,
          limit: parseInt(opts.limit, 10),
          offset: parseInt(opts.offset, 10),
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  executions
    .command('get <id>')
    .description('Get an execution by ID')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching execution...').start();
        const result = await client.executions.getById({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  executions
    .command('details <id>')
    .description('Get execution with sub-step details')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching execution details...').start();
        const result = await client.executions.getByIdDetails({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  executions
    .command('events <id>')
    .description('Stream execution events')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching events...').start();
        const result = await client.executions.getEvents({ id });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt === 'json') {
          console.log(JSON.stringify(result));
        } else {
          console.log(result);
        }
      } catch (err) {
        handleError(err);
      }
    });

  executions
    .command('steps <id>')
    .description('Get execution sub-steps')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching steps...').start();
        const result = await client.executions.getSubSteps({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  executions
    .command('resume <id>')
    .description('Resume a suspended execution')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Resuming execution...').start();
        const result = await client.executions.resume({ id });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('Execution resumed.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  executions
    .command('delete <id>')
    .description('Delete an execution')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, opts) => {
      try {
        if (!opts.yes) {
          const confirmed = await promptConfirm(`Delete execution ${id}?`);
          if (!confirmed) return;
        }
        const client = getClient(program.opts());
        const spinner = ora('Deleting execution...').start();
        await client.executions.deleteById({ id });
        spinner.stop();
        if ((program.opts().output ?? 'table') !== 'json') success('Execution deleted.');
      } catch (err) {
        handleError(err);
      }
    });
}
