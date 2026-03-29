import chalk from 'chalk';

export function render(data: unknown, format: 'table' | 'json' | 'plain'): void {
  if (data === undefined || data === null) {
    return;
  }

  switch (format) {
    case 'json':
      console.log(JSON.stringify(data, null, 2));
      break;

    case 'plain':
      renderPlain(data);
      break;

    case 'table':
    default:
      renderTable(data);
      break;
  }
}

/** Find the main data array in a wrapped response like { dags: [...], pagination: {...} } */
function unwrapResponse(data: unknown): { items: Record<string, unknown>[]; pagination?: Record<string, unknown> } | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;

  const entries = Object.entries(data as Record<string, unknown>);
  const arrayEntry = entries.find(([, v]) => Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] === 'object');
  if (!arrayEntry) return null;

  const pagination = (data as Record<string, unknown>).pagination as Record<string, unknown> | undefined;
  return { items: arrayEntry[1] as Record<string, unknown>[], pagination };
}

function renderPlain(data: unknown): void {
  const unwrapped = unwrapResponse(data);
  if (unwrapped) {
    for (const item of unwrapped.items) {
      const vals = Object.entries(item)
        .map(([, v]) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)));
      console.log(vals.join('\t'));
    }
    return;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        const vals = Object.entries(item)
          .map(([, v]) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)));
        console.log(vals.join('\t'));
      } else {
        console.log(String(item));
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      console.log(`${key}\t${displayValue}`);
    }
  } else {
    console.log(String(data));
  }
}

function renderTable(data: unknown): void {
  const unwrapped = unwrapResponse(data);
  if (unwrapped) {
    renderItemsAsTable(unwrapped.items);
    if (unwrapped.pagination) {
      const p = unwrapped.pagination;
      const total = p.total as number | undefined;
      const limit = p.limit as number | undefined;
      const offset = p.offset as number | undefined;
      const hasMore = p.hasMore as boolean | undefined;
      if (total !== undefined && limit !== undefined && offset !== undefined) {
        const start = offset + 1;
        const end = Math.min(offset + limit, total);
        const line = `Showing ${start}-${end} of ${total} results.`;
        const hint = hasMore ? ` Use --offset ${offset + limit} to see more.` : '';
        console.log(chalk.dim(`\n${line}${hint}`));
      }
    }
    return;
  }

  if (Array.isArray(data)) {
    renderItemsAsTable(data);
    return;
  }

  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data);
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
    for (const [key, value] of entries) {
      const displayValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      console.log(`${chalk.bold(key.padEnd(maxKeyLen))}  ${displayValue}`);
    }
    return;
  }

  console.log(String(data));
}

function renderItemsAsTable(items: unknown[]): void {
  if (items.length === 0) {
    console.log(chalk.dim('No results found.'));
    return;
  }

  const firstItem = items[0] as Record<string, unknown>;
  const columns = Object.keys(firstItem);

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = col.length;
    for (const item of items) {
      const raw = (item as Record<string, unknown>)[col];
      const val = raw !== null && typeof raw === 'object' ? JSON.stringify(raw) : String(raw ?? '');
      widths[col] = Math.max(widths[col]!, val.length);
    }
  }

  // Header
  const header = columns.map((c) => chalk.bold(c.padEnd(widths[c]!))).join('  ');
  const separator = columns.map((c) => '─'.repeat(widths[c]!)).join('──');
  console.log(header);
  console.log(chalk.dim(separator));

  // Rows
  for (const item of items) {
    const row = columns
      .map((c) => {
        const val = (item as Record<string, unknown>)[c];
        const display = val !== null && typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        return display.padEnd(widths[c]!);
      })
      .join('  ');
    console.log(row);
  }
}

export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function error(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

export function info(message: string): void {
  console.log(chalk.dim(message));
}
