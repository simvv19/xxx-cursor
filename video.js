// Variables globales
let currentVideo = null;
let allVideos = [];

// Éléments DOM
const videoPlayer = document.getElementById('videoPlayer');
const videoSource = document.getElementById('videoSource');
const videoTitle = document.getElementById('videoTitle');
const videoDate = document.getElementById('videoDate');
const videoSize = document.getElementById('videoSize');
const videoTags = document.getElementById('videoTags');
const downloadLink = document.getElementById('downloadLink');
const suggestedGrid = document.getElementById('suggestedGrid');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadVideoData();
    loadAllVideos();
});

// Charger les données de la vidéo actuelle
async function loadVideoData() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');
    
    if (!videoId) {
        showError('ID de vidéo manquant');
        return;
    }
    
    try {
        const response = await fetch('/api/videos');
        const videos = await response.json();
        currentVideo = videos.find(v => v.id === videoId);
        
        if (!currentVideo) {
            showError('Vidéo non trouvée');
            return;
        }
        
        displayVideo();
    } catch (error) {
        console.error('Erreur lors du chargement de la vidéo:', error);
        showError('Erreur lors du chargement de la vidéo');
    }
}

// Afficher la vidéo
function displayVideo() {
    if (!currentVideo) return;
    
    // Configurer le lecteur vidéo
    videoSource.src = `/uploads/${currentVideo.filename}`;
    videoPlayer.load();
    
    // Mettre à jour les informations
    videoTitle.textContent = currentVideo.title;
    videoDate.textContent = new Date(currentVideo.uploadDate).toLocaleDateString('fr-FR');
    videoSize.textContent = formatFileSize(currentVideo.size);
    
    // Incrémenter les vues
    incrementViews(currentVideo.id);
    
    // Lien de téléchargement
    downloadLink.href = `/api/download/${currentVideo.id}`;
    downloadLink.download = currentVideo.originalName;
    
    // Créateur et catégorie
    let tagsHtml = '';
    if (currentVideo.creator) {
        tagsHtml += `<span class="tag-large creator-tag"><i class="fas fa-user"></i> ${escapeHtml(currentVideo.creator)}</span>`;
    }
    if (currentVideo.category) {
        tagsHtml += `<span class="tag-large category-tag-large">${escapeHtml(currentVideo.category)}</span>`;
    }
    if (currentVideo.tags && currentVideo.tags.length > 0) {
        tagsHtml += currentVideo.tags.map(tag => 
            `<span class="tag-large">${escapeHtml(tag)}</span>`
        ).join('');
    }
    
    videoTags.innerHTML = tagsHtml || '<span class="tag-large">Aucune information</span>';
    
    // Mettre à jour le titre de la page
    document.title = `${currentVideo.title} - VideoShare`;
    
    // Mettre à jour les statistiques
    updateVideoStats();
    
    // Configurer les boutons d'interaction
    setupInteractionButtons();
}

// Charger toutes les vidéos pour les suggestions
async function loadAllVideos() {
    try {
        const response = await fetch('/api/videos');
        allVideos = await response.json();
        displaySuggestedVideos();
    } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error);
    }
}

// Afficher les vidéos suggérées
function displaySuggestedVideos() {
    if (!currentVideo) return;
    
    // Filtrer la vidéo actuelle et prendre les 6 premières
    const suggestedVideos = allVideos
        .filter(video => video.id !== currentVideo.id)
        .slice(0, 6);
    
    if (suggestedVideos.length === 0) {
        suggestedGrid.innerHTML = '<p>Aucune autre vidéo disponible</p>';
        return;
    }
    
    suggestedGrid.innerHTML = suggestedVideos.map(video => createSuggestedCard(video)).join('');
    
    // Générer les miniatures pour les vidéos suggérées
    generateSuggestedThumbnails();
}

// Créer une carte de vidéo suggérée
function createSuggestedCard(video) {
    const uploadDate = new Date(video.uploadDate).toLocaleDateString('fr-FR');
    const fileSize = formatFileSize(video.size);
    
    return `
        <div class="suggested-card" onclick="goToVideo('${video.id}')">
            <div class="suggested-thumbnail" data-video-src="/uploads/${video.filename}">
                <i class="fas fa-play-circle"></i>
            </div>
            <div class="suggested-info">
                <h4 class="suggested-title">${escapeHtml(video.title)}</h4>
                <div class="suggested-meta">
                    <span><i class="fas fa-calendar"></i> ${uploadDate}</span>
                    <span><i class="fas fa-file"></i> ${fileSize}</span>
                </div>
                <div class="suggested-tags">
                    ${video.tags.slice(0, 2).map(tag => `<span class="tag-small">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

// Aller à une vidéo
function goToVideo(videoId) {
    window.location.href = `/video.html?id=${videoId}`;
}

// Afficher une erreur
function showError(message) {
    document.querySelector('.video-container').innerHTML = `
        <div class="error-container">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Erreur</h2>
            <p>${message}</p>
            <a href="/" class="btn btn-primary">
                <i class="fas fa-home"></i>
                Retour à l'accueil
            </a>
        </div>
    `;
}

// Formater la taille du fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Gestion des événements du lecteur vidéo
videoPlayer.addEventListener('loadstart', function() {
    console.log('Chargement de la vidéo commencé');
});

videoPlayer.addEventListener('canplay', function() {
    console.log('Vidéo prête à être lue');
});

videoPlayer.addEventListener('error', function(e) {
    console.error('Erreur lors de la lecture de la vidéo:', e);
    showError('Erreur lors de la lecture de la vidéo. Vérifiez que le fichier existe.');
});

// Raccourcis clavier
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            if (videoPlayer.paused) {
                videoPlayer.play();
            } else {
                videoPlayer.pause();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            videoPlayer.currentTime -= 10;
            break;
        case 'ArrowRight':
            e.preventDefault();
            videoPlayer.currentTime += 10;
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
    }
});

// Basculer le mode plein écran
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        videoPlayer.requestFullscreen().catch(err => {
            console.log('Erreur lors de l\'entrée en plein écran:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Mettre à jour les statistiques de la vidéo
function updateVideoStats() {
    if (!currentVideo) return;
    
    // Mettre à jour les vues
    const videoViews = document.getElementById('videoViews');
    if (videoViews) {
        videoViews.textContent = `${currentVideo.views || 0} vues`;
    }
    
    // Mettre à jour les likes/dislikes
    const likeCount = document.querySelector('.like-count');
    const dislikeCount = document.querySelector('.dislike-count');
    
    if (likeCount) likeCount.textContent = currentVideo.likes || 0;
    if (dislikeCount) dislikeCount.textContent = currentVideo.dislikes || 0;
}

// Configurer les boutons d'interaction
function setupInteractionButtons() {
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    if (likeBtn) {
        likeBtn.addEventListener('click', () => toggleLike(currentVideo.id));
    }
    
    if (dislikeBtn) {
        dislikeBtn.addEventListener('click', () => toggleDislike(currentVideo.id));
    }
}

// Obtenir l'IP de l'utilisateur (simulation)
function getUserIp() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

// Incrémenter les vues
async function incrementViews(videoId) {
    try {
        const response = await fetch(`/api/videos/${videoId}/view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            // Mettre à jour l'affichage des vues
            const videoViews = document.getElementById('videoViews');
            if (videoViews) {
                videoViews.textContent = `${result.views} vues`;
            }
            // Mettre à jour la vidéo actuelle
            if (currentVideo) {
                currentVideo.views = result.views;
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'incrémentation des vues:', error);
    }
}

// Toggle like
async function toggleLike(videoId) {
    try {
        const response = await fetch(`/api/videos/${videoId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'like',
                userIp: getUserIp()
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            updateLikeDisplay(result);
        }
    } catch (error) {
        console.error('Erreur lors du like:', error);
    }
}

// Toggle dislike
async function toggleDislike(videoId) {
    try {
        const response = await fetch(`/api/videos/${videoId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'dislike',
                userIp: getUserIp()
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            updateLikeDisplay(result);
        }
    } catch (error) {
        console.error('Erreur lors du dislike:', error);
    }
}

// Mettre à jour l'affichage des likes/dislikes
function updateLikeDisplay(stats) {
    // Mettre à jour les compteurs
    const likeCount = document.querySelector('.like-count');
    const dislikeCount = document.querySelector('.dislike-count');
    
    if (likeCount) likeCount.textContent = stats.likes;
    if (dislikeCount) dislikeCount.textContent = stats.dislikes;
    
    // Mettre à jour les styles des boutons
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    if (likeBtn) {
        likeBtn.classList.toggle('active', stats.hasLiked);
    }
    if (dislikeBtn) {
        dislikeBtn.classList.toggle('active', stats.hasDisliked);
    }
    
    // Mettre à jour la vidéo actuelle
    if (currentVideo) {
        currentVideo.likes = stats.likes;
        currentVideo.dislikes = stats.dislikes;
    }
}

// Générer les miniatures pour les vidéos suggérées
function generateSuggestedThumbnails() {
    const thumbnails = document.querySelectorAll('.suggested-thumbnail[data-video-src]');
    
    thumbnails.forEach(thumbnail => {
        const videoSrc = thumbnail.dataset.videoSrc;
        generateVideoThumbnail(videoSrc, thumbnail);
    });
}

// Générer une miniature pour une vidéo spécifique (version suggérée)
function generateVideoThumbnail(videoSrc, thumbnailElement) {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    
    video.addEventListener('loadedmetadata', function() {
        // Aller à 10% de la vidéo pour la miniature
        video.currentTime = video.duration * 0.1;
    });
    
    video.addEventListener('seeked', function() {
        try {
            // Créer un canvas pour capturer la frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Définir la taille du canvas (plus petite pour les suggestions)
            canvas.width = 250;
            canvas.height = 140;
            
            // Dessiner la frame sur le canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convertir en image et l'afficher
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Remplacer le fond par la miniature
            thumbnailElement.style.backgroundImage = `url(${thumbnailUrl})`;
            thumbnailElement.style.backgroundSize = 'cover';
            thumbnailElement.style.backgroundPosition = 'center';
            
            // Masquer l'icône de lecture par défaut
            const playIcon = thumbnailElement.querySelector('.fas.fa-play-circle');
            if (playIcon) {
                playIcon.style.opacity = '0.7';
            }
            
        } catch (error) {
            console.log('Impossible de générer la miniature:', error);
            // Garder l'icône par défaut en cas d'erreur
        }
    });
    
    video.addEventListener('error', function() {
        console.log('Erreur lors du chargement de la vidéo pour la miniature');
        // Garder l'icône par défaut en cas d'erreur
    });
    
    // Charger la vidéo
    video.src = videoSrc;
}
