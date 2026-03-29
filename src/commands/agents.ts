import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render, success } from '../core/output.ts';
import { handleError } from '../core/errors.ts';
import { promptConfirm } from '../utils/prompts.ts';

export function registerAgentsCommands(program: Command) {
  const agents = program.command('agents').description('Manage agents');

  agents
    .command('list')
    .description('List agents')
    .option('--status <status>', 'Filter by status (active|inactive)')
    .option('--name <name>', 'Filter by name')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip results', '0')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching agents...').start();
        const result = await client.agents.list({
          status: opts.status,
          name: opts.name,
          limit: parseInt(opts.limit, 10),
          offset: parseInt(opts.offset, 10),
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  agents
    .command('get <id>')
    .description('Get an agent by ID')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching agent...').start();
        const result = await client.agents.getById({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  agents
    .command('create')
    .description('Create a new agent')
    .requiredOption('--name <name>', 'Agent name')
    .option('--description <text>', 'Agent description')
    .option('--model <model>', 'Model name')
    .option('--system-prompt <text>', 'System prompt')
    .action(async (opts) => {
      try {
        const body: Record<string, unknown> = { name: opts.name };
        if (opts.description) body.description = opts.description;
        if (opts.model) body.model = opts.model;
        if (opts.systemPrompt) body.systemPrompt = opts.systemPrompt;
        const client = getClient(program.opts());
        const spinner = ora('Creating agent...').start();
        const result = await client.agents.create({ body });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('Agent created.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  agents
    .command('update <id>')
    .description('Update an agent')
    .option('--name <name>', 'Agent name')
    .option('--description <text>', 'Agent description')
    .option('--model <model>', 'Model name')
    .option('--system-prompt <text>', 'System prompt')
    .action(async (id: string, opts) => {
      try {
        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.model) body.model = opts.model;
        if (opts.systemPrompt) body.systemPrompt = opts.systemPrompt;
        const client = getClient(program.opts());
        const spinner = ora('Updating agent...').start();
        const result = await client.agents.updateById({ id, body });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('Agent updated.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  agents
    .command('delete <id>')
    .description('Delete an agent')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, opts) => {
      try {
        if (!opts.yes) {
          const confirmed = await promptConfirm(`Delete agent ${id}?`);
          if (!confirmed) return;
        }
        const client = getClient(program.opts());
        const spinner = ora('Deleting agent...').start();
        await client.agents.deleteById({ id });
        spinner.stop();
        if ((program.opts().output ?? 'table') !== 'json') success('Agent deleted.');
      } catch (err) {
        handleError(err);
      }
    });

  agents
    .command('activate <id>')
    .description('Activate an agent')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Activating agent...').start();
        const result = await client.agents.activate({ id });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('Agent activated.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  agents
    .command('resolve <name>')
    .description('Resolve an agent by name')
    .action(async (name: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Resolving agent...').start();
        const result = await client.agents.resolveByName({ name });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });
}
