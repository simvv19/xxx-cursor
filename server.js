const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Créer le dossier uploads s'il n'existe pas
fs.ensureDirSync('uploads');

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers vidéo sont autorisés'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Base de données simple (fichier JSON)
const videosFile = 'videos.json';

// Fonction pour lire les vidéos
function getVideos() {
  try {
    if (fs.existsSync(videosFile)) {
      return JSON.parse(fs.readFileSync(videosFile, 'utf8'));
    }
    return [];
  } catch (error) {
    console.error('Erreur lors de la lecture des vidéos:', error);
    return [];
  }
}

// Fonction pour sauvegarder les vidéos
function saveVideos(videos) {
  try {
    fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des vidéos:', error);
  }
}

// Routes

// Page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Page d'administration
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Page de visualisation vidéo
app.get('/video', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'video.html'));
});

// Page TikTok
app.get('/tiktok', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tiktok.html'));
});

// API - Récupérer toutes les vidéos
app.get('/api/videos', (req, res) => {
  const videos = getVideos();
  res.json(videos);
});

// API - Upload d'une vidéo
app.post('/api/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier vidéo fourni' });
    }

    const { title, creator, category, tags } = req.body;
    
    if (!title) {
      // Supprimer le fichier uploadé si pas de titre
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Le titre est requis' });
    }
    
    if (!category) {
      // Supprimer le fichier uploadé si pas de catégorie
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'La catégorie est requise' });
    }

    const videos = getVideos();
    const newVideo = {
      id: Date.now().toString(),
      title: title,
      creator: creator || '',
      category: category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      views: 0,
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: []
    };

    videos.push(newVideo);
    saveVideos(videos);

    res.json({ 
      message: 'Vidéo uploadée avec succès', 
      video: newVideo 
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload de la vidéo' });
  }
});

// API - Télécharger une vidéo
app.get('/api/download/:id', (req, res) => {
  const videos = getVideos();
  const video = videos.find(v => v.id === req.params.id);
  
  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const filePath = path.join(__dirname, 'uploads', video.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier vidéo non trouvé' });
  }

  res.download(filePath, video.originalName);
});

// API - Supprimer une vidéo
app.delete('/api/videos/:id', (req, res) => {
  const videos = getVideos();
  const videoIndex = videos.findIndex(v => v.id === req.params.id);
  
  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const video = videos[videoIndex];
  const filePath = path.join(__dirname, 'uploads', video.filename);
  
  // Supprimer le fichier physique
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Supprimer de la base de données
  videos.splice(videoIndex, 1);
  saveVideos(videos);

  res.json({ message: 'Vidéo supprimée avec succès' });
});

// API - Incrémenter les vues
app.post('/api/videos/:id/view', (req, res) => {
  const videos = getVideos();
  const videoIndex = videos.findIndex(v => v.id === req.params.id);
  
  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  videos[videoIndex].views = (videos[videoIndex].views || 0) + 1;
  saveVideos(videos);

  res.json({ views: videos[videoIndex].views });
});

// API - Like/Dislike une vidéo
app.post('/api/videos/:id/like', (req, res) => {
  const { action, userIp } = req.body; // action: 'like' ou 'dislike'
  const videos = getVideos();
  const videoIndex = videos.findIndex(v => v.id === req.params.id);
  
  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const video = videos[videoIndex];
  
  // Initialiser les tableaux s'ils n'existent pas
  if (!video.likedBy) video.likedBy = [];
  if (!video.dislikedBy) video.dislikedBy = [];
  if (!video.likes) video.likes = 0;
  if (!video.dislikes) video.dislikes = 0;

  // Vérifier si l'utilisateur a déjà voté
  const hasLiked = video.likedBy.includes(userIp);
  const hasDisliked = video.dislikedBy.includes(userIp);

  if (action === 'like') {
    if (hasLiked) {
      // Retirer le like
      video.likedBy = video.likedBy.filter(ip => ip !== userIp);
      video.likes = Math.max(0, video.likes - 1);
    } else {
      // Ajouter le like
      video.likedBy.push(userIp);
      video.likes += 1;
      
      // Retirer le dislike s'il existe
      if (hasDisliked) {
        video.dislikedBy = video.dislikedBy.filter(ip => ip !== userIp);
        video.dislikes = Math.max(0, video.dislikes - 1);
      }
    }
  } else if (action === 'dislike') {
    if (hasDisliked) {
      // Retirer le dislike
      video.dislikedBy = video.dislikedBy.filter(ip => ip !== userIp);
      video.dislikes = Math.max(0, video.dislikes - 1);
    } else {
      // Ajouter le dislike
      video.dislikedBy.push(userIp);
      video.dislikes += 1;
      
      // Retirer le like s'il existe
      if (hasLiked) {
        video.likedBy = video.likedBy.filter(ip => ip !== userIp);
        video.likes = Math.max(0, video.likes - 1);
      }
    }
  }

  saveVideos(videos);

  res.json({
    likes: video.likes,
    dislikes: video.dislikes,
    hasLiked: video.likedBy.includes(userIp),
    hasDisliked: video.dislikedBy.includes(userIp)
  });
});

// API - Récupérer les commentaires d'une vidéo
app.get('/api/videos/:id/comments', (req, res) => {
  const videos = getVideos();
  const video = videos.find(v => v.id === req.params.id);
  
  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const comments = video.comments || [];
  res.json(comments);
});

// API - Ajouter un commentaire
app.post('/api/videos/:id/comments', (req, res) => {
  const { text, author } = req.body;
  const videos = getVideos();
  const videoIndex = videos.findIndex(v => v.id === req.params.id);
  
  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
  }

  const video = videos[videoIndex];
  
  // Initialiser le tableau de commentaires s'il n'existe pas
  if (!video.comments) video.comments = [];

  const newComment = {
    id: Date.now().toString(),
    text: text.trim(),
    author: author || 'Utilisateur anonyme',
    timestamp: new Date().toISOString(),
    likes: 0
  };

  video.comments.push(newComment);
  saveVideos(videos);

  res.json({ message: 'Commentaire ajouté avec succès', comment: newComment });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
