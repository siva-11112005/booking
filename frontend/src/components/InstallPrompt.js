import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 30 seconds or 3 page views
      const promptShown = localStorage.getItem('installPromptShown');
      const pageViews = parseInt(localStorage.getItem('pageViews') || '0');
      
      if (!promptShown && pageViews >= 3) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track page views
    const views = parseInt(localStorage.getItem('pageViews') || '0');
    localStorage.setItem('pageViews', (views + 1).toString());

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('installPromptShown', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptShown', 'true');
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <img src="/icon-96x96.png" alt="App Icon" />
        </div>
        <div className="install-prompt-text">
          <h3>Install Eswari Physiotherapy App</h3>
          <p>Install our app for a better experience and offline access</p>
        </div>
        <div className="install-prompt-actions">
          <button onClick={handleDismiss} className="btn-dismiss">
            Not Now
          </button>
          <button onClick={handleInstall} className="btn-install">
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;