function filterLogs(raw) {
  const text = raw
    .replace(/^\d{4}-\d{2}-\d{2}T\S+Z\s+/gm, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .split('Post job cleanup.')[0];
  const selected = [];

  for (const section of text.split(/(?=^##\[group\]Run )/m)) {
    const header = section.match(/^##\[group\]Run ([^\r\n]+)/);
    const name = header ? header[1] : 'Job';
    const headerEnd = section.indexOf('##[endgroup]');
    const output = header && headerEnd >= 0
      ? section.slice(headerEnd + '##[endgroup]'.length)
      : section;
    const isDocker = /^(?:docker (?:build|run|tag|push)\b|\.\/\.github\/docker\/)/.test(name);
    if (!isDocker && !output.includes('##[error]')) continue;

    const lines = output.split(/\r?\n/).filter(line =>
      line.trim() && !/^##\[(group|endgroup|debug)\]/.test(line) &&
      !/^Node 20 is being deprecated\./.test(line)
    );
    if (lines.length) selected.push(`=== ${name} ===\n${lines.join('\n')}`);
  }
  return selected.join('\n\n') || 'No matching log sections. See the full GitHub run.';
}

module.exports = async ({ github, context, core }) => {
  const env = process.env;
  if (!env.DISCORD_WEBHOOK_URL) {
    core.setFailed('Discord webhook secret is missing');
    return;
  }

  const runUrl = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  let logFile;
  let logNote;
  try {
    const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRunAttempt, {
      ...context.repo,
      run_id: context.runId,
      attempt_number: Number(env.GITHUB_RUN_ATTEMPT),
      per_page: 100,
    });
    const matches = jobs.filter(job => job.name.split(' / ').pop() === 'build-scan-push');
    if (matches.length !== 1 || matches[0].status !== 'completed') {
      throw new Error('Build job is unavailable');
    }

    const response = await fetch(
      `${env.GITHUB_API_URL}/repos/${env.GITHUB_REPOSITORY}/actions/jobs/${matches[0].id}/logs`,
      {
        headers: { Authorization: `Bearer ${env.GH_TOKEN}` },
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!response.ok) throw new Error('Logs unavailable');
    logFile = Buffer.from(filterLogs(await response.text()), 'utf8');
    logNote = '\nAttached: filtered logs. Full logs: link above.';
    if (logFile.length > 1000000) {
      logFile = logFile.subarray(-1000000);
      logNote = '\nAttached: last 1 MB of filtered logs. Full logs: link above.';
    }
  } catch {
    logNote = '\nLog file unavailable. Check the GitHub run above.';
    core.warning('Could not download build logs');
  }

  const content = [
    `Build result: ${env.BUILD_RESULT}`,
    `Repository: ${env.GITHUB_REPOSITORY}`,
    `Branch: ${env.GITHUB_REF_NAME}`,
    `Commit: ${env.GITHUB_SHA}`,
    runUrl,
  ].join('\n') + logNote;
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content, allowed_mentions: { parse: [] } }));
  if (logFile) form.append('files[0]', new Blob([logFile]), 'build.log');

  try {
    const url = new URL(env.DISCORD_WEBHOOK_URL);
    url.searchParams.set('wait', 'true');
    const response = await fetch(url, {
      method: 'POST', body: form, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) core.setFailed(`Discord returned HTTP ${response.status}`);
  } catch {
    core.setFailed('Could not send Discord notification');
  }
};
