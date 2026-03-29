#!/usr/bin/env bun
import { Command } from 'commander';
import pkg from './package.json';
import { registerAuthCommands } from './src/commands/auth.ts';
import { registerHealthCommands } from './src/commands/health.ts';
import { registerDagsCommands } from './src/commands/dags.ts';
import { registerExecutionsCommands } from './src/commands/executions.ts';
import { registerAgentsCommands } from './src/commands/agents.ts';
import { registerToolsCommands } from './src/commands/tools.ts';
import { registerCostsCommands } from './src/commands/costs.ts';
import { registerBillingCommands } from './src/commands/billing.ts';
import { registerArtifactsCommands } from './src/commands/artifacts.ts';
import { registerAdminCommands } from './src/commands/admin.ts';
import { registerConfigCommands } from './src/commands/config.ts';

const program = new Command();

program
  .name('desi')
  .description('CLI for the desiBackend API')
  .version(pkg.version, '-V, --version')
  .option('-o, --output <format>', 'Output format: table, json, plain', 'table')
  .option('-p, --profile <name>', 'Use a named profile')
  .option('--api-url <url>', 'Override API base URL')
  .option('--token <token>', 'Override stored auth token')
  .option('--no-color', 'Disable colored output')
  .option('-v, --verbose', 'Show debug info')
  .enablePositionalOptions();

registerAuthCommands(program);
registerHealthCommands(program);
registerDagsCommands(program);
registerExecutionsCommands(program);
registerAgentsCommands(program);
registerToolsCommands(program);
registerCostsCommands(program);
registerBillingCommands(program);
registerArtifactsCommands(program);
registerAdminCommands(program);
registerConfigCommands(program);

// Shell completion command
const completion = program.command('completion').description('Generate shell completion script');

completion
  .command('bash')
  .description('Generate bash completion script')
  .action(() => {
    console.log(generateBashCompletion(program));
  });

completion
  .command('zsh')
  .description('Generate zsh completion script')
  .action(() => {
    console.log(generateZshCompletion(program));
  });

completion
  .command('fish')
  .description('Generate fish completion script')
  .action(() => {
    console.log(generateFishCompletion(program));
  });

program.parse();

// --- Completion generators ---

function getCommandTree(cmd: Command, prefix = ''): Array<{ path: string; description: string }> {
  const results: Array<{ path: string; description: string }> = [];
  for (const sub of cmd.commands) {
    const path = prefix ? `${prefix} ${sub.name()}` : sub.name();
    results.push({ path, description: sub.description() });
    results.push(...getCommandTree(sub, path));
  }
  return results;
}

function generateBashCompletion(prog: Command): string {
  const commands = getCommandTree(prog);
  const topLevel = prog.commands.map((c) => c.name()).join(' ');

  return `# desi bash completion
# Add to ~/.bashrc: eval "$(desi completion bash)"
_desi_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  case "\${prev}" in
    desi)
      commands="${topLevel}"
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
${commands
  .filter((c) => !c.path.includes(' '))
  .map((c) => {
    const subs = commands
      .filter((s) => s.path.startsWith(c.path + ' ') && !s.path.slice(c.path.length + 1).includes(' '))
      .map((s) => s.path.slice(c.path.length + 1));
    if (subs.length === 0) return '';
    return `    ${c.path})\n      COMPREPLY=( $(compgen -W "${subs.join(' ')}" -- "\${cur}") )\n      return 0\n      ;;`;
  })
  .filter(Boolean)
  .join('\n')}
  esac

  COMPREPLY=( $(compgen -W "${topLevel}" -- "\${cur}") )
}
complete -F _desi_completions desi`;
}

function generateZshCompletion(prog: Command): string {
  const commands = getCommandTree(prog);
  const topLevel = prog.commands
    .map((c) => `'${c.name()}:${c.description().replace(/'/g, "\\'")}'`)
    .join('\n    ');

  return `#compdef desi
# desi zsh completion
# Add to ~/.zshrc: eval "$(desi completion zsh)"

_desi() {
  local -a commands
  commands=(
    ${topLevel}
  )

  _arguments -C \\
    '(-o --output)'{-o,--output}'[Output format]:format:(table json plain)' \\
    '(-p --profile)'{-p,--profile}'[Profile name]:profile:' \\
    '--api-url[API base URL]:url:' \\
    '--token[Auth token]:token:' \\
    '--no-color[Disable color]' \\
    '(-v --verbose)'{-v,--verbose}'[Verbose output]' \\
    '(-V --version)'{-V,--version}'[Show version]' \\
    '1:command:->cmd' \\
    '*::arg:->args'

  case "$state" in
    cmd)
      _describe 'command' commands
      ;;
  esac
}

_desi "$@"`;
}

function generateFishCompletion(prog: Command): string {
  const commands = getCommandTree(prog);
  const lines = commands
    .filter((c) => !c.path.includes(' '))
    .map(
      (c) =>
        `complete -c desi -n '__fish_use_subcommand' -a '${c.path}' -d '${c.description.replace(/'/g, "\\'")}'`
    );

  for (const parent of commands.filter((c) => !c.path.includes(' '))) {
    const subs = commands.filter(
      (c) => c.path.startsWith(parent.path + ' ') && !c.path.slice(parent.path.length + 1).includes(' ')
    );
    for (const sub of subs) {
      const subName = sub.path.slice(parent.path.length + 1);
      lines.push(
        `complete -c desi -n '__fish_seen_subcommand_from ${parent.path}' -a '${subName}' -d '${sub.description.replace(/'/g, "\\'")}'`
      );
    }
  }

  return `# desi fish completion\n# Save to ~/.config/fish/completions/desi.fish\n${lines.join('\n')}`;
}
