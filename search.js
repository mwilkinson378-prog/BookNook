const API_KEY = "AIzaSyAJ_yyCfJC39feTd4H06LKUYIAMXoJNBbo";
let currentStartIndex = 0;
let currentQuery = '';

// --- DYNAMIC STORAGE & AUTH HELPERS ---
function isUserGuest() {
    return localStorage.getItem("readingCompanionGuest") === "true" || 
           sessionStorage.getItem("readingCompanionGuest") === "true";
}

function getAuthStorage() {
    // If guest, use sessionStorage so it wipes when the session/tab closes.
    // If registered user, use localStorage so it persists.
    return isUserGuest() ? sessionStorage : localStorage;
}

function getSearchHistoryKey() {
    if (isUserGuest()) {
        return 'folio_recent_search_books_guest';
    }
    
    // For a registered user, tie the history key to their unique email/account
    try {
        const savedUser = localStorage.getItem("readingCompanionUser") || sessionStorage.getItem("readingCompanionUser");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user && user.email) {
                const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_');
                return `folio_recent_search_books_${safeEmail}`;
            }
        }
    } catch (e) {
        // fallback
    }
    return 'folio_recent_search_books_user';
}

const MAX_RECENTS = 6;

function getRecentSearchedBooks() {
    try {
        const storage = getAuthStorage();
        const key = getSearchHistoryKey();
        const data = storage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error("Error reading recent searches:", err);
        return [];
    }
}

function saveRecentSearchedBook(book) {
    if (!book) return;
    try {
        let recents = getRecentSearchedBooks();
        const identifier = book.id;
        recents = recents.filter(item => item.id !== identifier);

        const info = book.volumeInfo || {};
        const newItem = {
            id: book.id,
            title: info.title || 'Unknown Title',
            author: info.authors ? info.authors.join(', ') : 'Unknown Author',
            thumbnail: info.imageLinks?.thumbnail || 'image/replacement.png',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date().toLocaleDateString(),
            rawBook: book
        };

        recents.unshift(newItem);
        if (recents.length > MAX_RECENTS) recents.pop();
        
        const storage = getAuthStorage();
        const key = getSearchHistoryKey();
        storage.setItem(key, JSON.stringify(recents));
    } catch (err) {
        console.error("Error saving recent search:", err);
    }
}

function getPseudoRating(bookId) {
    if (!bookId) return "4.5";
    let hash = 0;
    for (let i = 0; i < bookId.length; i++) {
        hash = bookId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rating = 4.0 + (Math.abs(hash) % 10) / 10;
    return rating.toFixed(1);
}

function showRecentSearchesScreen() {
    const recentScreen = document.getElementById('recent-searches-screen');
    const bookDisplay = document.getElementById('book-display');
    const recentGrid = document.getElementById('recent-books-grid');
    const nextPageBtn = document.getElementById('next-page-btn');
    
    if (!recentScreen || !recentGrid) return;

    const recents = getRecentSearchedBooks();

    if (recents.length === 0) {
        recentScreen.style.display = 'none';
        if (bookDisplay) {
            bookDisplay.style.display = 'grid';
            bookDisplay.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color: #888; padding: 40px;">No recent searches yet. Type something above to search!</p>';
        }
        return;
    }

    recentScreen.style.display = 'block';
    if (bookDisplay) bookDisplay.style.display = 'none';
    if (nextPageBtn) nextPageBtn.style.display = 'none';

    recentGrid.innerHTML = '';
    recents.forEach((item) => {
        const info = item.rawBook.volumeInfo || {};
        const ratingValue = info.averageRating || getPseudoRating(item.rawBook.id);
        const ratingDisplay = `★ ${ratingValue}`;
        
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-cover-wrapper">
                <img src="${item.thumbnail}" alt="${item.title}" onerror="this.src='image/replacement.png'">
            </div>
            <div class="book-info">
                <h3>${item.title}</h3>
                <p>${item.author}</p>
                <div class="book-rating-stars">${ratingDisplay}</div>
                <span class="search-timestamp">Searched ${item.timestamp}</span>
            </div>
        `;

        card.addEventListener('click', () => {
            openBookPopupDetails(item.rawBook);
        });

        recentGrid.appendChild(card);
    });
}

document.getElementById('clear-recents-btn')?.addEventListener('click', () => {
    const storage = getAuthStorage();
    const key = getSearchHistoryKey();
    storage.removeItem(key);
    showRecentSearchesScreen();
});

document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('search-bar');
    if (searchBar && searchBar.value.trim() === '') {
        showRecentSearchesScreen();
    }
});

// --- FETCH BOOKS ---
async function fetchBooks(query, startIndex = 0, append = false) {
    const maxResults = 20;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&startIndex=${startIndex}&key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
        const data = await response.json();
        
        if (append) {
            appendBooks(data.items || []);
        } else {
            renderBooks(data.items || []);
            
            if (data.items && data.items.length > 0) {
                saveRecentSearchedBook(data.items[0]);
            }
        }
        
        const btn = document.getElementById('next-page-btn');
        if (btn) {
            btn.style.display = (data.items && data.items.length === maxResults) ? 'block' : 'none';
        }
        
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

function performSearch(query) {
    if (!query || query.trim() === '') return;
    currentQuery = query.trim();
    currentStartIndex = 0;
    
    const recentScreen = document.getElementById('recent-searches-screen');
    const bookDisplay = document.getElementById('book-display');
    if (recentScreen) recentScreen.style.display = 'none';
    if (bookDisplay) bookDisplay.style.display = 'grid';

    fetchBooks(currentQuery, currentStartIndex, false);
}

function renderBooks(books) {
    const grid = document.getElementById('book-display');
    if (!grid) return;
    grid.innerHTML = '';
    if (!books || books.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">No results found.</p>';
        const nextPageBtn = document.getElementById('next-page-btn');
        if (nextPageBtn) nextPageBtn.style.display = 'none';
        return;
    }
    appendBooks(books);
}

function openBookPopupDetails(book) {
    localStorage.setItem('selectedBook', JSON.stringify(book));
    const info = book.volumeInfo;
    const localImagePath = 'image/replacement.png';
    const imageUrl = info.imageLinks?.thumbnail || localImagePath;
    
    saveRecentSearchedBook(book);

    const currentReadModal = document.getElementById('currentReadModal');
    if (currentReadModal) {
        currentReadModal.classList.remove('inline-active');
        currentReadModal.style.display = 'none';
    }
    
    const detailsWrapper = document.querySelector('.details-wrapper');
    const ratingSection = document.querySelector('.rating-section');
    const aboutSection = document.querySelector('.about-section');
    const bottomNav = document.querySelector('#bookinfo-popup-overlay .bottom-navbookinfo');

    if (detailsWrapper) detailsWrapper.style.display = 'block';
    if (ratingSection) ratingSection.style.display = 'block';
    if (aboutSection) aboutSection.style.display = 'block';
    if (bottomNav) bottomNav.style.display = 'flex';

    const titleEl = document.getElementById('book-title');
    const authorEl = document.getElementById('book-author');
    if (titleEl) titleEl.innerText = info.title || 'Unknown Title';
    if (authorEl) authorEl.innerText = info.authors?.join(', ') || 'Unknown Author';
    
    const bioElement = document.getElementById('book-bio');
    if (bioElement) {
        bioElement.innerHTML = info.description || 'No description available.';
        bioElement.classList.remove('expanded');
    }
    
    const coverImg = document.getElementById('book-cover');
    const backdropImg = document.getElementById('backdrop-img');
    if (coverImg) coverImg.src = imageUrl;
    if (backdropImg) backdropImg.src = imageUrl;

    const ratingValue = info.averageRating || getPseudoRating(book.id);
    const ratingValueEl = document.querySelector('.rating-value');
    const starsEl = document.querySelector('.stars');
    
    if (ratingValueEl) {
        ratingValueEl.innerText = `${ratingValue} / 5 (${info.ratingsCount || Math.floor(Math.random() * 120) + 15} ratings)`;
    }
    if (starsEl) {
        starsEl.innerText = `★`.repeat(Math.round(ratingValue));
    }

    const tagsContainer = document.querySelector('.tags-container');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        let categories = info.categories;
        if (typeof categories === 'string') categories = [categories];
        
        if (categories && categories.length > 0) {
            categories.forEach(category => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.innerText = category;
                tagsContainer.appendChild(span);
            });
        }
        if (info.pageCount) {
            const pageSpan = document.createElement('span');
            pageSpan.className = 'tag';
            pageSpan.innerHTML = `🕮 ${info.pageCount} pages`;
            tagsContainer.appendChild(pageSpan);
        }
    }

    const popupOverlay = document.getElementById('bookinfo-popup-overlay');
    if (popupOverlay) {
        popupOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function appendBooks(books) {
    const grid = document.getElementById('book-display');
    if (!grid) return;
    
    books.forEach(book => {
        const info = book.volumeInfo;
        const card = document.createElement('div');
        card.className = 'book-card';
        
        const localImagePath = 'image/replacement.png'; 
        const thumbnail = info.imageLinks?.thumbnail || localImagePath;
        
        const ratingValue = info.averageRating || getPseudoRating(book.id);
        const ratingDisplay = `★ ${ratingValue}`;
        
        card.innerHTML = `
            <div class="book-cover-wrapper">
                <img src="${thumbnail}" alt="${info.title}" onerror="this.src='${localImagePath}'">
            </div>
            <div class="book-info">
                <h3>${info.title}</h3>
                <p>${info.authors?.[0] || 'Unknown Author'}</p>
                <div class="book-rating-stars">${ratingDisplay}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            openBookPopupDetails(book);
        });
        
        grid.appendChild(card);
    });
}

function closeBookPopup() {
    const popupOverlay = document.getElementById('bookinfo-popup-overlay');
    const currentReadModal = document.getElementById('currentReadModal');
    const defaultSections = document.getElementById('default-info-sections');
    const bio = document.getElementById('book-bio');

    if (popupOverlay) popupOverlay.style.display = 'none';
    if (currentReadModal) {
        currentReadModal.style.display = 'none';
        currentReadModal.classList.remove('inline-active');
    }
    if (defaultSections) defaultSections.style.display = 'block';
    if (bio) {
        bio.classList.remove('expanded');
        const readMoreBtn = document.getElementById('read-more-btn');
        if (readMoreBtn) readMoreBtn.innerText = "Read More";
    }
    
    const searchBar = document.getElementById('search-bar');
    if (searchBar && searchBar.value.trim() === '') {
        showRecentSearchesScreen();
    }
}

document.querySelector('.hero-back-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeBookPopup();
});

const searchBar = document.getElementById('search-bar');
if (searchBar) {
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(e.target.value.trim());
        }
    });
    
    searchBar.addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
            showRecentSearchesScreen();
        }
    });
}

const nextPageBtn = document.getElementById('next-page-btn');
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
        currentStartIndex += 10;
        fetchBooks(currentQuery, currentStartIndex, true);
    });
}

// --- LIBRARY HANDLERS ---
function populateCategoryPills() {
    const pillsContainer = document.getElementById('category-pills-container');
    if (!pillsContainer) return;
    pillsContainer.innerHTML = ''; 
    const defaultCategories = ["Favorites", "To-Read", "Finished", "DNF"];
    let savedCategories = [];
    try {
        savedCategories = JSON.parse(localStorage.getItem('userCategories'));
    } catch (e) {
        savedCategories = defaultCategories;
    }
    let categories = (Array.isArray(savedCategories) && savedCategories.length > 0) ? savedCategories : defaultCategories;
    categories.filter(cat => cat && typeof cat === 'string' && cat.toLowerCase() !== 'all').forEach((category) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'category-pill';
        pill.innerText = category;
        pill.dataset.category = category;
        pillsContainer.appendChild(pill);
    });
}

document.addEventListener('click', (e) => {
    const pill = e.target.closest('.category-pill');
    if (pill) {
        e.preventDefault();
        e.stopPropagation();
        pill.classList.toggle('active');
    }
});

document.addEventListener('click', (e) => {
    const readMoreBtn = e.target.closest('#read-more-btn');
    if (readMoreBtn) {
        e.preventDefault();
        e.stopPropagation();
        const bio = document.getElementById('book-bio');
        if (!bio) return;
        bio.classList.toggle('expanded');
        readMoreBtn.innerText = bio.classList.contains('expanded') ? "Read Less" : "Read More";
    }
});

document.addEventListener('click', (e) => {
    const libraryBtn = e.target.closest('.btn-library');
    if (libraryBtn) {
        e.preventDefault();
        e.stopPropagation();
        populateCategoryPills();
        const defaultSections = document.getElementById('default-info-sections');
        const currentReadModal = document.getElementById('currentReadModal');
        const progressContainer = document.getElementById('current-progress-container');
        const modalHeading = document.getElementById('modal-title-heading');
        if (modalHeading) modalHeading.textContent = "Add to Library";
        if (progressContainer) progressContainer.style.display = 'none';
        if (defaultSections) defaultSections.style.display = 'none';
        if (currentReadModal) currentReadModal.style.display = 'block';
    }
});

document.addEventListener('click', (e) => {
    const currentBtn = e.target.closest('.btn-current');
    if (currentBtn) {
        e.preventDefault();
        e.stopPropagation();
        populateCategoryPills();
        const rawBook = localStorage.getItem('selectedBook');
        if (!rawBook) return;
        let selectedBookData;
        try { selectedBookData = JSON.parse(rawBook); } catch (err) { return; }
        const info = selectedBookData.volumeInfo || {};
        const totalPages = info.pageCount || selectedBookData.pageCount || 300;
        const totalPagesDisplay = document.getElementById('modal-total-pages-display');
        if (totalPagesDisplay) totalPagesDisplay.textContent = totalPages;
        const pagesInput = document.getElementById('current-pages-read-input');
        if (pagesInput) { pagesInput.value = 0; pagesInput.max = totalPages; }
        const defaultSections = document.getElementById('default-info-sections');
        const currentReadModal = document.getElementById('currentReadModal');
        const progressContainer = document.getElementById('current-progress-container');
        const modalHeading = document.getElementById('modal-title-heading');
        if (modalHeading) modalHeading.textContent = "Add to Current Read & Library";
        if (progressContainer) progressContainer.style.display = 'block';
        if (defaultSections) defaultSections.style.display = 'none';
        if (currentReadModal) currentReadModal.style.display = 'block';
    }
});

document.getElementById('current-cancel-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const defaultSections = document.getElementById('default-info-sections');
    const currentReadModal = document.getElementById('currentReadModal');
    if (currentReadModal) currentReadModal.style.display = 'none';
    if (defaultSections) defaultSections.style.display = 'block';
});

document.getElementById('current-confirm-btn')?.addEventListener('click', () => {
    const rawBook = localStorage.getItem('selectedBook');
    if (!rawBook) return;
    let selectedBookData;
    try { selectedBookData = JSON.parse(rawBook); } catch (err) { return; }
    const activePills = document.querySelectorAll('#currentReadModal .category-pill.active');
    let selectedCategories = Array.from(activePills).map(pill => pill.dataset.category);
    const progressContainer = document.getElementById('current-progress-container');
    const isCurrentReadMode = progressContainer && progressContainer.style.display !== 'none';
    if (selectedCategories.length === 0) {
        selectedCategories = isCurrentReadMode ? ["Current Read"] : ["To-Read"];
    }
    let lowerCats = selectedCategories.map(cat => (cat ? cat.toLowerCase() : ''));
    if (!lowerCats.includes('all')) { selectedCategories.unshift("All"); }
    selectedCategories = Array.from(new Set(selectedCategories));
    const info = selectedBookData.volumeInfo || {};
    const totalPages = parseInt(info.pageCount || selectedBookData.pageCount || 300);
    const pagesReadInput = document.getElementById('current-pages-read-input');
    const pagesRead = (isCurrentReadMode && pagesReadInput) ? parseInt(pagesReadInput.value) || 0 : 0;
    if (isCurrentReadMode && pagesRead > totalPages) {
        alert("Pages read cannot exceed total pages!");
        return;
    }
    const progressPercent = totalPages > 0 ? Math.round((pagesRead / totalPages) * 100) : 0;
    const formattedBook = {
        id: selectedBookData.id || ('book-' + Date.now()),
        title: info.title || selectedBookData.title || 'Unknown Title',
        author: info.authors ? info.authors.join(', ') : (selectedBookData.author || 'Unknown Author'),
        image: info.imageLinks?.thumbnail || selectedBookData.image || 'image/replacement.png',
        categories: selectedCategories,
        totalPages: totalPages,
        pagesRead: pagesRead,
        progressPercent: progressPercent,
        status: isCurrentReadMode ? 'current' : 'library',
        description: info.description || selectedBookData.description || 'No description available.'
    };
    let myLibrary = JSON.parse(localStorage.getItem('myLibrary')) || [];
    myLibrary = myLibrary.filter(b => b.id !== formattedBook.id);
    myLibrary.push(formattedBook);
    localStorage.setItem('myLibrary', JSON.stringify(myLibrary));
    if (isCurrentReadMode) {
        localStorage.setItem('currentlyReading', JSON.stringify(formattedBook));
        window.location.href = 'home.html';
    } else {
        window.location.href = 'library.html';
    }
});

// --- UNIVERSAL LOGOUT CLEAN-UP ---
function handleUserLogout() {
    sessionStorage.clear();

    try {
        const savedUser = localStorage.getItem("readingCompanionUser");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user && user.email) {
                const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_');
                localStorage.removeItem(`folio_recent_search_books_${safeEmail}`);
            }
        }
    } catch (e) {}
    
    localStorage.removeItem("folio_recent_search_books");
    localStorage.removeItem("folio_recent_search_books_guest");
    localStorage.removeItem("readingCompanionLoggedIn");
    localStorage.removeItem("readingCompanionGuest");
    localStorage.removeItem("readingCompanionUser");

    window.location.href = "index.html";
}

document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('#logout-btn');
    if (logoutBtn) {
        e.preventDefault();
        handleUserLogout();
    }
});