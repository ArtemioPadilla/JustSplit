import type { en } from './en';

/**
 * Spanish dictionary — must structurally satisfy the English shape. Adding a
 * key to `en.ts` produces a type error here until the Spanish version is
 * provided. That's by design.
 */
export const es: typeof en = {
  nav: {
    home: 'Inicio',
    gallery: 'Galería',
    demos: 'Demos',
    docs: 'Documentación',
    blog: 'Blog',
    switchLanguage: 'English',
  },
  home: {
    // Hero
    kicker: 'scaffold de desarrollo guiado por issues',
    title: 'Cada build comienza',
    titleEmphasis: 'a máxima velocidad.',
    tagline:
      'Un método gobernado y orquestado por agentes: cada feature recorre el mismo bucle — issue → Claude triaga → PR → merge. La calidad y la ética las impone el repositorio, no la disciplina individual.',
    ctaPrimary: 'Inicio rápido',
    ctaSecondary: 'Explorar la galería',
    // Stats strip labels
    statPages: 'páginas generadas',
    statTests: 'archivos de test',
    statComponents: 'componentes',
    statJs: 'JS por defecto',
    // Loop section
    loopKicker: 'El bucle',
    loopHeading: 'Cómo llega una feature a producción',
    loopCta1: 'Leer el tour de 60 segundos',
    loopCta2: 'Ver una ejecución real',
    loopCta3: 'Documentación completa del flujo',
    loopFeedback: '¿Ves un bug? Pulsa la burbuja de chat abajo a la derecha — crea un issue de GitHub con los diagnósticos ya rellenados.',
    loopFeedbackHighlight: 'burbuja de chat',
    // Loop steps
    loopStep1Title: 'Crea el issue',
    loopStep1Body: 'Usa una plantilla o ejecuta el comando new-issue. Los diagnósticos se rellenan automáticamente desde el FeedbackFAB.',
    loopStep2Title: 'Delégalo a Claude Code',
    loopStep2Body: 'prometeo planifica, forja implementa con test rojo→verde primero, centinela valida la build, los tipos, los tests y el gate ético.',
    loopStep3Title: 'Se abre el PR',
    loopStep3Body: 'Incluye la referencia al issue, los informes de los sub-agentes y el checklist de ética de 8 puntos. CI vuelve a validar en cada push.',
    loopStep4Title: 'Merge',
    loopStep4Body: 'El issue se cierra solo. Las instantáneas de regresión visual cubren /gallery y /demos.',
    // Kit section
    kitKicker: 'El kit',
    kitHeading: 'Qué incluye',
    kitBrowseAll: 'ver todos',
    kitMoreCategories: 'categorías más en la',
    kitMoreCategory: 'categoría más en la',
    kitGallery: 'galería',
    kitView: 'ver',
    kitMore: 'más',
  },
  gallery: {
    title: 'Galería de componentes',
    tagline:
      'Explora el conjunto completo de primitivas shadcn sobre Base UI y las gráficas con tema, cada una renderizada como una isla de Astro.',
    cta: 'Abrir la galería',
    // Bridge landing page (es/gallery.astro)
    bridgeHeading: 'Páginas de componentes compartidas',
    bridgeBody:
      'Las páginas individuales de cada componente viven bajo /gallery/ y se comparten entre idiomas: el código y las demos interactivas son los mismos, mientras que esta portada presenta la galería en español. Sigue el enlace de arriba para explorar las primitivas y las gráficas con tema.',
  },
  docsLanding: {
    title: 'Documentación',
    tagline:
      'Guías, convenciones y decisiones de arquitectura para construir sobre el scaffold de Inceptor.',
    cta: 'Leer la documentación',
    // Bridge landing page (es/docs.astro)
    bridgeHeading: 'Documentación compartida',
    bridgeBody:
      'Las guías y referencias completas viven bajo /docs/ y se comparten entre idiomas. Esta portada en español sirve como punto de entrada; sigue el enlace de arriba para leer las convenciones, la arquitectura y las decisiones del scaffold.',
  },
  footer: {
    builtWith: 'Hecho con Astro, Tailwind, shadcn y Claude Code',
    license: 'Licencia MIT',
  },
};
