// Variables globales
let allVideos = [];
let filteredVideos = [];
let currentFilter = 'all';
let currentCategoryFilter = 'all';

// Éléments DOM
const videosGrid = document.getElementById('videosGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const sortSelect = document.getElementById('sortSelect');
const filterTags = document.getElementById('filterTags');
const categoryFilters = document.getElementById('categoryFilters');
const loading = document.getElementById('loading');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadVideos();
    setupEventListeners();
    setupSidebarNavigation();
});

// Charger les vidéos
async function loadVideos() {
    try {
        loading.style.display = 'block';
        const response = await fetch('/api/videos');
        allVideos = await response.json();
        filteredVideos = [...allVideos];
        displayVideos();
        generateCategoryFilters();
        generateTagFilters();
    } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error);
        showError('Erreur lors du chargement des vidéos');
    } finally {
        loading.style.display = 'none';
    }
}

// Afficher les vidéos
function displayVideos() {
    if (filteredVideos.length === 0) {
        videosGrid.innerHTML = `
            <div class="no-videos">
                <i class="fas fa-video-slash" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>Aucune vidéo trouvée</p>
            </div>
        `;
        return;
    }

    videosGrid.innerHTML = filteredVideos.map(video => createVideoCard(video)).join('');
    
    // Générer les miniatures après l'affichage
    generateThumbnails();
}

// Créer une carte vidéo
function createVideoCard(video) {
    const uploadDate = new Date(video.uploadDate).toLocaleDateString('fr-FR');
    const fileSize = formatFileSize(video.size);
    
    return `
        <div class="video-card" data-video-id="${video.id}" onclick="playVideo('${video.id}')">
            <div class="video-thumbnail" data-video-src="/uploads/${video.filename}">
                <i class="fas fa-play-circle"></i>
                <div class="thumbnail-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="video-info">
                <h3 class="video-title">${escapeHtml(video.title)}</h3>
                <div class="video-meta">
                    <span><i class="fas fa-calendar"></i> ${uploadDate}</span>
                    <span><i class="fas fa-file"></i> ${fileSize}</span>
                </div>
                <div class="video-stats">
                    <span class="stat-item">
                        <i class="fas fa-eye"></i>
                        ${video.views || 0} vues
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-thumbs-up"></i>
                        ${video.likes || 0}
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-thumbs-down"></i>
                        ${video.dislikes || 0}
                    </span>
                </div>
                ${video.creator ? `<div class="video-creator"><i class="fas fa-user"></i> ${escapeHtml(video.creator)}</div>` : ''}
                <div class="video-categories">
                    ${video.category ? `<span class="category-tag">${escapeHtml(video.category)}</span>` : ''}
                    ${video.tags && video.tags.length > 0 ? video.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : ''}
                </div>
                <div class="video-actions">
                    <button class="btn btn-primary" onclick="playVideo('${video.id}')">
                        <i class="fas fa-play"></i>
                        Regarder
                    </button>
                    <a href="/api/download/${video.id}" class="btn btn-secondary" download>
                        <i class="fas fa-download"></i>
                        Télécharger
                    </a>
                </div>
                <div class="video-interactions">
                    <button class="interaction-btn like-btn" onclick="toggleLike('${video.id}')" data-video-id="${video.id}">
                        <i class="fas fa-thumbs-up"></i>
                        <span class="like-count">${video.likes || 0}</span>
                    </button>
                    <button class="interaction-btn dislike-btn" onclick="toggleDislike('${video.id}')" data-video-id="${video.id}">
                        <i class="fas fa-thumbs-down"></i>
                        <span class="dislike-count">${video.dislikes || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Configurer les événements
function setupEventListeners() {
    // Recherche
    searchInput.addEventListener('input', handleSearch);
    searchBtn.addEventListener('click', handleSearch);
    
    // Tri
    sortSelect.addEventListener('change', handleSort);
    
    // Recherche avec Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Filtres de catégories
    categoryFilters.addEventListener('click', function(e) {
        if (e.target.classList.contains('category-filter')) {
            const category = e.target.dataset.category;
            setCategoryFilter(category);
        }
    });
}

// Gérer la recherche
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (query === '') {
        filteredVideos = [...allVideos];
    } else {
        filteredVideos = allVideos.filter(video => 
            video.title.toLowerCase().includes(query) ||
            video.tags.some(tag => tag.toLowerCase().includes(query))
        );
    }
    
    applyCurrentFilters();
    displayVideos();
}

// Gérer le tri
function handleSort() {
    const sortBy = sortSelect.value;
    
    filteredVideos.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return new Date(b.uploadDate) - new Date(a.uploadDate);
            case 'oldest':
                return new Date(a.uploadDate) - new Date(b.uploadDate);
            case 'title':
                return a.title.localeCompare(b.title);
            case 'size':
                return b.size - a.size;
            default:
                return 0;
        }
    });
    
    displayVideos();
}

// Générer les filtres de catégories
function generateCategoryFilters() {
    const allCategories = [...new Set(allVideos.map(video => video.category).filter(Boolean))];
    
    if (allCategories.length === 0) {
        return;
    }
    
    const categoryButtons = allCategories.map(category => 
        `<button class="category-filter" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
    ).join('');
    
    categoryFilters.innerHTML = `
        <button class="category-filter active" data-category="all">Toutes</button>
        ${categoryButtons}
    `;
}

// Définir le filtre de catégorie
function setCategoryFilter(category) {
    currentCategoryFilter = category;
    
    // Mettre à jour l'état actif des filtres de catégories
    document.querySelectorAll('.category-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    const categoryBtn = document.querySelector(`[data-category="${category}"]`);
    if (categoryBtn) {
        categoryBtn.classList.add('active');
    }
    
    // Fermer le dropdown des catégories
    const categoriesDropdown = document.getElementById('categories-dropdown');
    const categoriesItem = document.querySelector('[data-dropdown="categories"]');
    categoriesDropdown.classList.remove('active');
    categoriesItem.classList.remove('active');
    
    applyCurrentFilters();
    displayVideos();
}

// Appliquer les filtres actuels
function applyCurrentFilters() {
    // Filtre par catégorie
    if (currentCategoryFilter !== 'all') {
        filteredVideos = filteredVideos.filter(video => 
            video.category === currentCategoryFilter
        );
    }
    
    // Filtre par tags
    if (currentFilter !== 'all') {
        filteredVideos = filteredVideos.filter(video => 
            video.tags && video.tags.includes(currentFilter)
        );
    }
}

// Générer les filtres de tags
function generateTagFilters() {
    const allTags = [...new Set(allVideos.flatMap(video => video.tags))];
    
    if (allTags.length === 0) {
        filterTags.innerHTML = '';
        return;
    }
    
    filterTags.innerHTML = `
        <button class="tag-filter ${currentFilter === 'all' ? 'active' : ''}" data-tag="all">
            Tous
        </button>
        ${allTags.map(tag => `
            <button class="tag-filter" data-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)}
            </button>
        `).join('')}
    `;
    
    // Ajouter les événements aux filtres
    filterTags.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag-filter')) {
            const tag = e.target.dataset.tag;
            setTagFilter(tag);
        }
    });
}

// Définir le filtre de tag
function setTagFilter(tag) {
    currentFilter = tag;
    
    // Mettre à jour l'état actif des filtres de tags
    document.querySelectorAll('.tag-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    const tagBtn = document.querySelector(`[data-tag="${tag}"]`);
    if (tagBtn) {
        tagBtn.classList.add('active');
    }
    
    // Fermer le dropdown des tags
    const tagsDropdown = document.getElementById('tags-dropdown');
    const tagsItem = document.querySelector('[data-dropdown="tags"]');
    tagsDropdown.classList.remove('active');
    tagsItem.classList.remove('active');
    
    applyCurrentFilters();
    displayVideos();
}

// Jouer une vidéo
function playVideo(videoId) {
    // Incrémenter les vues avant de rediriger
    incrementViews(videoId);
    window.location.href = `/video.html?id=${videoId}`;
}

// Aller à la page TikTok
function goToTiktok() {
    window.location.href = '/tiktok';
}

// Afficher les informations de la vidéo
function showVideoInfo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;
    
    const uploadDate = new Date(video.uploadDate).toLocaleString('fr-FR');
    const fileSize = formatFileSize(video.size);
    
    alert(`
Informations de la vidéo:
• Titre: ${video.title}
• Nom du fichier: ${video.originalName}
• Taille: ${fileSize}
• Date d'upload: ${uploadDate}
• Tags: ${video.tags.join(', ') || 'Aucun'}
    `);
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

// Afficher une erreur
function showError(message) {
    videosGrid.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
            <p>${message}</p>
        </div>
    `;
}

// Configuration de la navigation de la barre latérale
function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Gérer les dropdowns
            if (this.classList.contains('dropdown')) {
                e.preventDefault();
                toggleDropdown(this);
            } else {
                // Pour les liens normaux, retirer la classe active de tous les éléments
                navItems.forEach(nav => nav.classList.remove('active'));
                // Ajouter la classe active à l'élément cliqué
                this.classList.add('active');
            }
        });
    });
}

// Basculer l'état d'un menu déroulant
function toggleDropdown(dropdownItem) {
    const dropdownType = dropdownItem.dataset.dropdown;
    const dropdownMenu = document.getElementById(`${dropdownType}-dropdown`);
    
    // Fermer tous les autres dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== dropdownMenu) {
            menu.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.nav-item.dropdown').forEach(item => {
        if (item !== dropdownItem) {
            item.classList.remove('active');
        }
    });
    
    // Basculer le dropdown actuel
    dropdownItem.classList.toggle('active');
    dropdownMenu.classList.toggle('active');
    
    // Charger le contenu dynamique si nécessaire
    if (dropdownMenu.classList.contains('active')) {
        loadDropdownContent(dropdownType);
    }
}

// Charger le contenu dynamique des dropdowns
function loadDropdownContent(type) {
    switch(type) {
        case 'models':
            loadCreatorsDropdown();
            break;
        case 'tags':
            loadTagsDropdown();
            break;
    }
}

// Charger les créateurs dans le dropdown
function loadCreatorsDropdown() {
    const modelsDropdown = document.getElementById('models-dropdown');
    const creators = [...new Set(allVideos.map(video => video.creator).filter(Boolean))];
    
    // Garder seulement le premier élément (Tous les créateurs)
    const firstItem = modelsDropdown.querySelector('.dropdown-item');
    modelsDropdown.innerHTML = '';
    modelsDropdown.appendChild(firstItem);
    
    // Ajouter les créateurs
    creators.forEach(creator => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.onclick = () => filterByCreator(creator);
        item.innerHTML = `<span>${escapeHtml(creator)}</span>`;
        modelsDropdown.appendChild(item);
    });
}

// Charger les tags dans le dropdown
function loadTagsDropdown() {
    const tagsDropdown = document.getElementById('tags-dropdown');
    const allTags = [...new Set(allVideos.flatMap(video => video.tags))];
    
    // Garder seulement le premier élément (Tous les tags)
    const firstItem = tagsDropdown.querySelector('.dropdown-item');
    tagsDropdown.innerHTML = '';
    tagsDropdown.appendChild(firstItem);
    
    // Ajouter les tags
    allTags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.onclick = () => setTagFilter(tag);
        item.innerHTML = `<span>${escapeHtml(tag)}</span>`;
        tagsDropdown.appendChild(item);
    });
}

// Afficher le filtre des créateurs
function showCreatorsFilter() {
    const creators = [...new Set(allVideos.map(video => video.creator).filter(Boolean))];
    
    if (creators.length === 0) {
        alert('Aucun créateur trouvé');
        return;
    }
    
    const creatorList = creators.map(creator => 
        `<button class="creator-filter" onclick="filterByCreator('${escapeHtml(creator)}')">${escapeHtml(creator)}</button>`
    ).join('');
    
    // Créer un modal ou une popup pour afficher les créateurs
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Filtrer par créateur</h3>
            <div class="creator-filters">
                ${creatorList}
            </div>
            <button onclick="closeModal()" class="close-btn">Fermer</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Filtrer par créateur
function filterByCreator(creator) {
    if (creator === 'all') {
        filteredVideos = [...allVideos];
    } else {
        filteredVideos = allVideos.filter(video => 
            video.creator && video.creator.toLowerCase().includes(creator.toLowerCase())
        );
    }
    
    // Fermer le dropdown
    const modelsDropdown = document.getElementById('models-dropdown');
    const modelsItem = document.querySelector('[data-dropdown="models"]');
    modelsDropdown.classList.remove('active');
    modelsItem.classList.remove('active');
    
    displayVideos();
}

// Afficher tous les tags
function showAllTags() {
    const allTags = [...new Set(allVideos.flatMap(video => video.tags))];
    
    if (allTags.length === 0) {
        alert('Aucun tag trouvé');
        return;
    }
    
    const tagList = allTags.map(tag => 
        `<button class="tag-filter-modal" onclick="setTagFilter('${escapeHtml(tag)}')">${escapeHtml(tag)}</button>`
    ).join('');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Filtrer par tag</h3>
            <div class="tag-filters-modal">
                ${tagList}
            </div>
            <button onclick="closeModal()" class="close-btn">Fermer</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Fermer le modal
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Obtenir l'IP de l'utilisateur (simulation)
function getUserIp() {
    // En production, vous pourriez utiliser une API pour obtenir la vraie IP
    // Pour le développement, on utilise une IP simulée basée sur le navigateur
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
            updateViewsDisplay(videoId, result.views);
        }
    } catch (error) {
        console.error('Erreur lors de l\'incrémentation des vues:', error);
    }
}

// Mettre à jour l'affichage des vues
function updateViewsDisplay(videoId, views) {
    const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
    if (videoCard) {
        const viewsElement = videoCard.querySelector('.stat-item i.fa-eye').parentElement;
        viewsElement.innerHTML = `<i class="fas fa-eye"></i> ${views} vues`;
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
            updateLikeDisplay(videoId, result);
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
            updateLikeDisplay(videoId, result);
        }
    } catch (error) {
        console.error('Erreur lors du dislike:', error);
    }
}

// Mettre à jour l'affichage des likes/dislikes
function updateLikeDisplay(videoId, stats) {
    const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
    if (videoCard) {
        // Mettre à jour les compteurs
        const likeCount = videoCard.querySelector('.like-count');
        const dislikeCount = videoCard.querySelector('.dislike-count');
        
        if (likeCount) likeCount.textContent = stats.likes;
        if (dislikeCount) dislikeCount.textContent = stats.dislikes;
        
        // Mettre à jour les statistiques dans la carte
        const statsElements = videoCard.querySelectorAll('.stat-item');
        if (statsElements.length >= 3) {
            statsElements[1].innerHTML = `<i class="fas fa-thumbs-up"></i> ${stats.likes}`;
            statsElements[2].innerHTML = `<i class="fas fa-thumbs-down"></i> ${stats.dislikes}`;
        }
        
        // Mettre à jour les styles des boutons
        const likeBtn = videoCard.querySelector('.like-btn');
        const dislikeBtn = videoCard.querySelector('.dislike-btn');
        
        if (likeBtn) {
            likeBtn.classList.toggle('active', stats.hasLiked);
        }
        if (dislikeBtn) {
            dislikeBtn.classList.toggle('active', stats.hasDisliked);
        }
    }
}

// Générer les miniatures des vidéos
function generateThumbnails() {
    const thumbnails = document.querySelectorAll('.video-thumbnail[data-video-src]');
    
    thumbnails.forEach(thumbnail => {
        const videoSrc = thumbnail.dataset.videoSrc;
        generateVideoThumbnail(videoSrc, thumbnail);
    });
}

// Générer une miniature pour une vidéo spécifique
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
            
            // Définir la taille du canvas
            canvas.width = 300;
            canvas.height = 200;
            
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
