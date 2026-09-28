import { describe, expect, it } from 'vitest';
import { apiBase, apiEnabled, apiUrl, formEndpoint, githubIssuesUrl, repoStatsUrl } from './api';

// In the test env `PUBLIC_API_BASE` is unset, so the module resolves to
// static mode (apiBase === ''). These assertions pin the static-mode contract
// — the behavior a plain GitHub Pages fork relies on.
describe('api helper — static mode (no PUBLIC_API_BASE)', () => {
  it('reports no backend', () => {
    expect(apiBase).toBe('');
    expect(apiEnabled).toBe(false);
  });

  it('apiUrl returns a relative path', () => {
    expect(apiUrl('/api/contact')).toBe('/api/contact');
    expect(apiUrl('api/contact')).toBe('/api/contact');
  });

  it('githubIssuesUrl points straight at GitHub', () => {
    expect(githubIssuesUrl('owner/repo', 'open', 30)).toBe(
      'https://api.github.com/repos/owner/repo/issues?state=open&per_page=30',
    );
  });

  it('repoStatsUrl points straight at GitHub', () => {
    expect(repoStatsUrl('owner/repo')).toBe('https://api.github.com/repos/owner/repo');
  });

  it('formEndpoint honors an explicit dedicated endpoint', () => {
    expect(formEndpoint('https://formspree.io/f/abc', '/api/contact')).toBe(
      'https://formspree.io/f/abc',
    );
  });

  it('formEndpoint stays in demo mode when nothing is configured', () => {
    expect(formEndpoint(undefined, '/api/contact')).toBe('');
    expect(formEndpoint('', '/api/contact')).toBe('');
  });
});
