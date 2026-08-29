// auth.js - Gestion de la réception du ticket d'authentification appreciAIA
(function() {
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
        const mistralKey = authData.cle_api_mistral;
        
        console.log("✅ Token PB reçu avec succès");
        
        // Stockage propre dans le localStorage
        if (pbToken) localStorage.setItem('pb_token', pbToken);
        if (mistralKey) localStorage.setItem('mistral_api_key', mistralKey);
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