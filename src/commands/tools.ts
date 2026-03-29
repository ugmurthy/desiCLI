import type { Command } from 'commander';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render } from '../core/output.ts';
import { handleError } from '../core/errors.ts';

export function registerToolsCommands(program: Command) {
  const tools = program.command('tools').description('Manage tools');

  tools
    .command('list')
    .description('List available tools')
    .action(async () => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching tools...').start();
        const result = await client.tools.list();
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });
}
