import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function slug(s: string, max = 48): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max) || 'unknown';
}

function gitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();
  } catch {
    return 'unknown';
  }
}

function artifactSummary(result: TestResult): string {
  const parts: string[] = [];
  for (const a of result.attachments || []) {
    if (a.path) parts.push(a.path);
  }
  if (result.error?.stack) {
    const m = result.error.stack.match(/test-results\/[^\s]+\.zip/);
    if (m) parts.push(m[0]);
  }
  return parts.length ? parts.join(', ') : 'none';
}

export default class IssuesMdReporter implements Reporter {
  /** Under `tests/uat/test-results/` (gitignored) so generated output is never committed. */
  private issuesPath = path.join(
    process.cwd(),
    'tests',
    'uat',
    'test-results',
    'issues.md'
  );

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'failed') return;

    const suiteSlug = test.parent?.title ? slug(test.parent.title, 32) : 'suite';
    const titleSlug = slug(test.title, 40);
    const iso = new Date().toISOString();
    const file = test.location.file.replace(process.cwd() + path.sep, '');
    const runLabel = process.env.CI ? 'ci' : 'local';
    const sha = gitShortSha();
    const errMsg =
      result.error?.message?.split('\n')[0]?.replace(/\r/g, '') || 'Unknown error';
    const artifacts = artifactSummary(result);

    const block = [
      '',
      `### UAT FAIL | ${iso} | ${suiteSlug} | ${titleSlug}`,
      `- **Run**: ${runLabel} | **Commit**: ${sha}`,
      `- **File**: ${file}`,
      `- **Test**: ${test.title}`,
      `- **Error**: ${errMsg}`,
      `- **Artifacts**: ${artifacts}`,
      '',
    ].join('\n');

    try {
      const dir = path.dirname(this.issuesPath);
      fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(this.issuesPath)) {
        fs.writeFileSync(
          this.issuesPath,
          '# UAT issues\n\nFailures appended by Playwright (`tests/uat/reporters/issues-md-reporter.ts`).\n',
          'utf8'
        );
      }
      fs.appendFileSync(this.issuesPath, block, 'utf8');
    } catch (e) {
      console.error('[issues-md-reporter] Failed to append test-results/issues.md:', e);
    }
  }
}
