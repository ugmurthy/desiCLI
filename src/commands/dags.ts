import type { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getClient } from '../core/client.ts';
import { ConfigManager } from '../core/config.ts';
import { render, success } from '../core/output.ts';
import { handleError } from '../core/errors.ts';
import { promptConfirm } from '../utils/prompts.ts';
import { monitorExecution } from '../utils/monitor.ts';

function resolveAgentName(opts: { agent?: string }, profileName?: string): string | undefined {
  if (opts.agent) return opts.agent;
  const configManager = new ConfigManager();
  return configManager.getProfile(profileName).defaultAgent;
}

export function registerDagsCommands(program: Command) {
  const dags = program.command('dags').description('Manage DAGs');
  const updateScheduledDag = async (id: string, action: 'activate' | 'deactivate') => {
    const client = getClient(program.opts());
    const verb = action === 'activate' ? 'Activating' : 'Deactivating';
    const spinner = ora(`${verb} DAG schedule...`).start();
    const result = await client.dags.activateScheduled({
      body: { dagId: id, action },
    });
    spinner.stop();
    const fmt = program.opts().output ?? 'table';
    if (fmt !== 'json') success(`DAG schedule ${action}d.`);
    render(result, fmt);
  };

  dags
    .command('list')
    .description('List all DAGs')
    .option('--status <status>', 'Filter by status')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Skip results', '0')
    .option('--created-after <date>', 'Filter by creation date (after)')
    .option('--created-before <date>', 'Filter by creation date (before)')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching DAGs...').start();
        const result = await client.dags.list({
          status: opts.status,
          createdAfter: opts.createdAfter,
          createdBefore: opts.createdBefore,
          limit: parseInt(opts.limit, 10),
          offset: parseInt(opts.offset, 10),
        });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('get <id>')
    .description('Get a DAG by ID')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching DAG...').start();
        const result = await client.dags.getById({ id });
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('create')
    .description('Create a DAG from a goal')
    .requiredOption('--goal <text>', 'Goal text')
    .option('--agent <name>', 'Agent name')
    .option('--temperature <n>', 'Temperature', '0.7')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Creating DAG...').start();
        const body: Record<string, unknown> = {
          goalText: opts.goal,
          temperature: parseFloat(opts.temperature),
        };
        const agentName = resolveAgentName(opts, program.opts().profile);
        if (agentName) body.agentName = agentName;
        const result = await client.dags.create({ body });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('DAG created.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('execute <id>')
    .description('Execute a DAG')
    .action(async (id: string) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Executing DAG...').start();
        const result = await client.dags.execute({ id, body: {} });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('DAG execution started.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('run')
    .description('Create and execute a DAG in one step')
    .requiredOption('--goal <text>', 'Goal text')
    .option('--agent <name>', 'Agent name')
    .option('--temperature <n>', 'Temperature', '0.7')
    .option('--no-monitor', 'Skip event monitoring after execution starts')
    .action(async (opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Creating and executing DAG...').start();
        const body: Record<string, unknown> = {
          goalText: opts.goal,
          temperature: parseFloat(opts.temperature),
        };
        const agentName = resolveAgentName(opts, program.opts().profile);
        if (agentName) body.agentName = agentName;
        const result = await client.dags.createExecute({ body }) as Record<string, unknown>;
        spinner.stop();
        const fmt = program.opts().output ?? 'table';

        if (result.status === 'clarification_required') {
          console.log(chalk.yellow(`⚠ Clarification required for DAG ${result.dagId}`));
          console.log(chalk.dim(`  ${result.clarificationQuery}`));
          console.log(chalk.dim(`  Run: desi dags resume ${result.dagId} --answer "<your answer>"`));
          return;
        }

        if (result.status === 'validation_error') {
          console.log(chalk.red(`✗ Validation error for DAG ${result.dagId}`));
          return;
        }

        if (fmt !== 'json') success(`DAG created (${result.dagId}) — execution started (${result.executionId}).`);
        render(result, fmt);

        if (opts.monitor && result.executionId) {
          await monitorExecution(client, result.executionId as string, program.opts());
        }
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('update <id>')
    .description('Update a DAG')
    .option('--goal <text>', 'New goal text')
    .option('--agent <name>', 'Agent name')
    .option('--temperature <n>', 'Temperature')
    .action(async (id: string, opts) => {
      try {
        const body: Record<string, unknown> = {};
        if (opts.goal) body.goalText = opts.goal;
        const agentName = resolveAgentName(opts, program.opts().profile);
        if (agentName) body.agentName = agentName;
        if (opts.temperature) body.temperature = parseFloat(opts.temperature);
        const client = getClient(program.opts());
        const spinner = ora('Updating DAG...').start();
        const result = await client.dags.updateById({ id, body });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('DAG updated.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('delete <id>')
    .description('Delete a DAG')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, opts) => {
      try {
        if (!opts.yes) {
          const confirmed = await promptConfirm(`Delete DAG ${id}?`);
          if (!confirmed) return;
        }
        const client = getClient(program.opts());
        const spinner = ora('Deleting DAG...').start();
        await client.dags.deleteById({ id });
        spinner.stop();
        if ((program.opts().output ?? 'table') !== 'json') success('DAG deleted.');
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('activate <id>')
    .description('Activate scheduling for a DAG')
    .action(async (id: string) => {
      try {
        await updateScheduledDag(id, 'activate');
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('deactivate <id>')
    .description('Deactivate scheduling for a DAG')
    .action(async (id: string) => {
      try {
        await updateScheduledDag(id, 'deactivate');
      } catch (err) {
        handleError(err);
      }
    });

  dags
    .command('resume <id>')
    .description('Resume DAG creation after clarification')
    .requiredOption('--answer <text>', 'Clarification answer')
    .action(async (id: string, opts) => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Resuming DAG...').start();
        const result = await client.dags.resumeClarification({
          id,
          body: { answer: opts.answer },
        });
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('DAG resumed.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });
}
