import * as p from '@clack/prompts';

export async function promptText(message: string, placeholder?: string): Promise<string> {
  const value = await p.text({ message, placeholder });
  if (p.isCancel(value)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
  return value;
}

export async function promptPassword(message: string): Promise<string> {
  const value = await p.password({ message });
  if (p.isCancel(value)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
  return value;
}

export async function promptConfirm(message: string): Promise<boolean> {
  const value = await p.confirm({ message });
  if (p.isCancel(value)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
  return value;
}
