import type { ApiClient } from 'desiClient';
import ora, { type Ora } from 'ora';
import chalk from 'chalk';

interface ExecutionEvent {
  type: string;
  executionId: string;
  ts: number;
  data?: Record<string, any>;
  error?: { message: string; code?: string };
}

const EVENT_LABELS: Record<string, { icon: string; color: (s: string) => string; text: string }> = {
  'execution:started':            { icon: '▶', color: chalk.cyan,    text: 'Execution started' },
  'execution:completed':          { icon: '✓', color: chalk.green,   text: 'Execution completed' },
  'execution:failed':             { icon: '✗', color: chalk.red,     text: 'Execution failed' },
  'execution:suspended':          { icon: '⏸', color: chalk.yellow,  text: 'Execution suspended' },
  'execution:wave_started':       { icon: '◆', color: chalk.blue,    text: 'Wave started' },
  'execution:wave_completed':     { icon: '◇', color: chalk.blue,    text: 'Wave completed' },
  'execution:task_started':       { icon: '⠋', color: chalk.cyan,    text: 'Task started' },
  'execution:task_progress':      { icon: '⠏', color: chalk.cyan,    text: 'Task progress' },
  'execution:task_completed':     { icon: '✓', color: chalk.green,   text: 'Task completed' },
  'execution:task_failed':        { icon: '✗', color: chalk.red,     text: 'Task failed' },
  'execution:synthesis_started':  { icon: '⠋', color: chalk.magenta, text: 'Synthesizing results' },
  'execution:synthesis_completed':{ icon: '✓', color: chalk.green,   text: 'Synthesis completed' },
};

const TERMINAL_EVENTS = new Set([
  'execution:completed',
  'execution:failed',
  'execution:suspended',
]);

function formatTaskLabel(event: ExecutionEvent): string {
  const label = EVENT_LABELS[event.type];
  if (!label) return `Unknown event: ${event.type}`;

  const description = event.data?.description || event.data?.taskId || '';
  const suffix = description ? ` — ${description}` : '';
  return `${label.color(label.text)}${chalk.dim(suffix)}`;
}

/**
 * Connect to the SSE events endpoint and display live spinner feedback
 * for each execution event until a terminal event is received.
 */
export async function monitorExecution(
  client: ApiClient,
  executionId: string,
  globalOpts?: Record<string, unknown>,
): Promise<void> {
  // Extract connection details from the client's internal state
  const baseUrl = (client as any).baseUrl as string;
  const token = (client as any).token as string | undefined;

  const url = `${baseUrl}/api/v2/executions/${encodeURIComponent(executionId)}/events`;

  console.log(chalk.dim(`\nMonitoring execution ${executionId}…\n`));

  const spinner = ora({ text: 'Waiting for events…', color: 'cyan' }).start();

  try {
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      spinner.fail(`Failed to connect to event stream (HTTP ${response.status})`);
      return;
    }

    if (!response.body) {
      spinner.fail('No event stream body received');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE frames: lines starting with "data: " separated by double newlines
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        // Handle error events
        if (frame.startsWith('event: error')) {
          const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
          if (dataLine) {
            const errorData = JSON.parse(dataLine.slice(6));
            spinner.fail(chalk.red(`Stream error: ${errorData.message}`));
          }
          return;
        }

        // Parse data lines
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data: ')) continue;

          const event: ExecutionEvent = JSON.parse(line.slice(6));
          const label = EVENT_LABELS[event.type];

          if (!label) {
            spinner.text = chalk.dim(`Event: ${event.type}`);
            continue;
          }

          if (TERMINAL_EVENTS.has(event.type)) {
            if (event.type === 'execution:completed') {
              spinner.succeed(formatTaskLabel(event));
            } else if (event.type === 'execution:failed') {
              const errMsg = event.error?.message ? ` — ${event.error.message}` : '';
              spinner.fail(chalk.red(`Execution failed${errMsg}`));
            } else {
              spinner.warn(formatTaskLabel(event));
            }
            return;
          }

          // For task completions/failures, stop current and log, then resume spinning
          if (event.type === 'execution:task_completed') {
            spinner.succeed(formatTaskLabel(event));
            spinner.start('Waiting for events…');
          } else if (event.type === 'execution:task_failed') {
            spinner.fail(formatTaskLabel(event));
            spinner.start('Waiting for events…');
          } else if (event.type === 'execution:wave_completed') {
            spinner.info(formatTaskLabel(event));
            spinner.start('Waiting for events…');
          } else {
            // Ongoing events: update spinner text
            spinner.text = formatTaskLabel(event);
          }
        }
      }
    }

    // Stream ended without terminal event
    spinner.info('Event stream closed');
  } catch (err) {
    spinner.fail(`Monitor error: ${(err as Error).message}`);
  }
}
