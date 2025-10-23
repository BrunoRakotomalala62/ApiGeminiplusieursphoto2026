
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
    const result = await model.generateContentStream({
      contents,
    });

    // Collecter la réponse complète
    let fullResponse = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
    }

    // Fonction pour convertir du texte en Unicode gras
    function toBoldUnicode(text) {
      const boldMap = {
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
        'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
        'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
        'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
        'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
      };
      
      return text.split('').map(char => boldMap[char] || char).join('');
    }

    // Formatter le texte pour mettre en gras les textes importants
    // Convertir les textes entre **texte** en caractères Unicode gras
    fullResponse = fullResponse.replace(/\*\*(.+?)\*\*/g, (match, text) => {
      return toBoldUnicode(text);
    });
    
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
