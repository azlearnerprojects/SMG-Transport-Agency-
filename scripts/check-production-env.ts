import fs from 'node:fs';
import path from 'node:path';

const originalEnv = new Set(Object.keys(process.env));

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsAt = trimmed.indexOf('=');
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadProductionEnvFiles(): void {
  const cwd = process.cwd();
  const files = ['.env', '.env.production', '.env.local', '.env.production.local'];

  for (const file of files) {
    const values = parseEnvFile(path.join(cwd, file));
    for (const [key, value] of Object.entries(values)) {
      if (!originalEnv.has(key)) {
        process.env[key] = value;
      }
    }
  }
}

loadProductionEnvFiles();

async function main(): Promise<void> {
  try {
    const { summarizeProductionReadiness } = await import('../src/lib/production-readiness');

    const summary = summarizeProductionReadiness();
    const headline = summary.ready
      ? summary.counts.warning > 0
        ? 'Production readiness OK with warnings'
        : 'Production readiness OK'
      : 'Production readiness blocked';

    console.log(headline);
    console.log(`Generated at: ${summary.generatedAt}`);
    console.log(`Checks: ${summary.counts.pass} pass, ${summary.counts.warning} warning, ${summary.counts.fail} fail`);
    console.log('');

    for (const check of summary.checks) {
      const marker = check.status === 'pass' ? 'PASS' : check.status === 'warning' ? 'WARN' : 'FAIL';
      console.log(`[${marker}] ${check.label}: ${check.message}`);
      if (check.help) console.log(`       ${check.help}`);
    }

    if (!summary.ready) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Production environment check failed:');
    console.error(`- ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

void main();
