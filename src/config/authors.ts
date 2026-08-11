import type { ImageMetadata } from 'astro';
import defaultAvatar from '../assets/authors/default.png';
import sandhataAvatar from '../assets/authors/sandhata.webp';
import sushilAvatar from '../assets/authors/sushil-assistant.webp';
import mandhataAvatar from '../assets/authors/mandhata-assistant.webp';

export interface AuthorProfile {
  name: string;
  slug: string;
  avatarUrl: ImageMetadata;
  bio: string;
  role: string;
}

export const AUTHOR_REGISTRY: Record<string, AuthorProfile> = {
  'adminsp2015@demo-blog.quicdecode.com': {
    name: 'Sandhata',
    slug: 'sandhata',
    avatarUrl: sandhataAvatar,
    bio: 'Founder and Lead Writer.',
    role: 'Editor-in-Chief',
  },
  'assist1su6870@demo-blog.quicdecode.com': {
    name: 'Sushil',
    slug: 'sushil-assistant-one',
    avatarUrl: sushilAvatar,
    bio: 'Assistant Writer',
    role: 'Staff Writer',
  },
  'assist2ma4848@demo-blog.quicdecode.com': {
    name: 'Mandhata',
    slug: 'mandhata-assistant',
    avatarUrl: mandhataAvatar,
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