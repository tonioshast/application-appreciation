import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Charger le fichier .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware pour parser le JSON du body
  app.use(express.json());

  // Endpoint proxy pour Mistral AI
  app.post('/proxy-mistral.php', async (req, res) => {
    try {
      const apiKey = process.env.MISTRAL_API_KEY || process.env.CLE_API_MISTRAL;
      if (!apiKey) {
        return res.status(500).json({ error: 'Clé API Mistral non configurée dans le fichier .env.' });
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Corps de la requête vide.' });
      }

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Erreur proxy Mistral:', err);
      return res.status(502).json({ error: 'Erreur de connexion vers Mistral: ' + (err?.message || err) });
    }
  });

  // Vite middleware pour le développement
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur appreciAIA démarré sur le port ${PORT}`);
  });
}

startServer();
