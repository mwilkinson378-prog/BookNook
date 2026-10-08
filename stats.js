const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderLiveStatistics(targetYear = 2026) {
    const parsedYear = parseInt(targetYear, 10);

    const library = JSON.parse(localStorage.getItem('myLibrary')) || [];
    const activeGoals = JSON.parse(localStorage.getItem('userActiveGoals')) || [];

   
    const isHistoricalEmptyYear = parsedYear < 2026;

  
    const uniqueLibrary = isHistoricalEmptyYear ? [] : library.filter((book, index, self) =>
        index === self.findIndex((b) => b.id === book.id || (b.title === book.title && b.author === book.author))
    );

    const hasBooks = uniqueLibrary.length > 0;

   
    const getBookShelves = (book) => {
        let values = [];
        if (book.shelf) values.push(String(book.shelf).toLowerCase().trim());
        if (book.category) values.push(String(book.category).toLowerCase().trim());
        if (Array.isArray(book.categories)) {
            book.categories.forEach(c => { if (c) values.push(String(c).toLowerCase().trim()); });
        } else if (typeof book.categories === 'string') {
            book.categories.split(',').forEach(c => { if (c) values.push(c.toLowerCase().trim()); });
        }
        return values;
    };

    const yearBooks = isHistoricalEmptyYear ? [] : uniqueLibrary.filter(book => {
        const shelves = getBookShelves(book);
        
        if (shelves.some(s => s.includes('dnf') || s.includes('to-read') || s.includes('tbr'))) {
            return false;
        }

        const isFinished = shelves.some(s => s.includes('finished') || s.includes('read') || s.includes('complete'));
        if (!isFinished) return false;

        let targetDate = book.dateFinished || book.finishedDate || book.dateAdded || book.addedDate || book.date;
        if (targetDate) {
            const dateObj = new Date(targetDate);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.getFullYear() === parsedYear;
            }
        }
        return true; 
    });

    const totalBooks = yearBooks.length;

    const totalPages = yearBooks.reduce((sum, book) => {
        const pages = parseInt(book.pages || book.pageCount, 10) || 0;
        return sum + pages;
    }, 0);

    const ratedBooks = yearBooks.filter(book => book.rating && book.rating > 0);
    const totalRatingSum = ratedBooks.reduce((sum, book) => sum + parseFloat(book.rating), 0);
    const avgRating = ratedBooks.length > 0 ? (totalRatingSum / ratedBooks.length).toFixed(1) : "0.0";


    
    // Books Read
    const statBooksReadEl = document.getElementById('stat-books-read') || document.getElementById('total-books') || document.getElementById('library-stat-books');
    if (statBooksReadEl) {
        statBooksReadEl.textContent = hasBooks ? totalBooks : '0';
    }

    // Pages Read
    const statPagesReadEl = document.getElementById('stat-pages-read') || document.getElementById('total-pages');
    if (statPagesReadEl) {
        statPagesReadEl.textContent = hasBooks ? totalPages.toLocaleString() : '0';
    }

    const readingBooks = isHistoricalEmptyYear ? [] : uniqueLibrary.filter(book => {
        const shelves = getBookShelves(book);
        return shelves.some(s => s.includes('reading') || s.includes('currently reading'));
    });
    const statStreakEl = document.getElementById('stat-streak') || document.getElementById('library-stat-reading');
    if (statStreakEl) {
        statStreakEl.textContent = hasBooks ? readingBooks.length : '—';
    }

    if (document.getElementById('avg-rating')) document.getElementById('avg-rating').textContent = isHistoricalEmptyYear ? '— ★' : `${avgRating} ★`;
    if (document.getElementById('rating-context')) document.getElementById('rating-context').textContent = isHistoricalEmptyYear ? 'No info has been added yet' : `across ${totalBooks} books`;
    
    const pagesPerDay = Math.round(totalPages / 365);
    if (document.getElementById('pages-per-day')) document.getElementById('pages-per-day').textContent = isHistoricalEmptyYear ? '— pages/day' : `≈ ${pagesPerDay} pages/day`;

  
    renderBookRecords(uniqueLibrary, isHistoricalEmptyYear);


    updateTopGoalStats(isHistoricalEmptyYear ? [] : activeGoals);

    
    const monthlyCounts = new Array(12).fill(0);
    const currentMonthIndex = new Date().getMonth();

    yearBooks.forEach(book => {
        let targetDate = book.dateFinished || book.finishedDate || book.dateAdded || book.addedDate || book.date;
        let monthIndex = currentMonthIndex; 

        if (targetDate) {
            const dateObj = new Date(targetDate);
            if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() === parsedYear) {
                monthIndex = dateObj.getMonth();
            }
        }
        monthlyCounts[monthIndex]++;
    });

    const monthlyContainer = document.getElementById('monthly-bars');
    const badgeElement = document.getElementById('monthly-total-badge');

    if (monthlyContainer) {
        monthlyContainer.innerHTML = '';
        const maxMonthlyVal = Math.max(...monthlyCounts, 1);

        monthlyCounts.forEach((count, index) => {
            const heightPercent = Math.max(Math.round((count / maxMonthlyVal) * 100), count > 0 ? 15 : 4);
            const isCurrentMonth = (index === currentMonthIndex && parsedYear === new Date().getFullYear());
            
            const barCol = document.createElement('div');
            barCol.className = `bar-column ${isCurrentMonth ? 'highlight' : ''}`;
            barCol.dataset.month = MONTH_NAMES[index];
            barCol.dataset.count = count;
            
            barCol.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-end;
                height: 100%;
                flex: 1;
                cursor: pointer;
                position: relative;
            `;
            
            barCol.innerHTML = `
                <div class="bar-fill" style="height: ${heightPercent}%; width: 100%; min-height: 8px; pointer-events: none;"></div>
                <span class="bar-label" style="pointer-events: none; margin-top: 4px;">${MONTH_NAMES[index]}</span>
            `;

            monthlyContainer.appendChild(barCol);
        });

        if (!monthlyContainer.dataset.hasListener) {
            monthlyContainer.dataset.hasListener = "true";

            monthlyContainer.addEventListener('mouseover', (e) => {
                const col = e.target.closest('.bar-column');
                if (col && badgeElement) {
                    const month = col.dataset.month;
                    const count = col.dataset.count;
                    badgeElement.textContent = `${month}: ${count} book${count == 1 ? '' : 's'}`;
                }
            });

            monthlyContainer.addEventListener('mouseout', (e) => {
                const col = e.target.closest('.bar-column');
                if (col && badgeElement && !monthlyContainer.contains(e.relatedTarget)) {
                    badgeElement.textContent = `${totalBooks} total`;
                }
            });

            monthlyContainer.addEventListener('mousedown', (e) => {
                const col = e.target.closest('.bar-column');
                if (col && badgeElement) {
                    e.preventDefault();
                    const month = col.dataset.month;
                    const count = col.dataset.count;
                    badgeElement.textContent = `${month}: ${count} book${count == 1 ? '' : 's'} (Selected)`;
                }
            });
        }
    }
    
    if (badgeElement) {
        badgeElement.textContent = `${totalBooks} total`;
    }

    const categoryMap = {};
    uniqueLibrary.forEach(book => {
        let bookCategories = [];
        if (typeof book.category === 'string') bookCategories.push(book.category.trim());
        if (typeof book.shelf === 'string') bookCategories.push(book.shelf.trim());
        if (Array.isArray(book.categories)) {
            book.categories.forEach(c => { if (c) bookCategories.push(String(c).trim()); });
        } else if (typeof book.categories === 'string') {
            book.categories.split(',').forEach(c => { if (c) bookCategories.push(c.trim()); });
        }

        bookCategories.forEach(c => {
            const cleanCat = String(c).trim();
            if (!cleanCat || cleanCat.toLowerCase() === 'all') return;
            categoryMap[cleanCat] = (categoryMap[cleanCat] || 0) + 1;
        });
    });

    const categoryList = Object.keys(categoryMap).map(name => ({
        name,
        count: categoryMap[name],
        percent: uniqueLibrary.length > 0 ? Math.round((categoryMap[name] / uniqueLibrary.length) * 100) : 0
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    const genreContainer = document.getElementById('genre-list');
    if (genreContainer) {
        genreContainer.innerHTML = categoryList.length > 0 
            ? '' 
            : '<p style="color: #78716C; font-size: 0.85rem; text-align: center; padding: 10px 0;">No info has been added yet.</p>';
        
        categoryList.forEach(cat => {
            const genreDiv = document.createElement('div');
            genreDiv.className = 'genre-item';
            genreDiv.innerHTML = `
                <div class="genre-info-row">
                    <span>${cat.name}</span>
                    <span>${cat.count} &nbsp; <strong>${cat.percent}%</strong></span>
                </div>
                <div class="genre-track">
                    <div class="genre-fill" style="width: ${cat.percent}%;"></div>
                </div>
            `;
            genreContainer.appendChild(genreDiv);
        });
    }
    const authorCounts = {};
    uniqueLibrary.forEach(book => {
        let author = book.author || book.volumeInfo?.authors?.[0];
        if (Array.isArray(book.authors) && book.authors.length > 0) author = book.authors[0];
        if (!author) return;
        const cleanAuthor = String(author).trim();
        if (cleanAuthor.toLowerCase() === 'unknown author' || cleanAuthor === '') return;
        authorCounts[cleanAuthor] = (authorCounts[cleanAuthor] || 0) + 1;
    });

    const sortedAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const authorContainer = document.getElementById('top-authors-list');
    if (authorContainer) {
        authorContainer.innerHTML = sortedAuthors.length > 0 
            ? '' 
            : '<p style="color: #78716C; font-size: 0.85rem; text-align: center; padding: 10px 0;">No info has been added yet.</p>';

        sortedAuthors.forEach(([name, count], index) => {
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const row = document.createElement('div');
            row.className = 'author-row';
            row.style.cursor = 'pointer';
            
            row.onclick = () => {
                window.location.href = `library.html?author=${encodeURIComponent(name)}`;
            };

            row.innerHTML = `
                <div class="author-left-group">
                    <span class="author-rank">${index + 1}</span>
                    <div class="author-avatar">${initials}</div>
                    <h4 class="author-name">${name}</h4>
                </div>
                <span class="author-count">${count} books</span>
            `;
            authorContainer.appendChild(row);
        });
    }

    let annualGoal = 52;
    const bookGoal = activeGoals.find(g => 
        (g.type && g.type.toLowerCase().includes('book')) || 
        (g.name && g.name.toLowerCase().includes('book')) || 
        (g.timeline && g.timeline.toLowerCase().includes('annual'))
    );
    if (bookGoal && bookGoal.target) {
        annualGoal = parseInt(bookGoal.target, 10);
    }

    const percentCompleted = isHistoricalEmptyYear ? 0 : Math.min(Math.round((totalBooks / annualGoal) * 100), 100);
    
    const statGoalProgressEl = document.getElementById('stat-goal-progress') || document.getElementById('goal-percent');
    if (statGoalProgressEl) statGoalProgressEl.textContent = `${percentCompleted}%`;

    if (document.getElementById('goal-fraction')) document.getElementById('goal-fraction').textContent = `${totalBooks} of ${annualGoal} books`;
    
    const remaining = isHistoricalEmptyYear ? annualGoal : Math.max(annualGoal - totalBooks, 0);
    if (document.getElementById('books-remaining-text')) {
        document.getElementById('books-remaining-text').textContent = `${remaining} books to go`;
    }

    const dotsContainer = document.getElementById('goal-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 1; i <= annualGoal; i++) {
            const dot = document.createElement('div');
            dot.className = `dot ${!isHistoricalEmptyYear && i <= totalBooks ? 'filled' : ''}`;
            dotsContainer.appendChild(dot);
        }
    }
}


function updateTopGoalStats(activeGoals) {
    if (!activeGoals || activeGoals.length === 0) {
        for (let i = 1; i <= 4; i++) {
            const titleEl = document.getElementById(`stat-title-${i}`);
            const valEl = document.getElementById(`stat-val-${i}`);
            const descEl = document.getElementById(`stat-desc-${i}`);
            if (titleEl) titleEl.textContent = 'No info has been added yet.';
            if (valEl) valEl.textContent = '—';
            if (descEl) descEl.textContent = 'Awaiting goal entries';
        }
        return;
    }

    let displayGoals = activeGoals.filter(g => g.pinned);

    if (displayGoals.length < 4) {
        const unpinnedGoals = activeGoals.filter(g => !g.pinned).sort((a, b) => {
            const pctA = a.target > 0 ? (a.current / a.target) : 0;
            const pctB = b.target > 0 ? (b.current / b.target) : 0;
            return pctB - pctA;
        });

        for (let goal of unpinnedGoals) {
            if (displayGoals.length < 4) {
                displayGoals.push(goal);
            }
        }
    }

    for (let i = 0; i < 4; i++) {
        const cardNum = i + 1;
        const titleEl = document.getElementById(`stat-title-${cardNum}`);
        const valEl = document.getElementById(`stat-val-${cardNum}`);
        const descEl = document.getElementById(`stat-desc-${cardNum}`);

        if (!titleEl || !valEl || !descEl) continue;

        const goal = displayGoals[i];
        if (goal) {
            const percentage = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            titleEl.textContent = goal.name;
            valEl.textContent = `${goal.current} / ${goal.target}`;
            descEl.textContent = `${percentage}% complete · ${goal.timeLeft || 'Active'}`;
        } else {
            titleEl.textContent = 'No info has been added yet.';
            valEl.textContent = '—';
            descEl.textContent = 'Awaiting goal entries';
        }
    }
}

function truncateTitle(title, maxWords = 4, maxChars = 26) {
    if (!title) return '';
    let clean = title.trim();
    
    if (clean.length > maxChars) {
        clean = clean.substring(0, maxChars).trim() + '...';
    }
    
    let words = clean.split(/\s+/);
    if (words.length > maxWords) {
        clean = words.slice(0, maxWords).join(' ') + '...';
    }
    
    return clean;
}

function renderBookRecords(uniqueLibrary, isHistoricalEmptyYear = false) {
    const recordItems = document.querySelectorAll('.record-item');
    if (!recordItems.length) return;

    const booksWithPages = isHistoricalEmptyYear ? [] : uniqueLibrary.filter(b => parseInt(b.pages || b.pageCount, 10) > 0);
    
    let longest = null;
    if (booksWithPages.length > 0) {
        longest = [...booksWithPages].sort((a, b) => parseInt(b.pages || b.pageCount, 10) - parseInt(a.pages || a.pageCount, 10))[0];
    }

    let shortest = null;
    if (booksWithPages.length > 0) {
        shortest = [...booksWithPages].sort((a, b) => parseInt(a.pages || b.pageCount, 10) - parseInt(b.pages || b.pageCount, 10))[0];
    }

    const booksWithRating = isHistoricalEmptyYear ? [] : uniqueLibrary.filter(b => parseFloat(b.rating) > 0);
    let highestRated = null;
    if (booksWithRating.length > 0) {
        highestRated = [...booksWithRating].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))[0];
    }

    const authorCounts = {};
    if (!isHistoricalEmptyYear) {
        uniqueLibrary.forEach(book => {
            let author = book.author || book.volumeInfo?.authors?.[0];
            if (Array.isArray(book.authors) && book.authors.length > 0) author = book.authors[0];
            if (!author) return;
            const cleanAuthor = String(author).trim();
            if (cleanAuthor.toLowerCase() === 'unknown author' || cleanAuthor === '') return;
            authorCounts[cleanAuthor] = (authorCounts[cleanAuthor] || 0) + 1;
        });
    }

    const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);
    const topAuthor = sortedAuthors.length > 0 ? sortedAuthors[0] : null;

    recordItems.forEach(item => {
        const typeEl = item.querySelector('.record-type');
        const titleEl = item.querySelector('.record-title');
        const detailEl = item.querySelector('.record-detail');
        if (!typeEl || !titleEl || !detailEl) return;

        const typeText = typeEl.textContent.trim().toUpperCase();

        if (typeText.includes('LONGEST READ')) {
            if (longest) {
                titleEl.textContent = truncateTitle(longest.title || 'Unknown Title');
                const pages = longest.pages || longest.pageCount || 0;
                detailEl.textContent = `${pages} pages`;
            } else {
                titleEl.textContent = 'No info has been added yet.';
                detailEl.textContent = '—';
            }
        } else if (typeText.includes('SHORTEST READ')) {
            if (shortest) {
                titleEl.textContent = truncateTitle(shortest.title || 'Unknown Title');
                const pages = shortest.pages || shortest.pageCount || 0;
                detailEl.textContent = `${pages} pages`;
            } else {
                titleEl.textContent = 'No info has been added yet.';
                detailEl.textContent = '—';
            }
        } else if (typeText.includes('HIGHEST RATED')) {
            if (highestRated) {
                titleEl.textContent = truncateTitle(highestRated.title || 'Unknown Title');
                const rating = highestRated.rating || 0;
                detailEl.textContent = `${rating} of 5 Stars`;
            } else {
                titleEl.textContent = 'No info has been added yet.';
                detailEl.textContent = '—';
            }
        } else if (typeText.includes('MOST READ AUTHOR') || typeText.includes('FAVORITE AUTHOR') || typeText.includes('TOP AUTHOR')) {
            if (topAuthor) {
                titleEl.textContent = truncateTitle(topAuthor[0]);
                detailEl.textContent = `${topAuthor[1]} book${topAuthor[1] == 1 ? '' : 's'}`;
            } else {
                titleEl.textContent = 'No info has been added yet.';
                detailEl.textContent = '—';
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const rogueModal = document.getElementById('custom-app-modal') || document.querySelector('.custom-app-modal');
    if (rogueModal) rogueModal.remove();

    const observer = new MutationObserver(() => {
        const dynamicModal = document.getElementById('custom-app-modal') || document.querySelector('.custom-app-modal');
        if (dynamicModal) dynamicModal.remove();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const yearSelector = document.getElementById('year-selector');
    const currentYear = yearSelector ? yearSelector.value : 2026;
    
    renderLiveStatistics(currentYear);

    if (yearSelector) {
        yearSelector.addEventListener('change', (e) => {
            renderLiveStatistics(e.target.value);
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'myLibrary' || e.key === 'userActiveGoals') {
            renderLiveStatistics(yearSelector ? yearSelector.value : 2026);
        }
    });
});