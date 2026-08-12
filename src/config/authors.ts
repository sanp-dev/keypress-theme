import type { ImageMetadata } from 'astro';
import defaultAvatar from '../assets/authors/default.png';
import sandhataAvatar from '../assets/authors/sandhata.webp';

export interface AuthorProfile {
  name: string;
  slug: string;
  avatarUrl: ImageMetadata;
  bio: string;
  role: string;
}

export const AUTHOR_REGISTRY: Record<string, AuthorProfile> = {
  'admin@keypress-theme.quicdecode.com': {
    name: 'Sandhata',
    slug: 'sandhata',
    avatarUrl: sandhataAvatar,
    bio: 'Founder and Lead Writer.',
    role: 'Editor-in-Chief',
  },
  'writer1@keypress-theme.quicdecode.com': {
    name: 'Writer One Name',
    slug: 'writer-one',
    avatarUrl: defaultAvatar,
    bio: 'Assistant Writer',
    role: 'Staff Writer',
  },
  'writer2@keypress-theme.quicdecode.com': {
    name: 'Writer Two Name',
    slug: 'writer-two',
    avatarUrl: defaultAvatar,
    bio: 'Assistant Writer',
    role: 'Staff Writer',
  },
};

// Fallback
export const DEFAULT_AUTHOR: AuthorProfile = {
  name: 'Editorial Team',
  slug: 'editorial-team',
  avatarUrl: defaultAvatar,
  bio: 'Published by the editorial team.',
  role: 'Contributor',
};

export function getAuthorProfile(email: string | undefined | null): AuthorProfile {
  if (!email) return DEFAULT_AUTHOR;
  return AUTHOR_REGISTRY[email.toLowerCase().trim()] ?? DEFAULT_AUTHOR;
}