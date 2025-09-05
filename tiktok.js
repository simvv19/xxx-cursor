// Variables globales
let allVideos = [];
let currentVideoIndex = 0;
let isPlaying = false;
let currentVideo = null;

// Éléments DOM
const tiktokVideo = document.getElementById('tiktokVideo');
const tiktokLoading = document.getElementById('tiktokLoading');
const tiktokPlayBtn = document.getElementById('tiktokPlayBtn');
const tiktokVideoTitle = document.getElementById('tiktokVideoTitle');
const tiktokVideoCreator = document.getElementById('tiktokVideoCreator');
const tiktokVideoDescription = document.getElementById('tiktokVideoDescription');
const tiktokLikeBtn = document.getElementById('tiktokLikeBtn');
const tiktokLikeCount = document.getElementById('tiktokLikeCount');
const prevVideoBtn = document.getElementById('prevVideoBtn');
const nextVideoBtn = document.getElementById('nextVideoBtn');
const currentVideoIndexSpan = document.getElementById('currentVideoIndex');
const totalVideosSpan = document.getElementById('totalVideos');
const tiktokProgressFill = document.getElementById('tiktokProgressFill');
const tiktokSearchModal = document.getElementById('tiktokSearchModal');
const tiktokSearchInput = document.getElementById('tiktokSearchInput');
const tiktokSearchResults = document.getElementById('tiktokSearchResults');
const tiktokCommentsModal = document.getElementById('tiktokCommentsModal');
const tiktokCommentBtn = document.getElementById('tiktokCommentBtn');
const tiktokCommentCount = document.getElementById('tiktokCommentCount');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const closeCommentsBtn = document.getElementById('closeCommentsBtn');
const commentsOverlay = document.getElementById('commentsOverlay');
const commentsCount = document.getElementById('commentsCount');

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllVideos();
    if (allVideos.length > 0) {
        displayCurrentVideo();
        setupEventListeners();
    } else {
        showNoVideosMessage();
    }
});

// Charger toutes les vidéos
async function loadAllVideos() {
    try {
        const response = await fetch('/api/videos');
        if (response.ok) {
            allVideos = await response.json();
            totalVideosSpan.textContent = allVideos.length;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error);
    }
}

// Afficher la vidéo actuelle
function displayCurrentVideo() {
    if (allVideos.length === 0) return;
    
    currentVideo = allVideos[currentVideoIndex];
    currentVideoIndexSpan.textContent = currentVideoIndex + 1;
    
    // Mettre à jour la vidéo
    tiktokVideo.src = `/uploads/${currentVideo.filename}`;
    tiktokVideo.load();
    
    // Mettre à jour les informations
    tiktokVideoTitle.textContent = currentVideo.title;
    tiktokVideoCreator.textContent = currentVideo.creator || 'Créateur inconnu';
    tiktokVideoDescription.textContent = currentVideo.tags ? currentVideo.tags.join(' • ') : 'Aucune description';
    
    // Mettre à jour les statistiques
    tiktokLikeCount.textContent = currentVideo.likes || 0;
    tiktokCommentCount.textContent = (currentVideo.comments && currentVideo.comments.length) || 0;
    
    // Mettre à jour l'état du bouton like
    updateLikeButton();
    
    // Incrémenter les vues
    incrementViews(currentVideo.id);
    
    // Masquer le loading
    tiktokLoading.style.display = 'none';
}

// Configurer les événements
function setupEventListeners() {
    // Navigation
    prevVideoBtn.addEventListener('click', () => {
        if (currentVideoIndex > 0) {
            currentVideoIndex--;
            displayCurrentVideo();
        }
    });
    
    nextVideoBtn.addEventListener('click', () => {
        if (currentVideoIndex < allVideos.length - 1) {
            currentVideoIndex++;
            displayCurrentVideo();
        }
    });
    
    // Contrôles vidéo
    tiktokPlayBtn.addEventListener('click', togglePlay);
    tiktokVideo.addEventListener('click', togglePlay);
    
    // Like
    tiktokLikeBtn.addEventListener('click', () => {
        toggleLike(currentVideo.id);
    });
    
    // Recherche
    document.getElementById('searchBtn').addEventListener('click', () => {
        tiktokSearchModal.style.display = 'flex';
        tiktokSearchInput.focus();
    });
    
    document.getElementById('closeSearchBtn').addEventListener('click', () => {
        tiktokSearchModal.style.display = 'none';
    });
    
    // Commentaires
    tiktokCommentBtn.addEventListener('click', () => {
        tiktokCommentsModal.style.display = 'block';
        loadComments();
        commentInput.focus();
    });
    
    closeCommentsBtn.addEventListener('click', closeCommentsModal);
    commentsOverlay.addEventListener('click', closeCommentsModal);
    
    // Soumission de commentaire
    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitComment();
        }
    });
    
    // Recherche en temps réel
    tiktokSearchInput.addEventListener('input', handleSearch);
    
    // Navigation clavier
    document.addEventListener('keydown', handleKeyboard);
    
    // Événements vidéo
    tiktokVideo.addEventListener('loadeddata', () => {
        tiktokLoading.style.display = 'none';
    });
    
    tiktokVideo.addEventListener('waiting', () => {
        tiktokLoading.style.display = 'flex';
    });
    
    tiktokVideo.addEventListener('timeupdate', updateProgress);
}

// Basculer la lecture
function togglePlay() {
    if (tiktokVideo.paused) {
        tiktokVideo.play();
        tiktokPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        isPlaying = true;
    } else {
        tiktokVideo.pause();
        tiktokPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    }
}

// Gestion du clavier
function handleKeyboard(e) {
    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            if (currentVideoIndex > 0) {
                currentVideoIndex--;
                displayCurrentVideo();
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (currentVideoIndex < allVideos.length - 1) {
                currentVideoIndex++;
                displayCurrentVideo();
            }
            break;
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
        case 'l':
        case 'L':
            toggleLike(currentVideo.id);
            break;
    }
}

// Mettre à jour la barre de progression
function updateProgress() {
    if (tiktokVideo.duration) {
        const progress = (tiktokVideo.currentTime / tiktokVideo.duration) * 100;
        tiktokProgressFill.style.width = `${progress}%`;
    }
}

// Gestion de la recherche
function handleSearch() {
    const query = tiktokSearchInput.value.toLowerCase();
    if (query.length < 2) {
        tiktokSearchResults.innerHTML = '';
        return;
    }
    
    const filteredVideos = allVideos.filter(video => 
        video.title.toLowerCase().includes(query) ||
        (video.creator && video.creator.toLowerCase().includes(query)) ||
        (video.tags && video.tags.some(tag => tag.toLowerCase().includes(query)))
    );
    
    displaySearchResults(filteredVideos);
}

// Afficher les résultats de recherche
function displaySearchResults(videos) {
    if (videos.length === 0) {
        tiktokSearchResults.innerHTML = '<p class="no-results">Aucune vidéo trouvée</p>';
        return;
    }
    
    tiktokSearchResults.innerHTML = videos.map((video, index) => `
        <div class="search-result-item" onclick="goToVideo(${allVideos.indexOf(video)})">
            <div class="search-result-thumbnail">
                <i class="fas fa-play-circle"></i>
            </div>
            <div class="search-result-info">
                <h4>${video.title}</h4>
                <p>${video.creator || 'Créateur inconnu'}</p>
                <span class="search-result-views">${video.views || 0} vues</span>
            </div>
        </div>
    `).join('');
}

// Aller à une vidéo spécifique
function goToVideo(index) {
    currentVideoIndex = index;
    displayCurrentVideo();
    tiktokSearchModal.style.display = 'none';
    tiktokSearchInput.value = '';
    tiktokSearchResults.innerHTML = '';
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
            updateLikeButton(result);
        }
    } catch (error) {
        console.error('Erreur lors du like:', error);
    }
}

// Mettre à jour le bouton like
function updateLikeButton(stats = null) {
    if (stats) {
        tiktokLikeCount.textContent = stats.likes;
        tiktokLikeBtn.classList.toggle('active', stats.hasLiked);
        if (currentVideo) {
            currentVideo.likes = stats.likes;
        }
    } else if (currentVideo) {
        tiktokLikeCount.textContent = currentVideo.likes || 0;
        tiktokLikeBtn.classList.remove('active');
    }
}

// Obtenir l'IP de l'utilisateur (simulation)
function getUserIp() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

// Afficher le message "Aucune vidéo"
function showNoVideosMessage() {
    tiktokVideo.style.display = 'none';
    tiktokLoading.innerHTML = `
        <div class="no-videos-message">
            <i class="fas fa-video-slash"></i>
            <h3>Aucune vidéo disponible</h3>
            <p>Uploadez des vidéos depuis la page admin pour les voir ici.</p>
            <a href="/admin" class="btn btn-primary">Aller à l'admin</a>
        </div>
    `;
    tiktokLoading.style.display = 'flex';
}

// Charger les commentaires
async function loadComments() {
    if (!currentVideo) return;
    
    try {
        const response = await fetch(`/api/videos/${currentVideo.id}/comments`);
        if (response.ok) {
            const comments = await response.json();
            displayComments(comments);
            tiktokCommentCount.textContent = comments.length;
            commentsCount.textContent = `${comments.length} commentaire${comments.length > 1 ? 's' : ''}`;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
    }
}

// Afficher les commentaires
function displayComments(comments) {
    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="no-comments">Aucun commentaire pour le moment. Soyez le premier à commenter !</div>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-avatar">
                ${comment.author.charAt(0).toUpperCase()}
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    ${comment.author === 'Créateur' ? '<span class="comment-badge">Créateur</span>' : ''}
                </div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-actions">
                    <span class="comment-time">${formatTime(comment.timestamp)}</span>
                    <button class="comment-like-btn" onclick="likeComment('${comment.id}')">
                        <i class="fas fa-heart"></i>
                        <span>${comment.likes || 0}</span>
                    </button>
                    <button class="comment-reply-btn" onclick="replyToComment('${comment.id}')">
                        Répondre
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Fermer le modal de commentaires
function closeCommentsModal() {
    tiktokCommentsModal.style.display = 'none';
}

// Soumettre un commentaire
async function submitComment() {
    const text = commentInput.value.trim();
    if (!text) return;
    
    if (!currentVideo) return;
    
    try {
        const response = await fetch(`/api/videos/${currentVideo.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                author: 'Utilisateur'
            })
        });
        
        if (response.ok) {
            commentInput.value = '';
            loadComments(); // Recharger les commentaires
        } else {
            console.error('Erreur lors de l\'ajout du commentaire');
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
    }
}

// Liker un commentaire
async function likeComment(commentId) {
    // Pour l'instant, on simule juste le like
    const likeBtn = document.querySelector(`[onclick="likeComment('${commentId}')"]`);
    if (likeBtn) {
        likeBtn.classList.toggle('active');
        const countSpan = likeBtn.querySelector('span');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent);
            countSpan.textContent = likeBtn.classList.contains('active') ? currentCount + 1 : currentCount - 1;
        }
    }
}

// Répondre à un commentaire
function replyToComment(commentId) {
    commentInput.focus();
    commentInput.placeholder = `Répondre au commentaire...`;
    // Ici on pourrait ajouter une logique pour identifier le commentaire parent
}

// Formater le temps
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Moins d'une minute
        return 'À l\'instant';
    } else if (diff < 3600000) { // Moins d'une heure
        const minutes = Math.floor(diff / 60000);
        return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diff < 86400000) { // Moins d'un jour
        const hours = Math.floor(diff / 3600000);
        return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
        return date.toLocaleDateString('fr-FR');
    }
}
