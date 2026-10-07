import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/* Core */
import './styles.css';
import './benefy-typography.css';
import './benefy-blue-theme.css';
import './benefy-premium.css';
import './benefy-luxury.css';

/* Authentication */
import './benefy-auth-gateway.css';
import './benefy-auth-showcase.css';
import './benefy-auth-showcase-v3.css';
import './benefy-auth-showcase-v4.css';
import './benefy-auth-showcase-v5.css';
import './benefy-auth-showcase-v6.css';
import './benefy-auth-showcase-v7.css';
import './benefy-auth-showcase-v8.css';
import './benefy-auth-showcase-v9.css';

/* Header, navigation and logo */
import './benefy-header-v3.css';
import './benefy-header-v4.css';
import './benefy-header-v5.css';
import './benefy-header-glass.css';
import './benefy-header-scroll-shell.css';
import './benefy-nav-features.css';
import './benefy-nav-indicator.css';
import './benefy-logo-fit.css';
import './benefy-logo-home.css';

/* Hero and homepage */
import './benefy-hero-cinematic.css';
import './benefy-hero-experience.css';
import './benefy-hero-backlights.css';
import './benefy-hero-lightwash.css';
import './benefy-hero-clean-background.css';
import './benefy-hero-wallet.css';
import './benefy-hero-wallet-v2.css';
import './benefy-hero-stats.css';
import './benefy-hero-floating-stats.css';
import './benefy-homepage-refinement.css';

/* Wallet */
import './wallet-cards.css';
import './benefy-wallet-experience.css';

/* Footer */
import './benefy-footer.css';
import './benefy-footer-v2.css';
import './benefy-footer-v3.css';
import './benefy-footer-spacing.css';

/* Search and catalog */
import './benefy-search-dark.css';
import './benefy-catalog-results.css';
import './benefy-product-card-luxury.css';
import './benefy-autocomplete.css';
import './benefy-product-variants.css';

/* Existing enhancements */
import * as AutocompleteModule from './autocompleteSearch';
import * as VariantModule from './productVariantSelector';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function resolveInitializer(module, names) {
  for (const name of names) {
    if (typeof module?.[name] === 'function') return module[name];
  }
  return typeof module?.default === 'function' ? module.default : null;
}

let cleanupAutocomplete;
let cleanupVariants;

function startEnhancements() {
  cleanupAutocomplete?.();
  cleanupVariants?.();

  const initAutocomplete = resolveInitializer(AutocompleteModule, [
    'initProductAutocomplete',
    'initAutocompleteSearch',
    'initAutocomplete'
  ]);

  const initVariants = resolveInitializer(VariantModule, [
    'initProductVariantSelector',
    'initVariantSelector'
  ]);

  cleanupAutocomplete = initAutocomplete?.();
  cleanupVariants = initVariants?.();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startEnhancements, { once: true });
} else {
  startEnhancements();
}
