import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './benefy-luxury.css';
import './benefy-blue-theme.css';
import './benefy-typography.css';
import './benefy-header-v5.css';
import './benefy-header-scroll-shell.css';
import './benefy-header-glass.css';
import './benefy-search-dark.css';
import './benefy-hero-experience.css';
import './benefy-hero-wallet-v2.css';
import './benefy-hero-backlights.css';
import './benefy-auth-showcase-v9.css';
import './benefy-nav-features.css';
import './benefy-nav-indicator.css';
import './benefy-wallet-experience.css';
import './benefy-footer-v3.css';
import { enableCompactHeader } from './compactHeader';
import { enableProfilePopover } from './profileEnhancer';
import { enableAuthShowcase } from './authShowcase';
import { enableAuthControls } from './authControls';
import { enableHeroExperience } from './heroExperience';
import { enableHeroWalletVisual } from './heroWalletVisual';
import { enableNavFeatures } from './navFeatures';
import { enableNavIndicator } from './navIndicator';
import { enableWalletExperience } from './walletExperience';
import { enableSiteFooter } from './siteFooter';

function Root() {
  useEffect(() => {
    const cleanups = [
      enableCompactHeader(),
      enableProfilePopover(),
      enableAuthShowcase(),
      enableAuthControls(),
      enableHeroExperience(),
      enableHeroWalletVisual(),
      enableNavFeatures(),
      enableNavIndicator(),
      enableWalletExperience(),
      enableSiteFooter()
    ];

    return () => cleanups.forEach(cleanup => cleanup?.());
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
