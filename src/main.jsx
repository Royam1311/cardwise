import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/* Original BENEFY base */
import './styles.css';
import './benefy-typography.css';
import './benefy-blue-theme.css';
import './benefy-premium.css';
import './benefy-luxury.css';

/* Original authentication experience */
import './benefy-auth-gateway.css';
import './benefy-auth-showcase.css';
import './benefy-auth-showcase-v3.css';
import './benefy-auth-showcase-v4.css';
import './benefy-auth-showcase-v5.css';
import './benefy-auth-showcase-v6.css';
import './benefy-auth-showcase-v7.css';
import './benefy-auth-showcase-v8.css';
import './benefy-auth-showcase-v9.css';

/* Original header, navigation and home logo */
import './benefy-header-v3.css';
import './benefy-header-v4.css';
import './benefy-header-v5.css';
import './benefy-header-glass.css';
import './benefy-header-scroll-shell.css';
import './benefy-nav-features.css';
import './benefy-nav-indicator.css';
import './benefy-logo-fit.css';
import './benefy-logo-home.css';

/* Original hero composition */
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

/* Original wallet and footer */
import './wallet-cards.css';
import './benefy-wallet-experience.css';
import './benefy-footer.css';
import './benefy-footer-v2.css';
import './benefy-footer-v3.css';
import './benefy-footer-spacing.css';

/* Search/catalog features that existed before infinite scroll */
import './benefy-search-dark.css';
import './benefy-catalog-results.css';
import './benefy-product-card-luxury.css';
import './benefy-autocomplete.css';
import './benefy-product-variants.css';

/* Original visual enhancement modules. These restore the compact header,
   centered hero, wallet visual, floating statistics and footer behavior. */
import './authControls';
import './authShowcase';
import './compactHeader';
import './footerReveal';
import './heroExperience';
import './heroStatsVisual';
import './heroWalletVisual';
import './logoHome';
import './navFeatures';
import './navIndicator';
import './profileEnhancer';
import './siteFooter';
import './walletExperience';

/* Features added before infinite scrolling */
import './autocompleteSearch';
import './productVariantSelector';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
