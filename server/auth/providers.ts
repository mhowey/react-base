import type { Strategy } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { ExternalProfile } from '../users/repo';

/**
 * Third-party sign-in providers.
 *
 * A provider is enabled automatically when `<ENV_PREFIX>_CLIENT_ID` and
 * `<ENV_PREFIX>_CLIENT_SECRET` are set. Its OAuth callback URL is
 *   `${APP_URL}/api/auth/<id>/callback`
 *
 * To add another provider (Microsoft, Apple, Discord, LinkedIn, X, …):
 *   1. `npm i passport-<provider>`
 *   2. add an entry below that builds the strategy and maps its profile
 *   3. add the env vars to `.env`
 */

type Verify = (profile: ExternalProfile) => void;

interface PassportProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

export interface ProviderDefinition {
  id: string;
  name: string;
  envPrefix: string;
  scope: string[];
  create: (opts: { clientID: string; clientSecret: string; callbackURL: string }, verify: Verify) => Strategy;
}

const mapProfile = (provider: string, p: PassportProfile): ExternalProfile => ({
  provider,
  providerUserId: String(p.id),
  email: p.emails?.[0]?.value ?? null,
  name: p.displayName || p.username || null,
  avatarUrl: p.photos?.[0]?.value ?? null,
});

type Done = (err: unknown, user?: unknown) => void;
const passVerify =
  (provider: string, verify: Verify) =>
  (_a: string, _r: string, profile: PassportProfile, done: Done) => {
    try {
      done(null, verify(mapProfile(provider, profile)));
    } catch (e) {
      done(e);
    }
  };

export const providerDefinitions: ProviderDefinition[] = [
  {
    id: 'google',
    name: 'Google',
    envPrefix: 'GOOGLE',
    scope: ['openid', 'profile', 'email'],
    create: (opts, verify) => new GoogleStrategy(opts, passVerify('google', verify) as never),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    envPrefix: 'FACEBOOK',
    scope: ['email', 'public_profile'],
    create: (opts, verify) =>
      new FacebookStrategy({ ...opts, profileFields: ['id', 'displayName', 'emails', 'photos'] }, passVerify('facebook', verify) as never),
  },
  {
    id: 'github',
    name: 'GitHub',
    envPrefix: 'GITHUB',
    scope: ['read:user', 'user:email'],
    create: (opts, verify) => new GitHubStrategy(opts, passVerify('github', verify) as never) as unknown as Strategy,
  },
];

export function enabledProviders(env: NodeJS.ProcessEnv = process.env): ProviderDefinition[] {
  return providerDefinitions.filter((p) => env[`${p.envPrefix}_CLIENT_ID`] && env[`${p.envPrefix}_CLIENT_SECRET`]);
}
