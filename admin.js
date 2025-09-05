// Variables globales
let allVideos = [];

// Éléments DOM
const uploadForm = document.getElementById('uploadForm');
const videoFile = document.getElementById('videoFile');
const videoTitle = document.getElementById('videoTitle');
const videoCreator = document.getElementById('videoCreator');
const videoCategory = document.getElementById('videoCategory');
const videoTags = document.getElementById('videoTags');
const uploadBtn = document.getElementById('uploadBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const fileInfo = document.getElementById('fileInfo');
const adminVideosList = document.getElementById('adminVideosList');
const adminLoading = document.getElementById('adminLoading');
const refreshBtn = document.getElementById('refreshBtn');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadAdminVideos();
});

// Configurer les événements
function setupEventListeners() {
    // Formulaire d'upload
    uploadForm.addEventListener('submit', handleUpload);
    
    // Sélection de fichier
    videoFile.addEventListener('change', handleFileSelect);
    
    // Bouton d'actualisation
    refreshBtn.addEventListener('click', loadAdminVideos);
    
    // Onglets
    setupTabs();
}

// Configurer les onglets
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Retirer la classe active de tous les onglets
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Ajouter la classe active à l'onglet sélectionné
            this.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Gérer la sélection de fichier
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (file) {
        const fileSize = formatFileSize(file.size);
        const fileType = file.type;
        
        fileInfo.innerHTML = `
            <strong>Fichier sélectionné:</strong><br>
            Nom: ${file.name}<br>
            Taille: ${fileSize}<br>
            Type: ${fileType}
        `;
        
        // Auto-remplir le titre si vide
        if (!videoTitle.value) {
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            videoTitle.value = nameWithoutExt;
        }
    } else {
        fileInfo.innerHTML = '';
    }
}

// Gérer l'upload
async function handleUpload(event) {
    event.preventDefault();
    
    const formData = new FormData();
    const file = videoFile.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner un fichier vidéo');
        return;
    }
    
    if (!videoTitle.value.trim()) {
        alert('Veuillez entrer un titre pour la vidéo');
        return;
    }
    
    if (!videoCategory.value) {
        alert('Veuillez sélectionner une catégorie');
        return;
    }
    
    formData.append('video', file);
    formData.append('title', videoTitle.value.trim());
    formData.append('creator', videoCreator.value.trim());
    formData.append('category', videoCategory.value);
    formData.append('tags', videoTags.value.trim());
    
    try {
        // Désactiver le bouton et afficher la progression
        uploadBtn.disabled = true;
        uploadProgress.style.display = 'block';
        progressText.textContent = 'Upload en cours...';
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            progressText.textContent = 'Upload réussi !';
            progressFill.style.width = '100%';
            
            // Réinitialiser le formulaire
            setTimeout(() => {
                uploadForm.reset();
                fileInfo.innerHTML = '';
                uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
                uploadBtn.disabled = false;
                
                // Actualiser la liste des vidéos
                loadAdminVideos();
                
                // Afficher un message de succès
                showNotification('Vidéo uploadée avec succès !', 'success');
            }, 1500);
        } else {
            throw new Error(result.error || 'Erreur lors de l\'upload');
        }
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        progressText.textContent = 'Erreur lors de l\'upload';
        showNotification(error.message, 'error');
        
        setTimeout(() => {
            uploadProgress.style.display = 'none';
            progressFill.style.width = '0%';
            uploadBtn.disabled = false;
        }, 2000);
    }
}

// Charger les vidéos pour l'administration
async function loadAdminVideos() {
    try {
        adminLoading.style.display = 'block';
        const response = await fetch('/api/videos');
        allVideos = await response.json();
        displayAdminVideos();
    } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error);
        showNotification('Erreur lors du chargement des vidéos', 'error');
    } finally {
        adminLoading.style.display = 'none';
    }
}

// Afficher les vidéos dans l'interface admin
function displayAdminVideos() {
    if (allVideos.length === 0) {
        adminVideosList.innerHTML = `
            <div class="no-videos">
                <i class="fas fa-video-slash" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>Aucune vidéo uploadée</p>
            </div>
        `;
        return;
    }
    
    // Trier par date d'upload (plus récentes en premier)
    const sortedVideos = [...allVideos].sort((a, b) => 
        new Date(b.uploadDate) - new Date(a.uploadDate)
    );
    
    adminVideosList.innerHTML = sortedVideos.map(video => createAdminVideoCard(video)).join('');
}

// Créer une carte vidéo pour l'admin
function createAdminVideoCard(video) {
    const uploadDate = new Date(video.uploadDate).toLocaleString('fr-FR');
    const fileSize = formatFileSize(video.size);
    
    return `
        <div class="admin-video-card" data-video-id="${video.id}">
            <h4 class="admin-video-title">${escapeHtml(video.title)}</h4>
            <div class="admin-video-meta">
                <div><strong>Fichier:</strong> ${escapeHtml(video.originalName)}</div>
                <div><strong>Taille:</strong> ${fileSize}</div>
                <div><strong>Uploadé le:</strong> ${uploadDate}</div>
                ${video.creator ? `<div><strong>Créateur:</strong> ${escapeHtml(video.creator)}</div>` : ''}
                ${video.category ? `<div><strong>Catégorie:</strong> <span class="category-badge">${escapeHtml(video.category)}</span></div>` : ''}
                ${video.tags && video.tags.length > 0 ? `<div><strong>Tags:</strong> ${video.tags.map(tag => escapeHtml(tag)).join(', ')}</div>` : ''}
            </div>
            <div class="admin-video-actions">
                <a href="/api/download/${video.id}" class="btn btn-primary" download>
                    <i class="fas fa-download"></i>
                    Télécharger
                </a>
                <button class="btn btn-secondary" onclick="copyVideoLink('${video.id}')">
                    <i class="fas fa-link"></i>
                    Copier le lien
                </button>
                <button class="btn btn-danger" onclick="deleteVideo('${video.id}', '${escapeHtml(video.title)}')">
                    <i class="fas fa-trash"></i>
                    Supprimer
                </button>
            </div>
        </div>
    `;
}

// Supprimer une vidéo
async function deleteVideo(videoId, videoTitle) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la vidéo "${videoTitle}" ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/videos/${videoId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Vidéo supprimée avec succès', 'success');
            loadAdminVideos(); // Actualiser la liste
        } else {
            throw new Error(result.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification(error.message, 'error');
    }
}

// Copier le lien de téléchargement
function copyVideoLink(videoId) {
    const link = `${window.location.origin}/api/download/${videoId}`;
    
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Lien copié dans le presse-papiers !', 'success');
    }).catch(() => {
        // Fallback pour les navigateurs plus anciens
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Lien copié dans le presse-papiers !', 'success');
    });
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Styles pour la notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
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
