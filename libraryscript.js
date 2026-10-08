// --- UNIFIED INITIALIZATION & PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Scanner button setup
    const scanBtn = document.querySelector('.nav-btnscan');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            alert("Opening QR Scanner...");
        });
    }

    renderPills();
    updateLibraryWidgets();
    updateStatusOverview();
    loadLibraryCurrentlyReading();

    const urlParams = new URLSearchParams(window.location.search);
    const targetCategory = urlParams.get('category');

    if (targetCategory) {
        setTimeout(() => {
            const pills = document.querySelectorAll('.pill, .category-pill');
            const targetPill = Array.from(pills).find(
                pill => pill.innerText.trim().toLowerCase() === targetCategory.trim().toLowerCase()
            );

            if (targetPill) {
                targetPill.click();
            } else {
                filterLibrary('All');
            }
        }, 50);
    } else {
        filterLibrary('All');
        
        const allPill = document.querySelector('#pill-container .pill, .category-pill[data-category="All"], [onclick*="All"], [onclick*="all"]');
        if (allPill) {
            document.querySelectorAll('.pill, .category-pill').forEach(p => p.classList.remove('active'));
            allPill.classList.add('active');
        }
    }
});
function updateLibraryWidgets() {
    const library = JSON.parse(localStorage.getItem('myLibrary')) || [];
    
    const uniqueLibrary = library.filter((book, index, self) =>
        index === self.findIndex((b) => b.id === book.id)
    );

    const isDnfOrToRead = (book) => {
        let cats = [];
        if (typeof book.category === 'string') cats.push(book.category.toLowerCase().trim());
        if (typeof book.shelf === 'string') cats.push(book.shelf.toLowerCase().trim());
        if (Array.isArray(book.categories)) {
            book.categories.forEach(c => { if (c) cats.push(String(c).toLowerCase().trim()); });
        } else if (typeof book.categories === 'string') {
            book.categories.split(',').forEach(c => { if (c) cats.push(c.toLowerCase().trim()); });
        }
        return cats.some(c => c === 'dnf' || c === 'to-read' || c === 'tbr');
    };

    const activeLibraryBooks = uniqueLibrary.filter(book => !isDnfOrToRead(book));
    const booksFinishedCount = activeLibraryBooks.length;

    const streakData = JSON.parse(localStorage.getItem('readingStreakData')) || { streakCount: 0 };
    const streakCount = streakData.streakCount;

    const activeMonths = 12; 
    const avgPerMonth = (booksFinishedCount / activeMonths).toFixed(1);

    if (document.getElementById('library-stat-books')) {
        document.getElementById('library-stat-books').textContent = booksFinishedCount;
    }
    if (document.getElementById('library-stat-streak')) {
        document.getElementById('library-stat-streak').textContent = streakCount;
    }
    if (document.getElementById('library-stat-avg')) {
        document.getElementById('library-stat-avg').textContent = avgPerMonth;
    }

    const authorContainer = document.getElementById('genre-stat-list');
    if (!authorContainer) return;

    let authorCounts = {};

    uniqueLibrary.forEach(book => {
        
        let author = book.author || book.volumeInfo?.authors?.[0];
        
        if (Array.isArray(book.authors) && book.authors.length > 0) {
            author = book.authors[0];
        }

        if (!author) return;
        const cleanAuthor = String(author).trim();
        
        if (cleanAuthor.toLowerCase() === 'unknown author' || cleanAuthor === '') return;

        authorCounts[cleanAuthor] = (authorCounts[cleanAuthor] || 0) + 1;
    });

    let sortedAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedAuthors.length === 0) {
        authorContainer.innerHTML = `<p style="color: #8A8F87; font-size: 0.85rem; text-align: center; padding: 10px 0;">No author data yet.</p>`;
        return;
    }

    const maxCount = sortedAuthors[0][1];

    authorContainer.innerHTML = sortedAuthors.map(([author, count]) => {
        const percentage = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
        return `
            <div class="genre-item">
                <div class="genre-row"><span>${author}</span><span>${count}</span></div>
                <div class="genre-bar-track"><div class="genre-bar-fill" style="width: ${percentage}%;"></div></div>
            </div>
        `;
    }).join('');
}
function updateStatusOverview() {
    const container = document.getElementById('status-overview-list') || document.querySelector('.status-overview-list');
    if (!container) return;

    const library = JSON.parse(localStorage.getItem('myLibrary')) || [];
    
    // Deduplicate books by id
    const uniqueLibrary = library.filter((book, index, self) =>
        index === self.findIndex((b) => b.id === book.id)
    );

    let itemsMap = {
        'Reading': { count: 0, className: 'reading', bgColor: '#d8e2dcb1', textColor: '#2A403A' },     // Rich, distinct soft sage
        'Finished': { count: 0, className: 'finished', bgColor: '#ece2d0a1', textColor: '#6E5330' },   // Rich editorial gold/tan
        'To-Read': { count: 0, className: 'to-read', bgColor: '#cfddd599', textColor: '#233832' },     // Clean light teal-sage
        'DNF': { count: 0, className: 'dnf', bgColor: '#e8d5cea6', textColor: '#6B382F' }              // Warm muted terracotta/earth
    };

    uniqueLibrary.forEach(book => {
        let bookCategories = [];
        
        if (typeof book.category === 'string') bookCategories.push(book.category.trim());
        if (typeof book.shelf === 'string') bookCategories.push(book.shelf.trim());
        
        if (Array.isArray(book.categories)) {
            book.categories.forEach(c => {
                if (c) bookCategories.push(String(c).trim());
            });
        } else if (typeof book.categories === 'string') {
            book.categories.split(',').forEach(c => {
                if (c) bookCategories.push(c.trim());
            });
        }

        bookCategories.forEach(c => {
            if (!c || c.toLowerCase() === 'all') return;
            const lowerC = c.toLowerCase();

            if (lowerC === 'reading' || lowerC === 'currently reading') {
                itemsMap['Reading'].count++;
            } else if (lowerC === 'finished' || lowerC === 'read') {
                itemsMap['Finished'].count++;
            } else if (lowerC === 'to-read' || lowerC === 'tbr') {
                itemsMap['To-Read'].count++;
            } else if (lowerC === 'dnf') {
                itemsMap['DNF'].count++;
            } else {
                
                if (!itemsMap[c]) {
                    const cssClass = c.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    
                    let hash = 0;
                    for (let i = 0; i < c.length; i++) {
                        hash = c.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    
                    const dynamicTints = [
                        { bg: '#e5d9c5a7', text: '#5E4A28' },
                        { bg: '#d3dfdc9e', text: '#243B36' }, 
                        { bg: '#e2d3d099', text: '#593833' }  
                    ];
                    
                    const selectedTint = dynamicTints[Math.abs(hash) % dynamicTints.length];

                    itemsMap[c] = { 
                        count: 0, 
                        className: cssClass, 
                        bgColor: selectedTint.bg, 
                        textColor: selectedTint.text 
                    };
                }
                itemsMap[c].count++;
            }
        });
    });

    let topFour = Object.entries(itemsMap)
        .sort((a, b) => b[1].count - b[1].count) // Fixed sort stability
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4);

    if (topFour.length === 0) {
        container.innerHTML = `<p style="color: #687c6d; font-size: 0.85rem; text-align: center; padding: 10px 0;">No status data yet.</p>`;
        return;
    }

    container.innerHTML = topFour.map(([name, data]) => {
        return `
            <div class="status-pill-row ${data.className}" style="background-color: ${data.bgColor}; color: ${data.textColor};">
                <span style="color: inherit; font-weight: 500;">${name}</span>
                <span style="color: inherit; font-weight: 600;">${data.count}</span>
            </div>
        `;
    }).join('');
}
const defaultCategories = ["All", "Favorites", "To-Read", "Finished", "DNF"];

function renderPills() {
    const container = document.getElementById('pill-container');
    if (!container) return;

    let categories = JSON.parse(localStorage.getItem('userCategories'));

    if (!categories || categories.length === 0) {
        categories = defaultCategories;
        localStorage.setItem('userCategories', JSON.stringify(categories));
    }

    container.innerHTML = `<button class="pill add-pill" onclick="openCategoryModal()">+ Add</button>`;

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.innerText = cat;
        btn.onclick = () => {
            document.querySelectorAll('.pill, .category-pill').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            filterLibrary(cat);
        };
        container.appendChild(btn);
    });
}

function openCategoryModal() {
    if (document.getElementById('category-modal')) return;

    let categories = JSON.parse(localStorage.getItem('userCategories')) || defaultCategories;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'category-modal';
    modalOverlay.className = 'modal-overlay';

    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn" onclick="closeCategoryModal()">&times;</button>
            <h3>Add Category</h3>
            <div class="category-list-container">
                <ul id="editable-category-list">
                    ${categories.map((cat, index) => `
                        <li>
                            <span>${cat}</span>
                            ${defaultCategories.includes(cat) ? '' : `<button class="delete-cat-btn" onclick="deleteCategory(${index})">&times;</button>`}
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="modal-input-group">
                <input type="text" id="new-category-input" placeholder="New category name..." />
                <button class="modal-confirm-btn" onclick="saveNewCategory()">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.remove();
}

function deleteCategory(index) {
    let categories = JSON.parse(localStorage.getItem('userCategories')) || defaultCategories;
    categories.splice(index, 1);
    localStorage.setItem('userCategories', JSON.stringify(categories));
    
    closeCategoryModal();
    openCategoryModal();
    renderPills();
}

function saveNewCategory() {
    const input = document.getElementById('new-category-input');
    const newCat = input ? input.value.trim() : '';

    if (newCat) {
        let categories = JSON.parse(localStorage.getItem('userCategories')) || defaultCategories;
        if (!categories.includes(newCat)) {
            categories.push(newCat);
            localStorage.setItem('userCategories', JSON.stringify(categories));
            renderPills();
        }
        closeCategoryModal();
    }
}

let currentDisplayLimit = Infinity;

function filterLibrary(category) {
    const gridContainer = document.querySelector('.library-grid') || document.getElementById('library-display');
    
    if (gridContainer) {
        gridContainer.style.minHeight = gridContainer.offsetHeight + 'px';
    }

    const library = JSON.parse(localStorage.getItem('myLibrary')) || [];
    const display = document.getElementById('library-display');
    const countEl = document.getElementById('book-count');
    const viewMoreBtn = document.getElementById('view-more-btn');
   
    if (!display) return;

    const uniqueLibrary = library.map((book, index) => {
        let cats = book.categories || [];
        if (typeof cats === 'string') cats = cats.split(',').map(c => c.trim());
        if (!Array.isArray(cats)) cats = [];
        
        if (!cats.map(c => c.toLowerCase()).includes('all')) {
            cats.push('All');
        }
        const bookId = book.id || book.title + '-' + index;
        
        return { ...book, id: bookId, categories: cats };
    }).filter((book, index, self) =>
        index === self.findIndex((b) => b.id === book.id || (b.title === book.title && b.author === book.author))
    );

    localStorage.setItem('myLibrary', JSON.stringify(uniqueLibrary));
   
    const filtered = (!category || category.toLowerCase() === 'all')
        ? uniqueLibrary
        : uniqueLibrary.filter(book => {
            let cats = book.categories || [];
            if (typeof cats === 'string') cats = cats.split(',');
            return cats.some(cat => cat && cat.trim().toLowerCase() === category.trim().toLowerCase());
          });
   
    if (countEl) {
        countEl.innerText = `Book Count: ${filtered.length}`;
    }

   display.innerHTML = '';

    filtered.slice(0, currentDisplayLimit).forEach(book => {
        const div = document.createElement('div');
        div.className = 'book-item';
       
        div.innerHTML = `
            <div class="book-cardlibrary">
                <img src="${book.image || book.volumeInfo?.imageLinks?.thumbnail || 'image/replacement.png'}" alt="${book.title}" onerror="this.src='image/replacement.png'">
            </div>
            <div class="book-infolibrary">
                <h4>${book.title}</h4>
                <p>${book.author || 'Unknown Author'}</p>
            </div>
        `;

        div.addEventListener('click', () => {
            localStorage.setItem('selectedBook', JSON.stringify(book));
            
            const existingModal = document.getElementById('book-popup-modal');
            if (existingModal) existingModal.remove();

            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'book-popup-modal';
            modalOverlay.className = 'modal-overlay';
            
            modalOverlay.innerHTML = `
                <div class="customize-wrapper" style="background: #FCF9F5; border-radius: 20px; padding: 24px; position: relative; max-height: 90vh; overflow-y: auto;">
                    <button class="modal-close-btn" onclick="document.getElementById('book-popup-modal').remove()" style="position: absolute; top: 16px; right: 20px; background: none; border: none; font-size: 1.25rem; color: #8A8F87; cursor: pointer;">&times;</button>
                    <h1>Customize Book</h1>

                    <!-- Book Summary Card -->
                    <div class="book-summary-card">
                        <img id="info-book-cover" src="${book.image || book.volumeInfo?.imageLinks?.thumbnail || 'image/replacement.png'}" alt="Book Cover" onerror="this.src='image/replacement.png'">
                        <div class="book-summary-info">
                            <h3 id="info-book-title">${book.title || 'Unknown Title'}</h3>
                            <p id="info-book-author">${book.author || 'Unknown Author'}</p>
                            <div class="page-badge">
                                <span>🕮</span> <span id="info-page-count">${book.pageCount || 300} pages</span>
                            </div>
                        </div>
                    </div>

                    <!-- Add to Shelf Section -->
                    <div class="section-label">ADD TO SHELF</div>
                    <div class="pill-grid" id="popup-edit-categories-container"></div>

                    <!-- Personal Rating Section -->
                    <div class="section-label">YOUR RATING</div>
                    <div class="rating-box">
                        <span id="popup-rating-text">${book.rating ? book.rating + ' of 5 Stars' : 'Tap to rate'}</span>
                        <div class="star-rating" id="popup-star-container">
                            <span class="star ${book.rating >= 1 ? 'active' : ''}" data-value="1">★</span>
                            <span class="star ${book.rating >= 2 ? 'active' : ''}" data-value="2">★</span>
                            <span class="star ${book.rating >= 3 ? 'active' : ''}" data-value="3">★</span>
                            <span class="star ${book.rating >= 4 ? 'active' : ''}" data-value="4">★</span>
                            <span class="star ${book.rating >= 5 ? 'active' : ''}" data-value="5">★</span>
                        </div>
                    </div>

                    <!-- Daily Reading Duration Section -->
                    <div class="section-label">DAILY READING DURATION</div>
                    <div class="pill-grid" id="popup-duration-container">
                        <button type="button" class="duration-pill ${book.readingTime === '< 30 min' ? 'active' : ''}" onclick="popupSetDuration(this)">&lt; 30 min</button>
                        <button type="button" class="duration-pill ${book.readingTime === '30–60 min' ? 'active' : ''}" onclick="popupSetDuration(this)">30–60 min</button>
                        <button type="button" class="duration-pill ${book.readingTime === '1–2 hrs' ? 'active' : ''}" onclick="popupSetDuration(this)">1–2 hrs</button>
                        <button type="button" class="duration-pill ${book.readingTime === '2+ hrs' ? 'active' : ''}" onclick="popupSetDuration(this)">2+ hrs</button>
                    </div>

                    <!-- Favourite Quote Section -->
                    <div class="section-label">FAVOURITE QUOTE</div>
                    <div class="quote-box">
                        <div class="quote-input-wrapper">
                            <span class="quote-icon">“</span>
                            <textarea id="popup-user-quotes" placeholder="Paste a line that stayed with you...">${book.quotes || ''}</textarea>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <button id="popup-save-book-edits" type="button" class="btn-save">Save Changes</button>
                    <button id="popup-remove-book-btn" type="button" class="btn-remove">Remove from Library</button>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            // Populate Category Pills inside the Popup
            const catContainer = document.getElementById('popup-edit-categories-container');
            const allStoredCategories = JSON.parse(localStorage.getItem('userCategories')) || ["Favorites", "To-Read", "Finished", "Classics", "Non-Fiction", "Gifted"];
            const currentBookCategories = book.categories || [];

            allStoredCategories.forEach(cat => {
                if (cat.toLowerCase() === 'all') return;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'shelf-pill';
                const isAssigned = currentBookCategories.includes(cat);
                if (isAssigned) {
                    button.classList.add('active');
                    button.innerText = `✓ ${cat}`;
                } else {
                    button.innerText = cat;
                }
                button.onclick = () => {
                    button.classList.toggle('active');
                    button.innerText = button.classList.contains('active') ? `✓ ${cat}` : cat;
                };
                catContainer.appendChild(button);
            });

            // Star Rating Logic for Popup
            let popupRating = book.rating || 0;
            document.querySelectorAll('#popup-star-container .star').forEach(star => {
                star.onclick = () => {
                    popupRating = parseInt(star.getAttribute('data-value'));
                    const stars = document.querySelectorAll('#popup-star-container .star');
                    stars.forEach((s, idx) => {
                        if (idx < popupRating) s.classList.add('active');
                        else s.classList.remove('active');
                    });
                    document.getElementById('popup-rating-text').innerText = `${popupRating} of 5 Stars`;
                };
            });

            // Save Handler inside Popup
            document.getElementById('popup-save-book-edits').onclick = () => {
                let activeShelves = [];
                modalOverlay.querySelectorAll('.shelf-pill.active').forEach(p => {
                    activeShelves.push(p.innerText.replace('✓ ', '').trim());
                });

                let activeDuration = '';
                modalOverlay.querySelectorAll('.duration-pill.active').forEach(d => {
                    activeDuration = d.innerText.trim();
                });

                book.rating = popupRating;
                book.quotes = document.getElementById('popup-user-quotes').value;
                book.readingTime = activeDuration;
                book.categories = activeShelves;

                let library = JSON.parse(localStorage.getItem('myLibrary')) || [];
                const index = library.findIndex(item => item.id === book.id);
                if (index !== -1) library[index] = book;

                localStorage.setItem('myLibrary', JSON.stringify(library));
                modalOverlay.remove();
                filterLibrary(document.querySelector('.pill.active')?.innerText || 'All');
                updateLibraryWidgets();
                updateStatusOverview();
            };

            // Remove Handler inside Popup
            document.getElementById('popup-remove-book-btn').onclick = () => {
                if (confirm("Are you sure you want to remove this book from your library?")) {
                    let library = JSON.parse(localStorage.getItem('myLibrary')) || [];
                    library = library.filter(item => item.id !== book.id);
                    localStorage.setItem('myLibrary', JSON.stringify(library));
                    modalOverlay.remove();
                    filterLibrary('All');
                    updateLibraryWidgets();
                    updateStatusOverview();
                }
            };
        });

        display.appendChild(div);
    });

  
    const addCard = document.createElement('div');
    addCard.className = 'book-item';
    addCard.innerHTML = `
        <div class="book-cardlibrary add-card" onclick="window.location.href='search.html'">
            <div class="add-content">
                <div class="add-circle">+</div>
                <span class="add-label">Add</span>
            </div>
        </div>
        <div class="book-infolibrary" style="visibility: hidden;">
            <h4>Spacer</h4>
        </div>
    `;
    display.appendChild(addCard);

  
    if (viewMoreBtn) {
        viewMoreBtn.style.display = (currentDisplayLimit >= filtered.length) ? 'none' : 'block';
    }
    
    setTimeout(() => {
        if (gridContainer) {
            gridContainer.style.minHeight = '';
        }
    }, 100);
}

function popupSetDuration(button) {
    button.parentElement.querySelectorAll('.duration-pill').forEach(p => p.classList.remove('active'));
    button.classList.add('active');
}

function loadLibraryCurrentlyReading() {
    const container = document.getElementById('library-currently-reading-container');
    if (!container) return;

    let currentData = JSON.parse(localStorage.getItem('currentlyReading'));
    
    if (!currentData) {
        container.innerHTML = `<p style="text-align: center; color: #8A8F87; font-size: 0.9rem; font-family: 'DM Sans', sans-serif;">No book currently being read.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="reading-now-card">
            <div class="library-reading-card-top">
               
                <img src="${currentData.image}" alt="Book Cover" class="library-cover-img">
                
            </div>
            <div class="reading-now-content">
                <h4>${currentData.title}</h4>
                <p>${currentData.author}</p>
            </div>
            
        </div>
    `;
}