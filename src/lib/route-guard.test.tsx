// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { hasRole, hasFlag, RouteGuard, type GuardUser } from './route-guard';

const admin: GuardUser = { id: 'u1', roles: ['admin'], flags: { verified: true } };
const viewer: GuardUser = { id: 'u2', roles: ['viewer'] };

describe('hasRole — explicit allowlist, deny by default', () => {
  it('grants when a role matches the allowlist', () => {
    expect(hasRole(admin, ['admin', 'editor'])).toBe(true);
  });
  it('denies a role outside the allowlist', () => {
    expect(hasRole(viewer, ['admin'])).toBe(false);
  });
  it('denies null/undefined users', () => {
    expect(hasRole(null, ['admin'])).toBe(false);
    expect(hasRole(undefined, ['admin'])).toBe(false);
  });
  it('denies users with absent or empty roles (the SECiD lesson)', () => {
    expect(hasRole({ id: 'u3' }, ['admin'])).toBe(false);
    expect(hasRole({ id: 'u4', roles: [] }, ['admin'])).toBe(false);
  });
});

describe('hasFlag — absent field must NOT pass (the !== false trap)', () => {
  it('grants only on explicit true', () => {
    expect(hasFlag(admin, 'verified')).toBe(true);
  });
  it('denies when the flag is ABSENT — the case `!== false` gets wrong', () => {
    const noFlags: GuardUser = { id: 'u5', roles: ['admin'] };
    // The buggy pattern this scaffold exists to kill:
    // (noFlags.flags?.verified !== false) === true  ← absent field passes!
    expect((noFlags.flags?.verified !== false) as boolean).toBe(true);
    // hasFlag gets it right:
    expect(hasFlag(noFlags, 'verified')).toBe(false);
  });
  it('denies explicit false and null users', () => {
    expect(hasFlag({ id: 'u6', flags: { verified: false } }, 'verified')).toBe(false);
    expect(hasFlag(null, 'verified')).toBe(false);
  });
});

describe('<RouteGuard>', () => {
  it('renders children for an allowed role', () => {
    render(
      <RouteGuard user={admin} allow={['admin']}>
        <p>secret</p>
      </RouteGuard>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('renders the fallback (not children) when denied', () => {
    render(
      <RouteGuard user={viewer} allow={['admin']} fallback={<p>sign in</p>}>
        <p>secret</p>
      </RouteGuard>,
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByText('sign in')).toBeInTheDocument();
  });

  it('renders nothing by default when denied', () => {
    const { container } = render(
      <RouteGuard user={null} allow={['admin']}>
        <p>secret</p>
      </RouteGuard>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('requireFlags denies when a flag is absent, even with the right role', () => {
    render(
      <RouteGuard user={viewer} allow={['viewer']} requireFlags={['verified']} fallback={<p>verify first</p>}>
        <p>secret</p>
      </RouteGuard>,
    );
    expect(screen.getByText('verify first')).toBeInTheDocument();
  });
});
