document.addEventListener('DOMContentLoaded', () => {
    loadCurrentlyReadingCard();
    loadStreakData();
    updateDashboardStats();
    loadRecentActivities();

    // Sync stats in real time if changes are made in another tab or page
    window.addEventListener('storage', (e) => {
        if (['myLibrary', 'readingStreakData', 'currentlyReading', 'annualBookGoal', 'userActiveGoals'].includes(e.key)) {
            updateDashboardStats();
            loadRecentActivities();
            loadCurrentlyReadingCard();
            loadStreakData();

            // If userActiveGoals changed, update the top stats grid cards (1 through 4)
            if (e.key === 'userActiveGoals' && typeof updateTopStats === 'function') {
                let activeGoals = JSON.parse(localStorage.getItem('userActiveGoals')) || [];
                updateTopStats(activeGoals);
            }
        }
    });

    const welcomeName = document.querySelector(".welcome-span");
    const savedUser = localStorage.getItem("readingCompanionUser");

    if (savedUser && welcomeName) {
        const user = JSON.parse(savedUser);

        if (user.name) {
            welcomeName.textContent = user.name + ".";
        }
    }

    // Create and inject the progress modal HTML dynamically if it isn't already in your page
    if (!document.getElementById('progressModal')) {
        const modalHtml = `
           <div id="progressModal" class="progress-modal-hidden">
                <div style="background: #FCF9F5; padding: 36px 30px; border-radius: 28px; width: 380px; box-shadow: 0 24px 48px rgba(45, 51, 47, 0.16); border: 1px solid rgba(223, 211, 195, 0.8); position: relative; font-family: 'DM Sans', sans-serif;">
                    <!-- Header Row with Icon -->
                    <div style="display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; width: 100%; margin-bottom: 24px;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background: #F4EFE6; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 12px; color: #454D47;">
                            📖
                        </div>
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #454D47; margin: 0; width: 100%; font-weight: 600;">Update Progress</h3>
                        <p style="font-size: 0.82rem; color: #8A8F87; margin: 4px 0 0 0;">Keep track of your reading journey</p>
                        <button id="progress-close-x" style="position: absolute; right: -4px; top: -4px; background: none; border: none; font-size: 1.3rem; cursor: pointer; color: #8A8F87; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;" onmouseover="this.style.background='#F4EFE6'" onmouseout="this.style.background='transparent'">&times;</button>
                    </div>

                    <!-- Input Section -->
                    <div style="margin-bottom: 24px;">
                        <label for="pagesReadInput" style="display: block; font-size: 0.82rem; font-weight: 600; color: #5A5F58; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">Pages Read So Far</label>
                        <input type="number" id="pagesReadInput" min="0" style="width: 100%; padding: 13px 16px; border-radius: 12px; border: 1px solid #DFD3C3; background: #FFFFFF; color: #454D47; font-size: 1.05rem; font-weight: 500; font-family: 'DM Sans', sans-serif; box-sizing: border-box; outline: none; transition: all 0.2s;" placeholder="e.g. 120" onfocus="this.style.borderColor='#454D47'; this.style.boxShadow='0 0 0 3px rgba(69, 77, 71, 0.08)'" onblur="this.style.borderColor='#DFD3C3'; this.style.boxShadow='none'">
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 10px;">
                        <button id="progress-cancel-btn" type="button" style="flex: 1; background: #F4EFE6; border: none; color: #5A5F58; padding: 12px; border-radius: 12px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; transition: background 0.2s;" onmouseover="this.style.background='#EAE3D5'" onmouseout="this.style.background='#F4EFE6'">Cancel</button>
                        <button id="progress-save-btn" type="button" style="flex: 1; background: #454D47; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; transition: background 0.2s;" onmouseover="this.style.background='#343C37'" onmouseout="this.style.background='#454D47'">Save Changes</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Global Event Delegation for Dynamic Elements
    document.body.addEventListener('click', (e) => {
        const progressModal = document.getElementById('progressModal');
       const closeProgressModal = () => {
    if (progressModal) {
        progressModal.classList.remove('progress-modal-visible');
        progressModal.classList.add('progress-modal-hidden');
    }
};

       
       if (e.target && e.target.id === 'trigger-progress-modal') {
    let currentData = JSON.parse(localStorage.getItem('currentlyReading'));

    if (currentData) {
        const inputField = document.getElementById('pagesReadInput');

        if (inputField) {
            inputField.value = currentData.pagesRead || 0;
        }

        if (progressModal) {
            progressModal.classList.remove('progress-modal-hidden');
            progressModal.classList.add('progress-modal-visible');
        }
    }

    return;
}

        // 2. Close progress modal actions
        if (e.target.id === 'progress-close-x' || e.target.id === 'progress-cancel-btn' || e.target === progressModal) {
            closeProgressModal();
        }

        // 3. Save progress modal changes
        if (e.target.id === 'progress-save-btn') {
            let currentData = JSON.parse(localStorage.getItem('currentlyReading'));
            if (!currentData) return;

            const inputVal = document.getElementById('pagesReadInput').value;
            const pagesRead = parseInt(inputVal) || 0;

            if (pagesRead > currentData.totalPages) {
                alert("Pages read cannot exceed total pages!");
                return;
            }

            // Streak Tracking Logic
            let streakData = JSON.parse(localStorage.getItem('readingStreakData')) || {
                streakCount: 0,
                lastUpdatedDate: ''
            };

            const todayStr = new Date().toDateString();

            if (pagesRead > currentData.pagesRead && streakData.lastUpdatedDate !== todayStr) {
                streakData.streakCount += 1;
                streakData.lastUpdatedDate = todayStr;
                localStorage.setItem('readingStreakData', JSON.stringify(streakData));
            }

            currentData.pagesRead = pagesRead;
            currentData.progressPercent = Math.round((pagesRead / currentData.totalPages) * 100);
            localStorage.setItem('currentlyReading', JSON.stringify(currentData));
            closeProgressModal();
            loadCurrentlyReadingCard();
            loadStreakData();
            updateDashboardStats();
        }

        // 4. Handle closing the dynamically generated book customization modal
        if (e.target && e.target.id === 'book-popup-modal') {
            e.target.remove();
        }
    });
});

function logActivity(title, author, actionText) {
    let activities = JSON.parse(localStorage.getItem('userActivityLog')) || [];

    const newActivity = {
        title: title || 'Untitled Book',
        author: author || 'Unknown Author',
        action: actionText || 'Updated',
        timestamp: Date.now()
    };

    activities.unshift(newActivity);

    if (activities.length > 3) {
        activities = activities.slice(0, 3);
    }

    localStorage.setItem('userActivityLog', JSON.stringify(activities));
}

function loadRecentActivities() {
    const container = document.querySelector('.activity-feed-list');
    if (!container) return;

    let activities = JSON.parse(localStorage.getItem('userActivityLog')) || [];

    if (activities.length === 0) {
        const library = JSON.parse(localStorage.getItem('myLibrary')) || [];

        if (library.length > 0) {
            const recentBooks = library.slice(-3).reverse();

            activities = recentBooks.map(book => {
                let action = 'Added to library';
                const categories = book.categories || [];
                const status = (book.status || '').toLowerCase();

                if (categories.some(c => c.toLowerCase() === 'finished') || status === 'finished') {
                    action = 'Marked finished';
                } else if (categories.some(c => c.toLowerCase() === 'to-read') || status === 'to-read') {
                    action = 'Added to TBR';
                }

                return {
                    title: book.title || 'Untitled',
                    author: book.author || book.volumeInfo?.authors?.[0] || 'Unknown Author',
                    action: action,
                    timestamp: Date.now() - 3600000
                };
            });
        }
    }

    if (activities.length === 0) {
        container.innerHTML = `<div class="activity-item" style="justify-content: center; color: #8A8F87; font-size: 0.85rem; padding: 15px 0;">No recent activity</div>`;
        return;
    }

    container.innerHTML = activities.slice(0, 3).map(item => {
        const diffHours = Math.floor((Date.now() - (item.timestamp || Date.now())) / (1000 * 60 * 60));
        let timeString = 'Just now';

        if (diffHours >= 1 && diffHours < 24) {
            timeString = `${diffHours}h ago`;
        } else if (diffHours >= 24 && diffHours < 48) {
            timeString = 'Yesterday';
        } else if (diffHours >= 48) {
            const diffDays = Math.floor(diffHours / 24);
            timeString = `${diffDays}d ago`;
        }

        return `
            <div class="activity-item">
                <div>
                    <p class="activity-main-text">${item.title}</p>
                    <p class="activity-sub-text">${item.author} • ${item.action}</p>
                </div>
                <span class="activity-time">${timeString}</span>
            </div>
        `;
    }).join('');
}

function updateDashboardStats() {
    const library = JSON.parse(localStorage.getItem('myLibrary')) || [];
    const uniqueLibrary = library.filter((book, index, self) =>
        index === self.findIndex((b) => b.id === book.id)
    );

    const finishedBooks = uniqueLibrary.filter(book => {
        const matchesCategory = book.categories && book.categories.some(cat => cat.toLowerCase() === 'finished');
        const matchesStatus = book.status && book.status.toLowerCase() === 'finished';
        return matchesCategory || matchesStatus;
    });

    const totalBooksRead = finishedBooks.length;

    const validPagesBooks = uniqueLibrary.filter(book => {
        const isDNF = (book.categories && book.categories.some(cat => cat.toLowerCase() === 'dnf')) ||
                      (book.status && book.status.toLowerCase() === 'dnf');
        return !isDNF;
    });

    const totalPagesRead = validPagesBooks.reduce((sum, book) => {
        const pages = parseInt(book.pages || book.pageCount || book.totalPage || book.page_count || 0);
        return sum + pages;
    }, 0);

    const readingStreakData = JSON.parse(localStorage.getItem('readingStreakData')) || { streakCount: 0 };
    const readingStreak = readingStreakData.streakCount;
    const annualGoal = parseInt(localStorage.getItem('annualBookGoal')) || 60;
    const goalProgressPercent = Math.min(Math.round((totalBooksRead / annualGoal) * 100), 100);

    if (document.getElementById('stat-books-read')) {
        document.getElementById('stat-books-read').textContent = totalBooksRead;
    }

    if (document.getElementById('stat-pages-read')) {
        document.getElementById('stat-pages-read').textContent = totalPagesRead.toLocaleString();
    }

    if (document.getElementById('stat-streak')) {
        document.getElementById('stat-streak').textContent = readingStreak;
    }

    if (document.getElementById('stat-goal-progress')) {
        document.getElementById('stat-goal-progress').textContent = goalProgressPercent + '%';
    }
}

function loadStreakData() {
    let streakData = JSON.parse(localStorage.getItem('readingStreakData')) || { streakCount: 0 };

    const streakNumEl = document.querySelector('.streak-number');

    if (streakNumEl) {
        streakNumEl.textContent = streakData.streakCount;
    }

    const todayIndex = new Date().getDay();
    const dayBadges = document.querySelectorAll('.streak-day-badge');
    const adjustedDayIndex = todayIndex === 0 ? 6 : todayIndex - 1;

    dayBadges.forEach((badge, index) => {
        if (index <= adjustedDayIndex) {
            badge.classList.add('completed');
        } else {
            badge.classList.remove('completed');
        }
    });
}

function loadCurrentlyReadingCard() {
    const container = document.getElementById('home-currently-reading-container');

    if (!container) return;

    let currentData = null;

    try {
        currentData = JSON.parse(
            localStorage.getItem('currentlyReading')
        );
    } catch (error) {
        currentData = null;
    }

    let card = container.querySelector('.reading-now-card');

    if (!card) {
        container.innerHTML = `<div class="reading-now-card"></div>`;
        card = container.querySelector('.reading-now-card');
    }

    if (!currentData) {
        card.className = 'reading-now-card empty-reading-card';

        card.style.cssText = `
            background: #FDF9F2 !important;
            border: 1px dashed rgba(184, 156, 117, 0.5);
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            text-align: center !important;
            box-sizing: border-box;
            border-radius: 28px;
            padding: 28px 20px !important;
            width: 100%;
            max-width: 100%;
        `;

        card.innerHTML = `
            <div class="card-header-top" style="width: 100%;">
                <div class="reading-status-indicator">
                    <div class="status-dot" style="background-color: #8A8F87;"></div>
                    <span>READING NOW</span>
                </div>
            </div>

            <div style="margin: 20px 0; display: flex; flex-direction: column; align-items: center;">
                <img src="media/readingcard.gif" alt="Reading Animation" style="width: 170px; height: auto; border-radius: 12px; margin-bottom: 14px; object-fit: cover;">
                <h3 style="font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #454D47; margin-bottom: 6px;">
                    No book selected
                </h3>
                <p style="font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #8A8F87; max-width: 240px; margin: 0 auto 20px auto;">
                    Choose a book from your library or search to start tracking your progress.
                </p>
            </div>

            <a href="search.html" class="btn-update-progress-card" style="text-decoration: none; text-align: center; display: block; line-height: normal;">
                Pick a New Book
            </a>
        `;

        return;
    }

    card.removeAttribute('style');
    card.className = 'reading-now-card';

    const bookImage =
        currentData.image ||
        currentData.volumeInfo?.imageLinks?.thumbnail ||
        'image/replacement.png';

    const progressPercent =
        Number(currentData.progressPercent) || 0;

    card.innerHTML = `
        <div class="card-upper-section">
            <div class="blur-layer-container">
                <img src="${bookImage}" alt="" class="cover-blur-bg" onerror="this.src='image/replacement.png'">
            </div>
            <div class="cover-color-overlay"></div>
            <div class="card-cover-wrapper">
                <img src="${bookImage}" alt="${currentData.title || 'Book Cover'}" class="card-book-cover" onerror="this.src='image/replacement.png'">
            </div>
        </div>

        <div class="card-right-content">
            <div class="card-header-top">
                <div class="reading-status-indicator">
                    <div class="status-dot"></div>
                    <span>READING NOW</span>
                </div>
                <a href="#" id="card-details-btn" class="details-link">Details &gt;</a>
            </div>

            <div class="card-book-title">
                ${currentData.title || 'Untitled Book'}
            </div>

            <p class="card-book-author">
                ${currentData.author || 'Unknown Author'}
            </p>

            <div class="card-progress-section">
                <div class="progress-labels">
                    <span>Progress</span>
                    <span>${progressPercent}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                </div>
            </div>

            <button id="trigger-progress-modal" type="button" class="btn-update-progress-card">
                Update Progress
            </button>
        </div>
    `;

    const detailsBtn = card.querySelector('#card-details-btn');

    if (!detailsBtn) return;

    detailsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        let book = null;

        try {
            book = JSON.parse(
                localStorage.getItem('currentlyReading')
            );
        } catch (error) {
            book = null;
        }

        if (!book) return;

        localStorage.setItem(
            'selectedBook',
            JSON.stringify(book)
        );

        const existingModal =
            document.getElementById('book-popup-modal');

        if (existingModal) {
            existingModal.remove();
        }

        const modalOverlay = document.createElement('div');

        modalOverlay.id = 'book-popup-modal';
        modalOverlay.className = 'modal-overlay';

        modalOverlay.innerHTML = `
            <div class="customize-wrapper">
                <button type="button" class="close-modal-btn" id="close-reading-book-popup">
                    &times;
                </button>

                <h2>Customize Book</h2>

                <div class="customize-book-header">
                    <!-- FIXED BOOK IMAGE -->
                    <img
                        id="info-book-cover"
                        class="customize-book-cover"
                        src="${
                            book.image ||
                            book.volumeInfo?.imageLinks?.thumbnail ||
                            'image/replacement.png'
                        }"
                        alt="${book.title || 'Book cover'}"
                        onerror="this.src='image/replacement.png'"
                    >

                    <div class="customize-book-info">
                        <h3>
                            ${book.title || 'Untitled'}
                        </h3>

                        <p>
                            ${book.author || 'Unknown Author'}
                        </p>

                        <div class="page-badge">
                            <span>🕮</span>
                            <span id="info-page-count">
                                ${
                                    book.totalPages ||
                                    book.pageCount ||
                                    book.totalPage ||
                                    book.page_count ||
                                    300
                                }
                                pages
                            </span>
                        </div>
                    </div>
                </div>

                <!-- SHELF -->
                <div class="customize-section">
                    <label>ADD TO SHELF</label>
                    <div class="category-pills" id="reading-popup-categories"></div>
                </div>

                <!-- RATING -->
                <div class="section-label">
                    YOUR RATING
                </div>

                <div class="rating-box">
                    <span id="popup-rating-text">
                        ${
                            book.rating
                                ? book.rating + ' of 5 Stars'
                                : 'Tap to rate'
                        }
                    </span>

                    <div class="star-rating" id="popup-star-container">
                        <span class="star ${
                            Number(book.rating) >= 1 ? 'active' : ''
                        }" data-value="1">
                            ★
                        </span>

                        <span class="star ${
                            Number(book.rating) >= 2 ? 'active' : ''
                        }" data-value="2">
                            ★
                        </span>

                        <span class="star ${
                            Number(book.rating) >= 3 ? 'active' : ''
                        }" data-value="3">
                            ★
                        </span>

                        <span class="star ${
                            Number(book.rating) >= 4 ? 'active' : ''
                        }" data-value="4">
                            ★
                        </span>

                        <span class="star ${
                            Number(book.rating) >= 5 ? 'active' : ''
                        }" data-value="5">
                            ★
                        </span>
                    </div>
                </div>

                <!-- DAILY READING DURATION -->
                <div class="section-label">
                    DAILY READING DURATION
                </div>

                <div class="pill-grid" id="popup-duration-container">
                    <button
                        type="button"
                        class="duration-pill ${
                            book.readingTime === '< 30 min'
                                ? 'active'
                                : ''
                        }"
                        data-duration="< 30 min"
                    >
                        &lt; 30 min
                    </button>

                    <button
                        type="button"
                        class="duration-pill ${
                            book.readingTime === '30–60 min'
                                ? 'active'
                                : ''
                        }"
                        data-duration="30–60 min"
                    >
                        30–60 min
                    </button>

                    <button
                        type="button"
                        class="duration-pill ${
                            book.readingTime === '1–2 hrs'
                                ? 'active'
                                : ''
                        }"
                        data-duration="1–2 hrs"
                    >
                        1–2 hrs
                    </button>

                    <button
                        type="button"
                        class="duration-pill ${
                            book.readingTime === '2+ hrs'
                                ? 'active'
                                : ''
                        }"
                        data-duration="2+ hrs"
                    >
                        2+ hrs
                    </button>
                </div>

                <!-- FAVOURITE QUOTE -->
                <div class="section-label">
                    FAVOURITE QUOTE
                </div>

                <div class="quote-box">
                    <div class="quote-input-wrapper">
                        <span class="quote-icon">
                            “
                        </span>

                        <textarea
                            id="popup-user-quotes"
                            placeholder="Paste a line that stayed with you..."
                        >${
                            book.quotes ||
                            book.favoriteQuote ||
                            book.quote ||
                            ''
                        }</textarea>
                    </div>
                </div>

                <!-- BUTTONS -->
                <button id="popup-save-book-edits" type="button" class="btn-save">
                    Save
                </button>

                <button id="popup-finish-book-btn" type="button" class="btn-remove">
                    Finish Book
                </button>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const closeBtn =
            document.getElementById(
                'close-reading-book-popup'
            );

        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                modalOverlay.remove();
            });
        }

        modalOverlay.addEventListener('click', function (event) {
            if (event.target === modalOverlay) {
                modalOverlay.remove();
            }
        });

        const categoryContainer =
            document.getElementById(
                'reading-popup-categories'
            );

        let categories = [];

        try {
            categories =
                JSON.parse(
                    localStorage.getItem('userCategories')
                ) || [];
        } catch (error) {
            categories = [];
        }

        if (
            !Array.isArray(categories) ||
            categories.length === 0
        ) {
            categories = [
                'Want to Read',
                'All',
                'Read',
                'Favorites'
            ];
        }

        let selectedCategory =
            book.category ||
            book.shelf ||
            'All';

        if (!categories.includes(selectedCategory)) {
            categories.unshift(selectedCategory);
        }

        categories.forEach(function (category) {
            const pill =
                document.createElement('button');

            pill.type = 'button';
            pill.className = 'category-pill';
            pill.textContent = category;

            if (category === selectedCategory) {
                pill.classList.add('active');
            }

            pill.addEventListener('click', function () {
                categoryContainer
                    .querySelectorAll('.category-pill')
                    .forEach(function (item) {
                        item.classList.remove('active');
                    });

                pill.classList.add('active');
                selectedCategory = category;
            });

            categoryContainer.appendChild(pill);
        });

        let popupRating =
            Number(book.rating) || 0;

        const starsContainer =
            document.getElementById(
                'popup-star-container'
            );

        if (starsContainer) {
            const starButtons =
                starsContainer.querySelectorAll('.star');

            function updatePopupStars() {
                starButtons.forEach(function (star) {
                    const rating =
                        Number(star.dataset.value);

                    star.classList.toggle(
                        'active',
                        rating <= popupRating
                    );
                });

                const ratingText =
                    document.getElementById(
                        'popup-rating-text'
                    );

                if (ratingText) {
                    ratingText.textContent =
                        popupRating > 0
                            ? `${popupRating} of 5 Stars`
                            : 'Tap to rate';
                }
            }

            starButtons.forEach(function (star) {
                star.addEventListener(
                    'click',
                    function () {
                        popupRating =
                            Number(star.dataset.value);

                        updatePopupStars();
                    }
                );
            });

            updatePopupStars();
        }

        const durationContainer =
            document.getElementById(
                'popup-duration-container'
            );

        let selectedDuration =
            book.readingTime ||
            book.dailyReadingDuration ||
            '';

        if (durationContainer) {
            const durationButtons =
                durationContainer.querySelectorAll(
                    '.duration-pill'
                );

            durationButtons.forEach(function (button) {
                button.addEventListener(
                    'click',
                    function () {
                        durationButtons.forEach(
                            function (item) {
                                item.classList.remove('active');
                            }
                        );

                        button.classList.add('active');
                        selectedDuration =
                            button.dataset.duration || '';
                    }
                );
            });
        }

        const quoteInput =
            document.getElementById(
                'popup-user-quotes'
            );

        function saveBookToLibrary(updatedBook) {
            let library = [];

            try {
                library =
                    JSON.parse(
                        localStorage.getItem('myLibrary')
                    ) || [];
            } catch (error) {
                library = [];
            }

            if (!Array.isArray(library)) {
                library = [];
            }

            const bookIndex =
                library.findIndex(function (item) {
                    return (
                        item.id === updatedBook.id ||
                        (
                            item.title === updatedBook.title &&
                            item.author === updatedBook.author
                        )
                    );
                });

            if (bookIndex !== -1) {
                library[bookIndex] = {
                    ...library[bookIndex],
                    ...updatedBook
                };
            } else {
                library.push(updatedBook);
            }

            localStorage.setItem(
                'myLibrary',
                JSON.stringify(library)
            );
        }

        function getUpdatedBook() {
    const quote =
        quoteInput
            ? quoteInput.value
            : '';

    let updatedCategories = Array.isArray(book.categories)
        ? [...book.categories]
        : [];

    const oldCategory =
        book.category ||
        book.shelf ||
        '';

    if (oldCategory) {
        updatedCategories = updatedCategories.filter(category =>
            String(category).trim().toLowerCase() !==
            String(oldCategory).trim().toLowerCase()
        );
    }

    if (selectedCategory) {
        const alreadyHasCategory = updatedCategories.some(category =>
            String(category).trim().toLowerCase() ===
            String(selectedCategory).trim().toLowerCase()
        );

        if (!alreadyHasCategory) {
            updatedCategories.push(selectedCategory);
        }
    }

    return {
        ...book,
        categories: updatedCategories,
        category: selectedCategory,
        shelf: selectedCategory,
        rating: popupRating,
        readingTime: selectedDuration,
        dailyReadingDuration: selectedDuration,
        quotes: quote,
        favoriteQuote: quote
    };
}

        const saveButton =
            document.getElementById(
                'popup-save-book-edits'
            );

        if (saveButton) {
            saveButton.addEventListener(
                'click',
                function () {
                    const updatedBook =
                        getUpdatedBook();


                    updatedBook.status =
                        'All';

                    localStorage.setItem(
                        'currentlyReading',
                        JSON.stringify(updatedBook)
                    );

                    saveBookToLibrary(updatedBook);

                    localStorage.setItem(
                        'selectedBook',
                        JSON.stringify(updatedBook)
                    );

                    logActivity(
                        updatedBook.title,
                        updatedBook.author,
                        'Updated book details'
                    );

                    modalOverlay.remove();
                    loadCurrentlyReadingCard();
                    updateDashboardStats();
                    loadRecentActivities();
                }
            );
        }

        const finishButton =
            document.getElementById(
                'popup-finish-book-btn'
            );

        if (finishButton) {
            finishButton.addEventListener(
                'click',
                function () {
               
                    const updatedBook = getUpdatedBook();
                    let selectedCategories = [];

                    if (Array.isArray(updatedBook.categories)) {
                        selectedCategories = [
                            ...updatedBook.categories
                        ];
                    } else if (
                        typeof updatedBook.categories === 'string'
                    ) {
                        selectedCategories =
                            updatedBook.categories
                                .split(',')
                                .map(category => category.trim())
                                .filter(Boolean);
                    }

                    if (selectedCategory) {
                        const alreadyHasCategory =
                            selectedCategories.some(
                                category =>
                                    String(category)
                                        .trim()
                                        .toLowerCase() ===
                                    String(selectedCategory)
                                        .trim()
                                        .toLowerCase()
                            );

                        if (!alreadyHasCategory) {
                            selectedCategories.push(
                                selectedCategory
                            );
                        }
                    }

                    // Add Finished
                    const alreadyFinished =
                        selectedCategories.some(
                            category =>
                                String(category)
                                    .trim()
                                    .toLowerCase() ===
                                'finished'
                        );

                    if (!alreadyFinished) {
                        selectedCategories.push(
                            'Finished'
                        );
                    }

                    // Save categories
                    updatedBook.categories =
                        selectedCategories;

                    
                    updatedBook.category =
                        selectedCategory;

                    updatedBook.shelf =
                        selectedCategory;

               
                    updatedBook.status =
                        'Finished';

                    updatedBook.progressPercent =
                        100;

                    const totalPages =
                        Number(
                            updatedBook.totalPages ||
                            updatedBook.pageCount ||
                            updatedBook.totalPage ||
                            updatedBook.page_count ||
                            0
                        );

                    if (totalPages > 0) {
                        updatedBook.pagesRead =
                            totalPages;
                    }

                    // Save to myLibrary
                    let library = [];

                    try {
                        library =
                            JSON.parse(
                                localStorage.getItem(
                                    'myLibrary'
                                )
                            ) || [];
                    } catch (error) {
                        library = [];
                    }

                    if (!Array.isArray(library)) {
                        library = [];
                    }

                 
                    const bookIndex =
                        library.findIndex(
                            function (item) {
                                return (
                                    item.id === updatedBook.id ||
                                    (
                                        item.title ===
                                            updatedBook.title &&
                                        item.author ===
                                            updatedBook.author
                                    )
                                );
                            }
                        );

                  
                    if (bookIndex !== -1) {
                        library[bookIndex] = {
                            ...library[bookIndex],
                            ...updatedBook,
                            categories:
                                selectedCategories
                        };
                    } else {
                       
                        library.push(
                            updatedBook
                        );
                    }

                    localStorage.setItem(
                        'myLibrary',
                        JSON.stringify(library)
                    );

                    localStorage.setItem(
                        'selectedBook',
                        JSON.stringify(updatedBook)
                    );

                    localStorage.removeItem(
                        'currentlyReading'
                    );

                    window.location.href =
                        'library.html?category=' +
                        encodeURIComponent(selectedCategory);
                }
            );
        }
    });
}

const signoutButton =
    document.getElementById("signout-button");

if (signoutButton) {
    signoutButton.addEventListener(
        "click",
        function (event) {
            event.preventDefault();
            localStorage.removeItem("readingCompanionLoggedIn");
            localStorage.removeItem("readingCompanionGuest");
            window.location.href = "login.html";
        }
    );
}