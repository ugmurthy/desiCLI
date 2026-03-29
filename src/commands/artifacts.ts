import type { Command } from 'commander';
import { writeFileSync } from 'fs';
import { basename } from 'path';
import ora from 'ora';
import { getClient } from '../core/client.ts';
import { render, success } from '../core/output.ts';
import { handleError } from '../core/errors.ts';

/** Simple heuristic: treat content as text if its MIME type starts with "text/" or is a known text type */
function isTextContent(result: Record<string, unknown>): boolean {
  const mime = String(result.content_type ?? result.contentType ?? result.mime_type ?? '').toLowerCase();
  if (mime.startsWith('text/')) return true;
  if (['application/json', 'application/xml', 'application/javascript', 'application/yaml'].includes(mime)) return true;
  // If no MIME info available, check whether content looks like a string (not base64 binary)
  if (!mime && typeof result.content === 'string') return true;
  return false;
}

export function registerArtifactsCommands(program: Command) {
  const artifacts = program.command('artifacts').description('Manage artifacts');

  artifacts
    .command('list')
    .description('List artifacts')
    .action(async () => {
      try {
        const client = getClient(program.opts());
        const spinner = ora('Fetching artifacts...').start();
        const result = await client.artifacts({});
        spinner.stop();
        render(result, program.opts().output ?? 'table');
      } catch (err) {
        handleError(err);
      }
    });

  artifacts
    .command('get <filename>')
    .description('Get an artifact by filename')
    .action(async (filename: string) => {
      try {
        const client = getClient(program.opts());
        const outputMode = program.opts().output ?? 'json';
        const spinner = ora('Fetching artifact...').start();
        const result = await client.artifacts({ path: filename });
        spinner.stop();

        const artifact = (result.artifact ?? result) as Record<string, unknown>;

        if (outputMode === 'json') {
          render(result, 'json');
        } else if (isTextContent(artifact)) {
          console.log(String(artifact.content ?? ''));
        } else {
          const content = artifact.content as string | undefined;
          if (!content) {
            handleError(new Error(`No content returned for artifact "${filename}"`));
            return;
          }
          const outFile = basename(filename);
          writeFileSync(outFile, Buffer.from(content, 'base64'));
          success(`Written to ${outFile}`);
        }
      } catch (err) {
        handleError(err);
      }
    });
}
