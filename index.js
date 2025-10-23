
import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 5000;

// Stockage en mémoire des conversations par utilisateur
const userMemory = new Map();

// Fonction pour télécharger et convertir une image en base64
async function downloadImageAsBase64(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return {
      inlineData: {
        mimeType: contentType,
        data: base64
      }
    };
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error.message);
    return null;
  }
}

// Route GET /gemini
app.get('/gemini', async (req, res) => {
  try {
    const { pro, uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    if (!pro) {
      return res.status(400).json({ error: 'Pro (prompt) is required' });
    }

    // Initialiser la mémoire de l'utilisateur si elle n'existe pas
    if (!userMemory.has(uid)) {
      userMemory.set(uid, {
        images: [],
        history: []
      });
    }

    const memory = userMemory.get(uid);

    // Collecter toutes les nouvelles images de la requête
    const newImages = [];
    let imageIndex = 1;
    while (req.query[`image${imageIndex}`]) {
      const imageUrl = req.query[`image${imageIndex}`];
      const imageData = await downloadImageAsBase64(imageUrl);
      if (imageData) {
        newImages.push(imageData);
        memory.images.push(imageData); // Stocker dans la mémoire
      }
      imageIndex++;
    }

    // Initialiser le client Gemini AI
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Construire les parts du message
    const parts = [];

    // Ajouter toutes les images stockées en mémoire pour ce user
    if (memory.images.length > 0) {
      parts.push(...memory.images);
    }

    // Ajouter le texte du prompt
    parts.push({
      text: pro
    });

    // Construire le contenu avec l'historique
    const contents = [
      ...memory.history,
      {
        role: 'user',
        parts: parts
      }
    ];

    // Appeler l'API Gemini
    const response = await model.generateContentStream({
      contents,
    });

    // Collecter la réponse complète
    let fullResponse = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullResponse += chunk.text;
      }
    }

    // Mettre à jour l'historique de conversation
    memory.history.push({
      role: 'user',
      parts: [{ text: pro }]
    });
    memory.history.push({
      role: 'model',
      parts: [{ text: fullResponse }]
    });

    // Limiter l'historique à 20 derniers messages pour éviter la surcharge
    if (memory.history.length > 20) {
      memory.history = memory.history.slice(-20);
    }

    // Retourner la réponse
    res.json({
      success: true,
      uid: uid,
      prompt: pro,
      imagesCount: memory.images.length,
      newImagesAdded: newImages.length,
      response: fullResponse
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Route pour réinitialiser la mémoire d'un utilisateur
app.get('/reset', (req, res) => {
  const { uid } = req.query;
  
  if (!uid) {
    return res.status(400).json({ error: 'UID is required' });
  }

  userMemory.delete(uid);
  
  res.json({
    success: true,
    message: `Memory reset for user ${uid}`
  });
});

// Route pour voir l'état de la mémoire d'un utilisateur
app.get('/status', (req, res) => {
  const { uid } = req.query;
  
  if (!uid) {
    return res.status(400).json({ error: 'UID is required' });
  }

  const memory = userMemory.get(uid);
  
  if (!memory) {
    return res.json({
      uid: uid,
      exists: false,
      imagesStored: 0,
      conversationLength: 0
    });
  }

  res.json({
    uid: uid,
    exists: true,
    imagesStored: memory.images.length,
    conversationLength: memory.history.length
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Gemini API server running on port ${port}`);
  console.log(`Example usage:`);
  console.log(`- With images: /gemini?pro=Décrivez tous les images&image1=URL1&image2=URL2&uid=123`);
  console.log(`- Text only: /gemini?pro=bonjour&uid=123`);
  console.log(`- Reset memory: /reset?uid=123`);
  console.log(`- Check status: /status?uid=123`);
});
