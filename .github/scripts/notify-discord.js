const ICONS = {
  success: '✅',
  failure: '❌',
  timed_out: '⏱️',
  cancelled: '🚫',
  skipped: '⏭️',
};
const FAILED = new Set(['failure', 'timed_out']);
const MAX_LOG_BYTES = 1000000;

// Split a raw job log into per-step sections, dropping timestamps, ANSI codes and command echo.
function parseSections(log) {
  const sections = [];
  let section = { name: 'Job', lines: [] };
  let commandHeader = false;

  for (const rawLine of log.split(/\r?\n/)) {
    const line = rawLine
      .replace(/^\d{4}-\d{2}-\d{2}T\S+Z /, '')
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');

    if (line === 'Post job cleanup.') break;

    if (line.startsWith('##[group]Run ')) {
      sections.push(section);
      section = {
        name: line.slice('##[group]Run '.length),
        lines: [],
      };
      commandHeader = true;
      continue;
    }

    if (commandHeader) {
      if (line === '##[endgroup]') commandHeader = false;
      continue;
    }

    if (/^##\[(group|endgroup|debug)\]/.test(line)) continue;
    if (/^Node 20 is being deprecated\./.test(line)) continue;
    if (line.trim()) section.lines.push(line);
  }
  sections.push(section);
  return sections.filter(s => s.lines.length);
}

const formatSections = sections =>
  sections.map(s => `=== ${s.name} ===\n${s.lines.join('\n')}`).join('\n\n');

// Logs can lag a few seconds behind job completion, so retry.
async function downloadLog(github, context, jobId) {
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await github.rest.actions.downloadJobLogsForWorkflowRun({
        ...context.repo,
        job_id: jobId,
      });
      return typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

module.exports = async ({ github, context, core }) => {
  const env = process.env;
  if (!env.DISCORD_WEBHOOK_URL) {
    core.setFailed('Discord webhook secret is missing');
    return;
  }

  const runUrl = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;

  // Every finished job of this run; the notify job itself is still in progress.
  let jobs = [];
  try {
    jobs = (
      await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
        ...context.repo,
        run_id: context.runId,
        filter: 'latest',
        per_page: 100,
      })
    ).filter(job => job.status === 'completed');
  } catch {
    core.warning('Could not list workflow jobs');
  }

  const failed = jobs.filter(job => FAILED.has(job.conclusion));
  const stages = failed.map(job => {
    const step = job.steps?.find(s => FAILED.has(s.conclusion));
    return step ? `${job.name} → ${step.name}` : job.name;
  });

  let status;
  if (!jobs.length) status = '⚠️ Pipeline status unknown';
  else if (failed.length) status = `❌ Pipeline failed at: ${stages.join(', ')}`;
  else if (jobs.some(job => job.conclusion === 'cancelled')) status = '🚫 Pipeline cancelled';
  else status = '✅ Pipeline succeeded';

  // Failure: error sections of every failed job. Success: docker steps of the image build.
  let logText;
  let logName;
  let logNote = '';
  try {
    if (failed.length) {
      const parts = [];
      for (const job of failed) {
        const sections = parseSections(await downloadLog(github, context, job.id));
        const errors = sections.filter(s => s.lines.some(line => line.includes('##[error]')));
        parts.push(`##### ${job.name} #####\n\n${formatSections(errors.length ? errors : sections.slice(-1))}`);
      }
      logText = parts.join('\n\n');
      logName = 'failure.log';
    } else {
      const build = jobs.find(job =>
        job.name.split(' / ').pop() === 'build-scan-push' && job.conclusion === 'success'
      );
      if (build) {
        const sections = parseSections(await downloadLog(github, context, build.id));
        logText = formatSections(sections.filter(s =>
          /^(?:docker (?:build|run|tag|push)\b|\.\/\.github\/docker\/)/.test(s.name)
        )) || 'No matching log sections. See the full GitHub run.';
        logName = 'build.log';
      }
    }
  } catch {
    logText = undefined;
    logNote = '\nLog file unavailable. Check the GitHub run above.';
    core.warning('Could not download job logs');
  }

  let logFile;
  if (logText) {
    logFile = Buffer.from(logText, 'utf8');
    logNote = '\nAttached: filtered logs. Full logs: link above.';
    if (logFile.length > MAX_LOG_BYTES) {
      logFile = logFile.subarray(-MAX_LOG_BYTES);
      logNote = '\nAttached: last 1 MB of filtered logs. Full logs: link above.';
    }
  }

  const content = [
    status,
    `Repository: ${env.GITHUB_REPOSITORY}`,
    `Branch: ${env.BRANCH_NAME || env.GITHUB_REF_NAME}`,
    `Commit: ${env.BUILD_SHA || env.GITHUB_SHA}`,
    '',
    ...jobs.map(job => `${ICONS[job.conclusion] ?? '❔'} ${job.name}`),
    '',
    runUrl,
  ].join('\n') + logNote;

  const form = new FormData();
  form.append('payload_json', JSON.stringify({
    content,
    allowed_mentions: { parse: [] },
  }));
  if (logFile) {
    form.append('files[0]', new Blob([logFile]), logName);
  }

  try {
    const url = new URL(env.DISCORD_WEBHOOK_URL);
    url.searchParams.set('wait', 'true');
    const response = await fetch(url, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      core.setFailed(`Discord returned HTTP ${response.status}`);
    }
  } catch {
    core.setFailed('Could not send Discord notification');
  }
};
