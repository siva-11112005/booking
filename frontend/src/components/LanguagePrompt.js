import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguagePrompt = () => {
  const { i18n } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const chosen = localStorage.getItem('language');
    const seen = localStorage.getItem('languagePromptSeen');
    if (!chosen && !seen) {
      setShow(true);
    }
  }, []);

  const chooseLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    document.documentElement.lang = code;
    localStorage.setItem('languagePromptSeen', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <h2 className="modal-title">Choose Your Preferred Language</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '16px' }}>
          You can change this anytime from the top bar.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn-modal btn-modal-submit" onClick={() => chooseLang('ta')}>🇮🇳 தமிழ் (Tamil)</button>
          <button className="btn-modal btn-modal-submit" onClick={() => chooseLang('hi')}>🇮🇳 हिन्दी (Hindi)</button>
          <button className="btn-modal btn-modal-submit" onClick={() => chooseLang('en')}>🇬🇧 English</button>
        </div>
        <div className="modal-actions" style={{ marginTop: '16px' }}>
          <button className="btn-modal btn-modal-cancel" onClick={() => chooseLang('ta')}>Continue with Tamil</button>
        </div>
      </div>
    </div>
  );
};

export default LanguagePrompt;