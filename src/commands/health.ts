import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render, success } from '../core/output.ts';
import { handleError } from '../core/errors.ts';

export function registerHealthCommands(program: Command) {
  const health = program
    .command('health')
    .description('Check API server health')
    .action(async () => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Checking health...').start();
        const result = await client.healthCheck();
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('Server is healthy.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });

  health
    .command('ready')
    .description('Check API server readiness')
    .action(async () => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Checking readiness...').start();
        const result = await client.healthCheckReady();
        spinner.stop();
        const fmt = program.opts().output ?? 'table';
        if (fmt !== 'json') success('Server is ready.');
        render(result, fmt);
      } catch (err) {
        handleError(err);
      }
    });
}
