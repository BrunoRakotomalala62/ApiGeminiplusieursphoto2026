
import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 5000;

// Stockage en mémoire des conversations par utilisateur
const userMemory = new Map();

// Route d'accueil avec guide d'utilisation
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Gemini - Guide d'utilisation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            color: #667eea;
            font-size: 2em;
            margin-bottom: 20px;
            border-left: 5px solid #667eea;
            padding-left: 15px;
        }
        
        .endpoint {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            transition: transform 0.3s ease;
        }
        
        .endpoint:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .endpoint h3 {
            font-size: 1.5em;
            margin-bottom: 10px;
        }
        
        .endpoint p {
            margin-bottom: 15px;
            opacity: 0.9;
        }
        
        .example-btn {
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            margin: 5px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .example-btn:hover {
            background: #667eea;
            color: white;
            transform: scale(1.05);
        }
        
        .code-block {
            background: #2d3748;
            color: #68d391;
            padding: 20px;
            border-radius: 10px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        
        .params {
            background: #f7fafc;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            margin: 15px 0;
        }
        
        .params-list {
            list-style: none;
        }
        
        .params-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .params-list li:last-child {
            border-bottom: none;
        }
        
        .param-name {
            color: #667eea;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
            margin-left: 10px;
        }
        
        .badge-required {
            background: #f56565;
            color: white;
        }
        
        .badge-optional {
            background: #48bb78;
            color: white;
        }
        
        .footer {
            background: #2d3748;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .animated {
            animation: fadeInUp 0.6s ease;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 API Gemini 2.0 Flash</h1>
            <p>API puissante pour converser avec l'IA et analyser des images</p>
        </div>
        
        <div class="content">
            <div class="section animated">
                <h2>📚 Endpoints Disponibles</h2>
                
                <div class="endpoint">
                    <h3>🔵 GET /gemini</h3>
                    <p>Envoyer un message texte ou analyser des images avec Gemini AI</p>
                    
                    <div class="params">
                        <h4 style="margin-bottom: 10px;">Paramètres:</h4>
                        <ul class="params-list">
                            <li>
                                <span class="param-name">uid</span>
                                <span class="badge badge-required">REQUIS</span>
                                <span>Identifiant unique de l'utilisateur</span>
                            </li>
                            <li>
                                <span class="param-name">pro</span>
                                <span class="badge badge-required">REQUIS</span>
                                <span>Votre question ou prompt</span>
                            </li>
                            <li>
                                <span class="param-name">image1, image2, ...</span>
                                <span class="badge badge-optional">OPTIONNEL</span>
                                <span>URLs des images à analyser</span>
                            </li>
                        </ul>
                    </div>
                    
                    <p><strong>Exemples cliquables:</strong></p>
                    <a href="/gemini?uid=demo123&pro=Bonjour, comment vas-tu?" target="_blank" class="example-btn">💬 Message simple</a>
                    <a href="/gemini?uid=demo123&pro=Raconte-moi une blague" target="_blank" class="example-btn">😄 Demander une blague</a>
                    <a href="/gemini?uid=demo123&pro=Explique-moi la relativité" target="_blank" class="example-btn">🔬 Question scientifique</a>
                </div>
                
                <div class="endpoint" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <h3>🟢 GET /status</h3>
                    <p>Vérifier l'état de la mémoire d'un utilisateur</p>
                    
                    <div class="params">
                        <h4 style="margin-bottom: 10px;">Paramètres:</h4>
                        <ul class="params-list">
                            <li>
                                <span class="param-name">uid</span>
                                <span class="badge badge-required">REQUIS</span>
                                <span>Identifiant unique de l'utilisateur</span>
                            </li>
                        </ul>
                    </div>
                    
                    <p><strong>Exemples cliquables:</strong></p>
                    <a href="/status?uid=demo123" target="_blank" class="example-btn">📊 Voir le statut</a>
                </div>
                
                <div class="endpoint" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <h3>🔴 GET /reset</h3>
                    <p>Réinitialiser la mémoire et l'historique d'un utilisateur</p>
                    
                    <div class="params">
                        <h4 style="margin-bottom: 10px;">Paramètres:</h4>
                        <ul class="params-list">
                            <li>
                                <span class="param-name">uid</span>
                                <span class="badge badge-required">REQUIS</span>
                                <span>Identifiant unique de l'utilisateur</span>
                            </li>
                        </ul>
                    </div>
                    
                    <p><strong>Exemples cliquables:</strong></p>
                    <a href="/reset?uid=demo123" target="_blank" class="example-btn">🔄 Réinitialiser la mémoire</a>
                </div>
            </div>
            
            <div class="section animated">
                <h2>💡 Exemples d'utilisation avancée</h2>
                
                <div class="code-block">
                    <div><strong>Conversation multi-tours (avec mémoire):</strong></div>
                    <div style="margin-top: 10px;">
                        1. /gemini?uid=user1&pro=Bonjour, je m'appelle Jean<br>
                        2. /gemini?uid=user1&pro=Comment je m'appelle?<br>
                        <span style="color: #fbd38d;">→ L'IA se souviendra du nom!</span>
                    </div>
                </div>
                
                <div class="code-block">
                    <div><strong>Analyse d'images:</strong></div>
                    <div style="margin-top: 10px;">
                        /gemini?uid=user1&pro=Décris cette image&image1=https://example.com/photo.jpg
                    </div>
                </div>
            </div>
            
            <div class="section animated">
                <h2>⚡ Fonctionnalités</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 20px; border-radius: 10px;">
                        <h3 style="margin-bottom: 10px;">💾 Mémoire persistante</h3>
                        <p>Chaque utilisateur a sa propre mémoire de conversation</p>
                    </div>
                    <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 20px; border-radius: 10px;">
                        <h3 style="margin-bottom: 10px;">🖼️ Support multi-images</h3>
                        <p>Analysez plusieurs images dans une seule requête</p>
                    </div>
                    <div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 20px; border-radius: 10px;">
                        <h3 style="margin-bottom: 10px;">🎨 Formatage avancé</h3>
                        <p>Réponses formatées en Unicode gras automatiquement</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>🚀 Propulsé par Google Gemini 2.0 Flash Experimental</p>
            <p style="margin-top: 10px; opacity: 0.7;">Hébergé sur Replit</p>
        </div>
    </div>
</body>
</html>
  `);
});

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
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: "Toujours répondre en texte formaté avec markdown. IMPORTANT: Utiliser **texte** pour mettre en gras TOUS les termes importants, titres, étapes numérotées, résultats, et mots-clés, que ce soit pour du texte pur ou lors de l'analyse d'images. Mettre en gras au moins 3-5 éléments par réponse. Éviter de répondre uniquement en JSON brut sauf si explicitement demandé."
    });

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
