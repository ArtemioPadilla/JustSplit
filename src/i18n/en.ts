/**
 * English dictionary. Adding a key here implicitly widens the shared
 * `Dictionary` type (`typeof en`), so other locales must add the same key
 * to satisfy it. That's the type-safe equivalent of "translation completeness".
 *
 * Keys are organized by page/section. Compound values that include inline HTML
 * (e.g. `<code>` snippets in flow steps) are kept in the page template itself
 * rather than here — only plain translatable strings live in the dictionary.
 */
export const en = {
  nav: {
    home: 'Home',
    gallery: 'Gallery',
    demos: 'Demos',
    docs: 'Docs',
    blog: 'Blog',
    switchLanguage: 'Español',
  },
  home: {
    // Hero
    kicker: 'issue-driven web scaffold',
    title: 'Start every build',
    titleEmphasis: 'at full speed.',
    tagline:
      'A governed, agent-orchestrated way of working: every feature travels the same loop — issue → Claude triages → PR → merge. Quality and ethics are enforced by the repo, not by discipline.',
    ctaPrimary: 'Quick start',
    ctaSecondary: 'Explore the gallery',
    // Stats strip labels
    statPages: 'pages built',
    statTests: 'test files',
    statComponents: 'components',
    statJs: 'JS by default',
    // Loop section
    loopKicker: 'The loop',
    loopHeading: 'How a feature ships',
    loopCta1: 'Read the 60-second tour',
    loopCta2: 'See a real run',
    loopCta3: 'Full workflow doc',
    loopFeedback: 'See a bug? Hit the chat bubble bottom-right — it files a GitHub issue with diagnostics pre-filled.',
    loopFeedbackHighlight: 'chat bubble',
    // Loop steps — plain strings only; inline code rendered in the template
    loopStep1Title: 'File the issue',
    loopStep1Body: 'Use a template or run the new-issue command. Diagnostics pre-fill from the FeedbackFAB.',
    loopStep2Title: 'Hand it to Claude Code',
    loopStep2Body: 'prometeo plans, forja implements with a red→green test first, centinela validates the build, types, tests and ethics gate.',
    loopStep3Title: 'PR opens',
    loopStep3Body: 'Carries the issue reference, sub-agent reports and the 8-item ethics checklist. CI re-validates on every push.',
    loopStep4Title: 'Merge',
    loopStep4Body: 'The issue closes itself. Visual regression snapshots both /gallery and /demos.',
    // Kit section
    kitKicker: 'The kit',
    kitHeading: "What's inside",
    kitBrowseAll: 'browse all',
    kitMoreCategories: 'more categories in the',
    kitMoreCategory: 'more category in the',
    kitGallery: 'gallery',
    kitView: 'view',
    kitMore: 'more',
  },
  gallery: {
    title: 'Component gallery',
    tagline:
      'Browse the full set of shadcn-on-Base-UI primitives and themed charts, each rendered as an Astro island.',
    cta: 'Open the gallery',
    // Bridge landing page (es/gallery.astro)
    bridgeHeading: 'Shared component pages',
    bridgeBody:
      'Individual component pages live under /gallery/ and are shared across locales: the code and interactive demos are the same, while this landing introduces the gallery in Spanish. Follow the link above to explore the primitives and themed charts.',
  },
  docsLanding: {
    title: 'Documentation',
    tagline:
      'Guides, conventions, and architecture decisions for building on the Inceptor scaffold.',
    cta: 'Read the docs',
    // Bridge landing page (es/docs.astro)
    bridgeHeading: 'Shared documentation',
    bridgeBody:
      'Complete guides and references live under /docs/ and are shared across locales. This Spanish landing is the entry point; follow the link above to read the conventions, architecture, and scaffold decisions.',
  },
  footer: {
    builtWith: 'Built with Astro, Tailwind, shadcn, and Claude Code',
    license: 'MIT licensed',
  },
};
