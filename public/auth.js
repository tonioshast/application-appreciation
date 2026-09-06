// auth.js - Gestion de la réception du ticket d'authentification appreciAIA
(function() {
  // Purge de sécurité : suppression de toute ancienne clé Mistral qui subsisterait dans le localStorage
  try {
    localStorage.removeItem('mistral_api_key');
  } catch (e) {}

  const urlParams = new URLSearchParams(window.location.search);
  const ticket = urlParams.get('ticket');

  if (ticket) {
    console.log("🎫 Ticket détecté dans l'URL, récupération des données d'authentification...");
    
    fetch(`https://connecteur.appreciation.fr/auth/fetch-data?ticket=${ticket}`, {
      method: 'GET',
      mode: 'cors',
      headers: { 
        'Accept': 'application/json'
      }
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        const authData = result.data;
        const pbToken = authData.token;
        
        console.log("✅ Token PB reçu avec succès");
        
        // Stockage propre dans le localStorage (session utilisateur uniquement)
        if (pbToken) localStorage.setItem('pb_token', pbToken);
        if (authData.record) localStorage.setItem('prof_info', JSON.stringify(authData.record));
        
        localStorage.setItem('auth_last_fetch', new Date().toISOString());
        localStorage.setItem('auth_last_response', JSON.stringify(authData));
        localStorage.setItem('apprecIAtion_ticket_data', JSON.stringify(authData));
        localStorage.removeItem('auth_last_error');

        // Nettoyage de l'URL pour masquer le ticket
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Notification pour l'application SPA si déjà chargée
        window.dispatchEvent(new CustomEvent('auth_data_updated', { detail: authData }));
        
        console.log("🎉 Données d'authentification enregistrées dans localStorage !");
      } else {
        console.error("❌ Erreur de récupération du ticket :", result.message);
        localStorage.setItem('auth_last_error', result.message || 'Erreur inconnue');
      }
    })
    .catch(error => {
      console.error('❌ Erreur réseau lors du fetch du ticket:', error);
      localStorage.setItem('auth_last_error', error.toString());
    });
  }
})();