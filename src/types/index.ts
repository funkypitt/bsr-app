export interface OPDSPublication {
  metadata: {
    "@type": string;
    title: string;
    language: string;
    duration?: number;
    identifier?: string;
    modified?: string;
    published?: string;
    author?: { name: string; links?: { href: string }[] }[];
    narrator?: { name: string; links?: { href: string }[] }[];
    publisher?: { name: string };
    description?: string;
    subject?: { name: string; code: string }[];
  };
  images?: { href: string; type: string }[];
  links?: OPDSLink[];
}

export interface OPDSLink {
  rel: string;
  href: string;
  type?: string;
  templated?: boolean;
  properties?: {
    availability?: { state: string; since?: string; until?: string };
    indirectAcquisition?: { type: string }[];
    lcp_hashed_passphrase?: string;
    present?: boolean;
  };
}

export interface OPDSFeed {
  metadata: { title: string; numberOfItems?: number };
  links?: OPDSLink[];
  publications?: OPDSPublication[];
  groups?: { metadata: { title: string; number_of_items: number }; publications: OPDSPublication[] }[];
  facets?: { metadata: { title: string }; links: OPDSLink[] }[];
  navigation?: OPDSLink[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  narrator: string;
  duration: number;
  coverUrl: string;
  description: string;
  isAudiobook: boolean;
  subjects: string[];
  publishedDate: string;
  streamUrl?: string;
  sampleUrl?: string;
  borrowUrl?: string;
  progressionUrl?: string;
  availability?: { state: string; until?: string };
}

export interface Loan extends Book {
  loanUntil: string;
  streamUrl: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

export interface PlaybackPosition {
  bookId: string;
  position: number;
  updatedAt: string;
}
