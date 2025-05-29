// Script to be injected in document head to prevent FOUC (Flash of Unstyled Content)
// This runs before React hydration to set the correct theme immediately

export const createThemeScript = () => {
  const script = `
    (function() {
      try {
        var storageKey = 'cybereco-theme';
        var langStorageKey = 'cybereco-language';
        
        // Get theme from localStorage or system preference
        var savedTheme = localStorage.getItem(storageKey);
        var theme = 'light';
        
        if (savedTheme === 'light' || savedTheme === 'dark') {
          theme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          theme = 'dark';
        }
        
        // Get language from localStorage or browser preference
        var savedLang = localStorage.getItem(langStorageKey);
        var language = 'en';
        
        if (savedLang === 'en' || savedLang === 'es') {
          language = savedLang;
        } else {
          var browserLang = navigator.language.split('-')[0];
          if (browserLang === 'es') {
            language = 'es';
          }
        }
        
        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute('dir', 'ltr');
        
        // Add class to prevent transitions during initial load
        document.documentElement.classList.add('theme-loading');
        
        // Remove loading class after a brief delay
        setTimeout(function() {
          document.documentElement.classList.remove('theme-loading');
        }, 100);
        
      } catch (e) {
        // Fallback to light theme if anything fails
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.setAttribute('lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
      }
    })();
  `;
  
  return script;
};

// CSS to prevent flash during theme changes
export const themeTransitionCSS = `
  .theme-loading,
  .theme-loading *,
  .theme-loading *:before,
  .theme-loading *:after {
    transition: none !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
  
  html {
    color-scheme: light dark;
  }
  
  [data-theme="dark"] {
    color-scheme: dark;
  }
  
  [data-theme="light"] {
    color-scheme: light;
  }
`;