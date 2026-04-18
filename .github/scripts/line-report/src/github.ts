import type { GithubRun } from './types.js'

type RunApiResponse = {
  workflow_runs?: Array<{
    name?: string
    display_title?: string
    conclusion: string | null
    status: string
    updated_at: string
  }>
}

export async function fetchRecentRuns(
  repo: string,
  token: string,
  limit = 10,
): Promise<GithubRun[]> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs?per_page=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub Actions fetch failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as RunApiResponse
  return (json.workflow_runs ?? []).map(r => ({
    name: r.name ?? r.display_title ?? 'unknown',
    conclusion: r.conclusion,
    status: r.status,
    updatedAt: r.updated_at,
  }))
}
