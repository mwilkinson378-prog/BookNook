function getCurrentStoragePrefix() {
    const isGuest = localStorage.getItem("readingCompanionGuest") === "true";
    const isLoggedIn = localStorage.getItem("readingCompanionLoggedIn") === "true";

    if (isGuest) {
        return "guest_";
    }

    if (isLoggedIn) {
        const savedUser = localStorage.getItem("readingCompanionUser");

        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                const identifier = user.email || user.id || user.username || user.name;

                if (identifier) {
                    const safeIdentifier = String(identifier)
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9_-]/g, "_");

                    return `user_${safeIdentifier}_`;
                }
            } catch (error) {
                console.error("Could not read saved user:", error);
            }
        }
    }

    return "empty_";
}

function getStorageForCurrentSession() {
    const prefix = getCurrentStoragePrefix();

    if (prefix === "guest_") {
        return sessionStorage;
    }

    return localStorage;
}

function getUserStorageKey(key) {
    return getCurrentStoragePrefix() + key;
}

function getUserData(key, fallback = null) {
    try {
        const prefix = getCurrentStoragePrefix();

        if (prefix === "empty_") {
            return fallback;
        }

        const storage = getStorageForCurrentSession();
        const saved = storage.getItem(prefix + key);

        if (saved === null) {
            return fallback;
        }

        return JSON.parse(saved);
    } catch (error) {
        console.error(`Error reading ${key}:`, error);
        return fallback;
    }
}

function setUserData(key, value) {
    const prefix = getCurrentStoragePrefix();

    if (prefix === "empty_") {
        console.warn(`Not saving ${key}: there is no active session.`);
        return;
    }

    try {
        const storage = getStorageForCurrentSession();
        storage.setItem(prefix + key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key}:`, error);
    }
}

function removeUserData(key) {
    const prefix = getCurrentStoragePrefix();

    if (prefix === "empty_") {
        return;
    }

    const storage = getStorageForCurrentSession();
    storage.removeItem(prefix + key);
}

function hasActiveSession() {
    return (
        localStorage.getItem("readingCompanionGuest") === "true" ||
        localStorage.getItem("readingCompanionLoggedIn") === "true"
    );
}
function hasActiveSession() {
    return (
        localStorage.getItem("readingCompanionGuest") === "true" ||
        localStorage.getItem("readingCompanionLoggedIn") === "true"
    );
}

let library = getUserData('myLibrary', []);

if (!Array.isArray(library)) {
    library = [];
}

let bookshelfState = getUserData('bookshelfState', {
    shelves: [],
    decorations: []
});

if (!bookshelfState || typeof bookshelfState !== 'object') {
    bookshelfState = {
        shelves: [],
        decorations: []
    };
}

if (!Array.isArray(bookshelfState.shelves)) {
    bookshelfState.shelves = [];
}

if (!Array.isArray(bookshelfState.decorations)) {
    bookshelfState.decorations = [];
}

let currentCategory = 'All';
let activeBookIdForDetail = null;

const defaultCategories = ["All", "Favorites", "To-Read", "Finished", "DNF"];

const getBooksPerShelf = () => {
    const width = window.innerWidth;

    if (width >= 1920) return 10;
    if (width >= 1400) return 8;
    if (width >= 1200) return 8;
    if (width >= 768) return 6;
    if (width > 600) return 5;
    if (width > 470) return 4;
    if (width > 320) return 4;

    return 4;
};

const MIN_SHELVES_COUNT = 3;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    handleUrlCategoryParam();

    let resizeTimer;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
            renderShelves();
        }, 150);
    });
});

function initApp() {
    ensureShelvesMatchCategories();
    renderNavTabs();
    renderShelves();
}

function handleUrlCategoryParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');

    if (categoryParam) {
        const formattedCategory = categoryParam
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('-');

        const tabs = document.querySelectorAll('.tab-btn');

        const targetTab = Array.from(tabs).find(tab =>
            tab.textContent.trim().toLowerCase() === formattedCategory.toLowerCase()
        );

        if (targetTab) {
            targetTab.click();
        }
    }
}

function saveState() {
    setUserData('myLibrary', library);
    setUserData('bookshelfState', bookshelfState);
}

function ensureShelvesMatchCategories() {
    let userCats = getUserData('userCategories', defaultCategories);

    if (!Array.isArray(userCats) || userCats.length === 0) {
        userCats = defaultCategories;
    }

    if (!userCats.some(cat => cat.toLowerCase() === 'all')) {
        userCats = ['All', ...userCats];
    }

    if (!bookshelfState.shelves || bookshelfState.shelves.length === 0) {
        bookshelfState.shelves = userCats.map(cat => ({
            id: cat.toLowerCase().replace(/\s+/g, '-'),
            title: cat,
            items: []
        }));

        const allShelf = bookshelfState.shelves.find(
            shelf => shelf.title.toLowerCase() === 'all'
        );

        if (allShelf) {
            library.forEach(book => {
                if (!allShelf.items.includes(book.id)) {
                    allShelf.items.push(book.id);
                }
            });
        }
    } else {
        userCats.forEach(cat => {
            const shelfId = cat.toLowerCase().replace(/\s+/g, '-');

            const existing = bookshelfState.shelves.find(
                shelf =>
                    shelf.id === shelfId ||
                    shelf.title.toLowerCase() === cat.toLowerCase()
            );

            if (!existing) {
                bookshelfState.shelves.push({
                    id: shelfId,
                    title: cat,
                    items: []
                });
            }
        });
    }

    saveState();
}

function renderNavTabs() {
    const navContainer = document.getElementById('nav-tabs');

    if (!navContainer) return;

    let userCats = getUserData('userCategories', defaultCategories);

    if (!Array.isArray(userCats) || userCats.length === 0) {
        userCats = defaultCategories;
    }

    if (!userCats.some(cat => cat.toLowerCase() === 'all')) {
        userCats = ['All', ...userCats];
    }

    navContainer.innerHTML = '';

    userCats.forEach(cat => {
        const isAll = cat.toLowerCase() === 'all';

        const group = document.createElement('div');

        group.className =
            `tab-group ${
                currentCategory.toLowerCase() === cat.toLowerCase()
                    ? 'active'
                    : ''
            }`;

        group.dataset.category = cat;

        const btn = document.createElement('button');

        btn.className = 'tab-btn';
        btn.textContent = cat;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-group').forEach(g =>
                g.classList.remove('active')
            );

            group.classList.add('active');

            currentCategory = cat;

            renderShelves();
        });

        const addBtn = document.createElement('button');

        addBtn.className = 'add-category-btn';
        addBtn.dataset.cat = cat;
        addBtn.title = isAll ? 'Add book' : `Add book to ${cat}`;
        addBtn.textContent = '+';

        addBtn.addEventListener('click', e => {
            e.stopPropagation();
            openAddBookModal(isAll ? null : cat);
        });

        group.appendChild(btn);
        group.appendChild(addBtn);
        navContainer.appendChild(group);
    });
}

function renderShelves() {
    const container = document.getElementById('shelves-wrapper');

    if (!container) return;

    container.innerHTML = '';

    ensureShelvesMatchCategories();
    updateLibraryStats();

    const BOOKS_PER_SHELF = getBooksPerShelf();
    const isAllScreen = currentCategory.toLowerCase() === 'all';

    if (isAllScreen) {
        const allShelf = bookshelfState.shelves.find(
            shelf =>
                shelf.title.toLowerCase() === 'all' ||
                shelf.id === 'all'
        );

        const allItems = allShelf ? allShelf.items || [] : [];

        let itemChunks = [];

        for (
            let i = 0;
            i < allItems.length;
            i += BOOKS_PER_SHELF
        ) {
            let chunk = allItems.slice(i, i + BOOKS_PER_SHELF);

            while (chunk.length < BOOKS_PER_SHELF) {
                chunk.push(null);
            }

            itemChunks.push(chunk);
        }

        while (itemChunks.length < MIN_SHELVES_COUNT) {
            const emptyChunk = [];

            for (let p = 0; p < BOOKS_PER_SHELF; p++) {
                emptyChunk.push(null);
            }

            itemChunks.push(emptyChunk);
        }

        itemChunks.forEach((chunk, index) => {
            const displayTitle = index === 0 ? "All Books" : '';

            renderSingleShelfBoard(
                container,
                displayTitle,
                chunk,
                true,
                "All",
                index * BOOKS_PER_SHELF
            );
        });
    } else {
        const activeShelf = bookshelfState.shelves.find(
            shelf =>
                shelf.title.toLowerCase() === currentCategory.toLowerCase() ||
                shelf.id === currentCategory.toLowerCase()
        );

        const shelfItems = activeShelf
            ? activeShelf.items || []
            : [];

        const targetShelfTitle = activeShelf
            ? activeShelf.title
            : currentCategory;

        let itemChunks = [];

        for (
            let i = 0;
            i < shelfItems.length;
            i += BOOKS_PER_SHELF
        ) {
            let chunk = shelfItems.slice(i, i + BOOKS_PER_SHELF);

            while (chunk.length < BOOKS_PER_SHELF) {
                chunk.push(null);
            }

            itemChunks.push(chunk);
        }

        while (itemChunks.length < MIN_SHELVES_COUNT) {
            const emptyChunk = [];

            for (let p = 0; p < BOOKS_PER_SHELF; p++) {
                emptyChunk.push(null);
            }

            itemChunks.push(emptyChunk);
        }

        itemChunks.forEach((chunk, index) => {
            const shelfTitle =
                index === 0
                    ? activeShelf
                        ? activeShelf.title
                        : currentCategory
                    : '';

            renderSingleShelfBoard(
                container,
                shelfTitle,
                chunk,
                false,
                targetShelfTitle,
                index * BOOKS_PER_SHELF
            );
        });
    }
}

function updateLibraryStats() {
    let headerContainer = document.getElementById('shelf-main-header');
    const shelvesWrapper = document.getElementById('shelves-wrapper');

    if (!headerContainer && shelvesWrapper) {
        headerContainer = document.createElement('div');
        headerContainer.id = 'shelf-main-header';

        shelvesWrapper.parentNode.insertBefore(
            headerContainer,
            shelvesWrapper
        );
    }

    if (!headerContainer) return;

    const allBookIds = new Set();

    bookshelfState.shelves.forEach(shelf => {
        if (shelf.items) {
            shelf.items.forEach(id => {
                if (id && !id.startsWith('decor_')) {
                    allBookIds.add(id);
                }
            });
        }
    });

    const totalBooksCount = allBookIds.size;

    let currentCategoryCount = 0;

    if (currentCategory.toLowerCase() === 'all') {
        currentCategoryCount = totalBooksCount;
    } else {
        const activeShelf = bookshelfState.shelves.find(
            shelf =>
                shelf.title.toLowerCase() === currentCategory.toLowerCase() ||
                shelf.id === currentCategory.toLowerCase()
        );

        if (activeShelf && activeShelf.items) {
            currentCategoryCount = activeShelf.items.filter(
                id => id && !id.startsWith('decor_')
            ).length;
        }
    }

    const displayTitle =
        currentCategory.toUpperCase() === 'ALL'
            ? 'ALL BOOKS'
            : currentCategory.toUpperCase();

    headerContainer.innerHTML = `
        <div class="shelf-header-group" style="display: flex !important; align-items: baseline !important; justify-content: flex-start !important; gap: 14px !important; width: 100% !important; padding: 24px 0px 0px 0px !important;">
            <h2 class="shelf-category-title" style="margin: 0 !important; display: inline-block !important;">${displayTitle}</h2>
            <span id="library-stats" class="shelf-stats-counter" style="margin: 0 !important; display: inline-block !important; font-size: 13px !important; color: #b0a89f !important;">
                ${totalBooksCount} books • ${currentCategoryCount} ${currentCategory.toLowerCase()}
            </span>
        </div>
    `;
}

function openRemovalModal(id, itemEl) {
    let modalOverlay = document.querySelector('.decor-modal-overlay');

    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'decor-modal-overlay';

        modalOverlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
        `;

        modalOverlay.innerHTML = `
            <div class="decor-action-card" style="background: var(--bg-card, #222); padding: 24px; border-radius: 12px; width: 320px; max-width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); position: relative; color: inherit;">
                <button class="decor-modal-close" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 20px; cursor: pointer; color: inherit;">&times;</button>
                <img src="" alt="" class="decor-modal-icon" style="width: 60px; height: 90px; object-fit: cover; border-radius: 4px; margin: 0 auto 12px; display: block;">
                <h3 class="decor-modal-title" style="text-align: center; margin-bottom: 20px; font-size: 16px; font-weight: 600;"></h3>
                <div class="decor-modal-actions" style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="decor-remove-action-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: #b33939; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Remove from shelf
                    </button>
                    <button class="decor-cancel-action-btn" style="padding: 12px; background: transparent; color: inherit; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const closeModals = () => {
            modalOverlay.style.opacity = '0';
            modalOverlay.style.pointerEvents = 'none';
            modalOverlay.classList.remove('active');
        };

        modalOverlay
            .querySelector('.decor-modal-close')
            .addEventListener('click', closeModals);

        modalOverlay
            .querySelector('.decor-cancel-action-btn')
            .addEventListener('click', closeModals);

        modalOverlay.addEventListener('click', ev => {
            if (ev.target === modalOverlay) {
                closeModals();
            }
        });
    }

    const imgEl = itemEl.querySelector('img');

    modalOverlay.querySelector('.decor-modal-icon').src =
        imgEl ? imgEl.src : '';

    let itemName = id.startsWith('decor_')
        ? "Decoration"
        : "Book";

    if (!id.startsWith('decor_')) {
        const bookObj = library.find(book => book.id === id);

        if (bookObj) {
            itemName = bookObj.title;
        }
    }

    modalOverlay.querySelector('.decor-modal-title').textContent =
        itemName;

    const removeBtn =
        modalOverlay.querySelector('.decor-remove-action-btn');

    removeBtn.onclick = () => {
        if (id.startsWith('decor_')) {
            removeDecorationFromShelf(id);
        } else {
            removeBookFromShelf(id, currentCategory);
        }

        modalOverlay.style.opacity = '0';
        modalOverlay.style.pointerEvents = 'none';
        modalOverlay.classList.remove('active');
    };

    modalOverlay.style.opacity = '1';
    modalOverlay.style.pointerEvents = 'auto';
    modalOverlay.classList.add('active');
}

function renderSingleShelfBoard(
    container,
    shelfTitle,
    itemIds,
    isAllView,
    targetShelfTitle,
    rowStartIndex = 0
) {
    const section = document.createElement('div');
    section.className = 'shelf-section';

    const rowContainer = document.createElement('div');
    rowContainer.className = 'shelf-row-container';
    rowContainer.dataset.shelfTitle = targetShelfTitle;
    rowContainer.dataset.rowStartIndex = rowStartIndex;

    const track = document.createElement('div');
    track.className = 'shelf-items-track';
    track.dataset.shelfTitle = targetShelfTitle;

    const maxSlots = getBooksPerShelf();

    for (let arrayIndex = 0; arrayIndex < maxSlots; arrayIndex++) {
        const id = itemIds[arrayIndex];

        const slotEl = document.createElement('div');

        slotEl.className = 'shelf-item-slot';
        slotEl.dataset.shelfTitle = targetShelfTitle;
        slotEl.dataset.slotIndex = arrayIndex;

        if (!id) {
            slotEl.style.borderRadius = '4px';

            slotEl.addEventListener('dragover', e =>
                e.preventDefault()
            );

            track.appendChild(slotEl);
            continue;
        }

        const itemEl = document.createElement('div');

        itemEl.className = 'shelf-item';
        itemEl.dataset.itemId = id;
        itemEl.dataset.index = arrayIndex;
        itemEl.style.position = 'relative';

        if (id.startsWith('decor_')) {
            const decorObj = bookshelfState.decorations
                ? bookshelfState.decorations.find(
                    decoration => decoration.id === id
                )
                : null;

            if (decorObj) {
                itemEl.classList.add('draggable-decor');

                itemEl.innerHTML = `
                    <img
                        class="shelf-decor-icon"
                        src="${decorObj.image}"
                        alt="Decoration"
                        onerror="this.src='image/replacement.png'"
                    >
                `;
            } else {
                track.appendChild(slotEl);
                continue;
            }
        } else {
            const book = library.find(book => book.id === id);

            if (book) {
                itemEl.innerHTML = `
                    <img
                        class="shelf-book-spine"
                        src="${book.image || book.volumeInfo?.imageLinks?.thumbnail || 'image/replacement.png'}"
                        alt="${book.title}"
                        onerror="this.src='image/replacement.png'"
                    >
                `;
            }
        }

        const deleteBadge = document.createElement('button');

        deleteBadge.className = 'item-quick-delete-btn';
        deleteBadge.innerHTML = '&times;';
        deleteBadge.title = 'Remove item';

        deleteBadge.style.cssText = `
            position: absolute;
            top: -6px;
            right: -6px;
            width: 22px;
            height: 22px;
            background: #b33939;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 14px;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;

        deleteBadge.addEventListener('click', e => {
            e.stopPropagation();
            openRemovalModal(id, itemEl);
        });

        itemEl.appendChild(deleteBadge);

        itemEl.addEventListener(
            'mouseenter',
            () => deleteBadge.style.display = 'flex'
        );

        itemEl.addEventListener(
            'mouseleave',
            () => deleteBadge.style.display = 'none'
        );

        itemEl.addEventListener('click', e => {
            e.stopPropagation();

            if (id.startsWith('decor_')) {
                openRemovalModal(id, itemEl);
            } else {
                openBookDetails(id);
            }
        });

        itemEl.addEventListener('dblclick', e => {
            e.stopPropagation();
            e.preventDefault();
            openRemovalModal(id, itemEl);
        });

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let clone = null;

        itemEl.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;

            startX = e.clientX;
            startY = e.clientY;
            isDragging = false;

            const pointerMoveHandler = moveEvent => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                if (
                    !isDragging &&
                    (Math.abs(dx) > 6 || Math.abs(dy) > 6)
                ) {
                    isDragging = true;

                    itemEl.classList.add('is-dragging-source');

                    clone = itemEl.cloneNode(true);

                    clone.classList.remove('is-dragging-source');

                    clone.style.cssText = `
                        position: fixed !important;
                        z-index: 10000 !important;
                        opacity: 0.85 !important;
                        pointer-events: none !important;
                        cursor: grabbing !important;
                        width: ${itemEl.offsetWidth}px !important;
                        height: ${itemEl.offsetHeight}px !important;
                        left: ${moveEvent.clientX - 20}px !important;
                        top: ${moveEvent.clientY - 40}px !important;
                        box-sizing: border-box !important;
                    `;

                    document.body.appendChild(clone);
                }

                if (isDragging && clone) {
                    const maxX =
                        window.innerWidth -
                        clone.offsetWidth -
                        10;

                    const safeX = Math.max(
                        0,
                        Math.min(
                            moveEvent.clientX - 20,
                            maxX
                        )
                    );

                    clone.style.left = `${safeX}px`;
                    clone.style.top =
                        `${moveEvent.clientY - 40}px`;
                }
            };

            const pointerUpHandler = upEvent => {
                window.removeEventListener(
                    'pointermove',
                    pointerMoveHandler
                );

                window.removeEventListener(
                    'pointerup',
                    pointerUpHandler
                );

                if (clone) {
                    clone.remove();
                }

                itemEl.classList.remove(
                    'is-dragging-source'
                );

                itemEl.style.opacity = '1';

                if (!isDragging) return;

                isDragging = false;

                const allRows = Array.from(
                    document.querySelectorAll(
                        '.shelf-row-container'
                    )
                );

                let targetRowContainer = null;
                let targetSlotEl = null;

                if (allRows.length > 0) {
                    let closestRow = null;
                    let minRowDistance = Infinity;

                    allRows.forEach(row => {
                        const rect =
                            row.getBoundingClientRect();

                        const rowCenterY =
                            rect.top + rect.height / 2;

                        const vDist = Math.abs(
                            upEvent.clientY - rowCenterY
                        );

                        if (vDist < minRowDistance) {
                            minRowDistance = vDist;
                            closestRow = row;
                        }
                    });

                    if (closestRow) {
                        targetRowContainer = closestRow;

                        const slotsInRow = Array.from(
                            targetRowContainer.querySelectorAll(
                                '.shelf-item-slot'
                            )
                        );

                        let closestSlot = null;
                        let minSlotDist = Infinity;

                        slotsInRow.forEach(slot => {
                            const rect =
                                slot.getBoundingClientRect();

                            const slotCenterX =
                                rect.left + rect.width / 2;

                            const hDist = Math.abs(
                                upEvent.clientX -
                                slotCenterX
                            );

                            if (hDist < minSlotDist) {
                                minSlotDist = hDist;
                                closestSlot = slot;
                            }
                        });

                        if (closestSlot) {
                            targetSlotEl = closestSlot;
                        }
                    }
                }

                if (
                    targetRowContainer &&
                    targetSlotEl
                ) {
                    const destShelfTitle =
                        targetRowContainer.dataset.shelfTitle ||
                        targetShelfTitle;

                    const slotsInRow = Array.from(
                        targetRowContainer.querySelectorAll(
                            '.shelf-item-slot'
                        )
                    );

                    const targetSlotIndex =
                        slotsInRow.indexOf(targetSlotEl);

                    if (targetSlotIndex > -1) {
                        const baseIndex =
                            parseInt(
                                targetRowContainer.dataset.rowStartIndex
                            ) || 0;

                        const absoluteTargetIdx =
                            baseIndex + targetSlotIndex;

                        placeItemAtExactIndex(
                            id,
                            destShelfTitle,
                            absoluteTargetIdx
                        );

                        return;
                    }
                }

                if (targetRowContainer) {
                    const destShelfTitle =
                        targetRowContainer.dataset.shelfTitle ||
                        targetShelfTitle;

                    moveItemToShelf(
                        id,
                        destShelfTitle
                    );
                }
            };

            window.addEventListener(
                'pointermove',
                pointerMoveHandler
            );

            window.addEventListener(
                'pointerup',
                pointerUpHandler
            );
        });

        slotEl.appendChild(itemEl);
        track.appendChild(slotEl);
    }

    rowContainer.appendChild(track);

    const board = document.createElement('div');
    board.className = 'shelf-board';

    rowContainer.appendChild(board);

    section.appendChild(rowContainer);
    container.appendChild(section);
}

function placeItemAtExactIndex(
    itemId,
    shelfTitleOrId,
    absoluteIndex
) {
    let shelf;

    if (
        shelfTitleOrId.toLowerCase() === "all" ||
        shelfTitleOrId === "All Books"
    ) {
        shelf = bookshelfState.shelves.find(
            s =>
                s.title.toLowerCase() === 'all' ||
                s.id === 'all'
        );
    } else {
        shelf = bookshelfState.shelves.find(
            s =>
                s.id ===
                    shelfTitleOrId
                        .toLowerCase()
                        .replace(/\s+/g, '-') ||
                s.title.toLowerCase() ===
                    shelfTitleOrId.toLowerCase()
        );
    }

    if (shelf) {
        if (!shelf.items) {
            shelf.items = [];
        }

        shelf.items =
            shelf.items.filter(id => id !== itemId);

        while (shelf.items.length < absoluteIndex) {
            shelf.items.push(null);
        }

        shelf.items.splice(
            absoluteIndex,
            0,
            itemId
        );

        shelf.items =
            shelf.items.filter(Boolean);
    }

    saveState();
    renderShelves();
}

function moveItemToShelf(
    itemId,
    targetShelfTitleOrId
) {
    if (
        targetShelfTitleOrId.toLowerCase() === "all" ||
        targetShelfTitleOrId === "All Books"
    ) {
        targetShelfTitleOrId = "All";
    }

    bookshelfState.shelves.forEach(shelf => {
        if (shelf.items) {
            shelf.items =
                shelf.items.filter(
                    id => id !== itemId
                );
        }
    });

    let target =
        bookshelfState.shelves.find(
            shelf =>
                shelf.id ===
                    targetShelfTitleOrId
                        .toLowerCase()
                        .replace(/\s+/g, '-') ||
                shelf.title.toLowerCase() ===
                    targetShelfTitleOrId.toLowerCase()
        );

    if (!target && bookshelfState.shelves.length > 0) {
        target = bookshelfState.shelves[0];
    }

    if (target) {
        if (!target.items) {
            target.items = [];
        }

        if (!target.items.includes(itemId)) {
            target.items.push(itemId);
        }

        if (!itemId.startsWith('decor_')) {
            const book =
                library.find(
                    b => b.id === itemId
                );

            if (book) {
                if (!book.categories) {
                    book.categories = [];
                }

                if (
                    !book.categories.some(
                        c =>
                            c.toLowerCase() ===
                            target.title.toLowerCase()
                    )
                ) {
                    book.categories.push(
                        target.title
                    );
                }
            }
        }

        saveState();
        renderShelves();
    }
}

function removeDecorationFromShelf(decorId) {
    if (bookshelfState.decorations) {
        bookshelfState.decorations =
            bookshelfState.decorations.filter(
                d => d.id !== decorId
            );
    }

    bookshelfState.shelves.forEach(shelf => {
        if (shelf.items) {
            shelf.items =
                shelf.items.filter(
                    id => id !== decorId
                );
        }
    });

    saveState();
    renderShelves();
}

function setupEventListeners() {
    document.addEventListener('click', e => {
        const decorToggle =
            e.target.closest('#decor-toggle-btn');

        const closeDecor =
            e.target.closest('#close-decor');

        const decorOverlay =
            document.getElementById('decor-overlay');

        const decorDrawer =
            document.getElementById('decor-drawer');

        if (
            decorToggle &&
            decorOverlay &&
            decorDrawer
        ) {
            decorOverlay.classList.add('active');
            decorDrawer.classList.add('active');
        }

        if (closeDecor) {
            closeDecorDrawer();
        }
    });

    const decorOverlay =
        document.getElementById('decor-overlay');

    if (decorOverlay) {
        decorOverlay.addEventListener('click', e => {
            if (e.target === decorOverlay) {
                closeDecorDrawer();
            }
        });
    }

    document.addEventListener('click', e => {
        const opt =
            e.target.closest('.decor-item-option');

        if (!opt) return;

        e.preventDefault();
        e.stopPropagation();

        const imageSrc =
            opt.getAttribute('data-image');

        if (!imageSrc) return;

        addDecorationToShelf(imageSrc);
        closeDecorDrawer();
    });

    const detailOverlay =
        document.getElementById('book-details-overlay');

    const closeDetailsBtn =
        document.getElementById('close-book-details');

    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener(
            'click',
            closeBookDetails
        );
    }

    if (detailOverlay) {
        detailOverlay.addEventListener(
            'click',
            e => {
                if (e.target === detailOverlay) {
                    closeBookDetails();
                }
            }
        );
    }

    const removeBtn =
        document.getElementById(
            'remove-from-library-btn'
        );

    if (removeBtn) {
        removeBtn.replaceWith(
            removeBtn.cloneNode(true)
        );

        const freshRemoveBtn =
            document.getElementById(
                'remove-from-library-btn'
            );

        freshRemoveBtn.addEventListener(
            'click',
            () => {
                if (activeBookIdForDetail) {
                    removeBookFromShelf(
                        activeBookIdForDetail,
                        currentCategory
                    );

                    closeBookDetails();
                }
            }
        );
    }

    const closeAddBookBtn =
        document.getElementById(
            'close-add-book'
        );

    const addBookOverlay =
        document.getElementById(
            'add-book-overlay'
        );

    if (closeAddBookBtn) {
        closeAddBookBtn.addEventListener(
            'click',
            closeAddBookModal
        );
    }

    if (addBookOverlay) {
        addBookOverlay.addEventListener(
            'click',
            closeAddBookModal
        );
    }

    const searchModalBtn =
        document.getElementById(
            'open-search-modal'
        );

    if (searchModalBtn) {
        searchModalBtn.addEventListener(
            'click',
            () => {
                searchGoogleBooksAPI();
            }
        );
    }
}

function closeDecorDrawer() {
    document
        .getElementById('decor-overlay')
        ?.classList.remove('active');

    document
        .getElementById('decor-drawer')
        ?.classList.remove('active');
}

function closeAddBookModal() {
    document
        .getElementById('add-book-overlay')
        ?.classList.remove('active');

    document
        .getElementById('add-book-sheet')
        ?.classList.remove('active');
}

function closeBookDetails() {
    document
        .getElementById('book-details-overlay')
        ?.classList.remove('active');

    document
        .getElementById('book-details-sheet')
        ?.classList.remove('active');
}

function addDecorationToShelf(imageSrc) {
    const decorId =
        `decor_${Date.now()}`;

    const newDecor = {
        id: decorId,
        image: imageSrc
    };

    if (!bookshelfState.decorations) {
        bookshelfState.decorations = [];
    }

    bookshelfState.decorations.push(
        newDecor
    );

    let targetShelfTitle =
        currentCategory;

    if (
        !targetShelfTitle ||
        targetShelfTitle.toLowerCase() === 'all' ||
        targetShelfTitle.toLowerCase() === 'all books'
    ) {
        targetShelfTitle = 'All';
    }

    let shelf =
        bookshelfState.shelves.find(
            s =>
                (
                    s.id &&
                    s.id.toLowerCase() ===
                        targetShelfTitle
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                ) ||
                (
                    s.title &&
                    s.title.toLowerCase() ===
                        targetShelfTitle.toLowerCase()
                )
        );

    if (!shelf) {
        shelf = {
            id: targetShelfTitle
                .toLowerCase()
                .replace(/\s+/g, '-'),
            title: targetShelfTitle,
            items: []
        };

        bookshelfState.shelves.push(
            shelf
        );
    }

    if (!shelf.items) {
        shelf.items = [];
    }

    shelf.items.push(decorId);

    saveState();
    initApp();
}

function openAddBookModal(categoryName) {
    let availableBooks = [];
    let modalTitle = "Add to Shelf";
    let targetShelfTitle = categoryName;

    const isAllView =
        !categoryName ||
        categoryName.toLowerCase() === 'all';

    if (isAllView) {
        modalTitle =
            "Add Books to All Shelves";

        const allShelf =
            bookshelfState.shelves.find(
                s =>
                    s.title.toLowerCase() === 'all' ||
                    s.id === 'all'
            );

        const assignedIds =
            allShelf
                ? allShelf.items || []
                : [];

        availableBooks =
            library.filter(
                book =>
                    !assignedIds.includes(book.id)
            );
    } else {
        let shelfData =
            bookshelfState.shelves.find(
                s =>
                    s.title.toLowerCase() ===
                    categoryName.toLowerCase()
            );

        modalTitle =
            `Add to ${categoryName}`;

        if (!shelfData) {
            shelfData = {
                id: categoryName
                    .toLowerCase()
                    .replace(/\s+/g, '-'),
                title: categoryName,
                items: []
            };

            bookshelfState.shelves.push(
                shelfData
            );
        }

        targetShelfTitle =
            shelfData.title;

        const assignedIds =
            shelfData.items || [];

        availableBooks =
            library.filter(book => {
                const hasCat =
                    book.categories &&
                    Array.isArray(book.categories) &&
                    book.categories.some(
                        c =>
                            c.toLowerCase() ===
                            targetShelfTitle.toLowerCase()
                    );

                const notAssigned =
                    !assignedIds.includes(
                        book.id
                    );

                return hasCat && notAssigned;
            });
    }

    const titleEl =
        document.getElementById(
            'add-book-title'
        );

    if (titleEl) {
        titleEl.innerText =
            modalTitle;
    }

    const countEl =
        document.getElementById(
            'add-book-count'
        );

    if (countEl) {
        countEl.innerText =
            `${availableBooks.length} books available`;
    }

    const container =
        document.getElementById(
            'available-books-container'
        );

    if (!container) return;

    container.innerHTML = '';

    if (availableBooks.length === 0) {
        container.innerHTML =
            '<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">No available books matching this category found in your library.</p>';
    } else {
        availableBooks.forEach(book => {
            const card =
                document.createElement('div');

            card.className =
                'available-book-card';

            const catListStr =
                book.categories
                    ? book.categories.join(', ')
                    : 'Unassigned';

            card.innerHTML = `
                <div class="avail-book-left">
                    <img class="avail-book-thumb" src="${book.image || book.volumeInfo?.imageLinks?.thumbnail || 'image/replacement.png'}" alt="${book.title}" onerror="this.src='image/replacement.png'">
                    <div class="avail-book-info">
                        <h4>${book.title}</h4>
                        <p>${book.author || 'Unknown Author'} <span style="font-size:10px; color:var(--text-muted);">(${catListStr})</span></p>
                    </div>
                </div>
            `;

            card.addEventListener(
                'click',
                () => {
                    if (isAllView) {
                        addBookToShelf(
                            book.id,
                            'All'
                        );
                    } else {
                        addBookToShelf(
                            book.id,
                            targetShelfTitle
                        );
                    }

                    closeAddBookModal();
                }
            );

            container.appendChild(card);
        });
    }

    document
        .getElementById(
            'add-book-overlay'
        )
        ?.classList.add('active');

    document
        .getElementById(
            'add-book-sheet'
        )
        ?.classList.add('active');
}

function addBookToShelf(
    bookId,
    shelfTitleOrId
) {
    let targetTitle =
        shelfTitleOrId ||
        currentCategory;

    if (
        !targetTitle ||
        targetTitle.toLowerCase() === "all books" ||
        targetTitle.toLowerCase() === "all"
    ) {
        targetTitle = "All";
    }

    let shelf =
        bookshelfState.shelves.find(
            s =>
                (
                    s.id &&
                    s.id.toLowerCase() ===
                        targetTitle
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                ) ||
                (
                    s.title &&
                    s.title.toLowerCase() ===
                        targetTitle.toLowerCase()
                )
        );

    if (!shelf) {
        shelf = {
            id: targetTitle
                .toLowerCase()
                .replace(/\s+/g, '-'),
            title: targetTitle,
            items: []
        };

        bookshelfState.shelves.push(
            shelf
        );
    }

    if (!shelf.items) {
        shelf.items = [];
    }

    if (!shelf.items.includes(bookId)) {
        shelf.items.push(bookId);

        const book =
            library.find(
                b => b.id === bookId
            );

        if (book) {
            if (!book.categories) {
                book.categories = [];
            }

            if (
                targetTitle.toLowerCase() !== 'all' &&
                !book.categories.some(
                    c =>
                        c.toLowerCase() ===
                        shelf.title.toLowerCase()
                )
            ) {
                book.categories.push(
                    shelf.title
                );
            }
        }

        saveState();
        initApp();
    }
}

function openBookDetails(bookId) {
    activeBookIdForDetail = bookId;

    const book =
        library.find(
            b => b.id === bookId
        );

    if (!book) return;

    const imgEl =
        document.getElementById(
            'detail-img'
        );

    const titleEl =
        document.getElementById(
            'detail-title'
        );

    const authorEl =
        document.getElementById(
            'detail-author'
        );

    if (imgEl) {
        imgEl.src =
            book.image ||
            book.volumeInfo?.imageLinks?.thumbnail ||
            'image/replacement.png';
    }

    if (titleEl) {
        titleEl.innerText =
            book.title;
    }

    if (authorEl) {
        authorEl.innerText =
            book.author ||
            'Unknown Author';
    }

    const moveContainer =
        document.getElementById(
            'move-shelf-buttons'
        );

    if (moveContainer) {
        moveContainer.innerHTML = '';

        const otherShelves =
            bookshelfState.shelves
                .filter(
                    shelf =>
                        !shelf.items ||
                        !shelf.items.includes(
                            bookId
                        )
                )
                .map(shelf => ({
                    id: shelf.id,
                    label: shelf.title
                }));

        otherShelves.forEach(
            shelf => {
                const btn =
                    document.createElement(
                        'button'
                    );

                btn.className =
                    'move-btn';

                btn.innerHTML =
                    `→ ${shelf.label}`;

                btn.addEventListener(
                    'click',
                    () => {
                        moveBookShelf(
                            book.id,
                            shelf.label
                        );

                        closeBookDetails();
                    }
                );

                moveContainer.appendChild(
                    btn
                );
            }
        );
    }

    document
        .getElementById(
            'book-details-overlay'
        )
        ?.classList.add('active');

    document
        .getElementById(
            'book-details-sheet'
        )
        ?.classList.add('active');
}

function moveBookShelf(
    bookId,
    targetShelfTitle
) {
    let target =
        bookshelfState.shelves.find(
            shelf =>
                shelf.title.toLowerCase() ===
                targetShelfTitle.toLowerCase()
        );

    if (!target) {
        target = {
            id: targetShelfTitle
                .toLowerCase()
                .replace(/\s+/g, '-'),
            title: targetShelfTitle,
            items: []
        };

        bookshelfState.shelves.push(
            target
        );
    }

    if (!target.items) {
        target.items = [];
    }

    if (!target.items.includes(bookId)) {
        target.items.push(bookId);
    }

    const book =
        library.find(
            b => b.id === bookId
        );

    if (book) {
        if (!book.categories) {
            book.categories = [];
        }

        if (
            !book.categories.some(
                c =>
                    c.toLowerCase() ===
                    target.title.toLowerCase()
            )
        ) {
            book.categories.push(
                target.title
            );
        }
    }

    saveState();
    initApp();
}

function removeBookFromShelf(
    bookId,
    activeCategory
) {
    if (
        activeCategory.toLowerCase() ===
        'all'
    ) {
        bookshelfState.shelves.forEach(
            shelf => {
                if (shelf.items) {
                    shelf.items =
                        shelf.items.filter(
                            id => id !== bookId
                        );
                }
            }
        );
    } else {
        const activeShelf =
            bookshelfState.shelves.find(
                shelf =>
                    shelf.title.toLowerCase() ===
                    activeCategory.toLowerCase()
            );

        if (
            activeShelf &&
            activeShelf.items
        ) {
            activeShelf.items =
                activeShelf.items.filter(
                    id => id !== bookId
                );
        }
    }

    saveState();
    initApp();
}

async function searchGoogleBooksAPI(
    query = 'fiction'
) {
    try {
        const response =
            await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
            );

        const data =
            await response.json();

        if (
            data.items &&
            data.items.length > 0
        ) {
            const vol =
                data.items[0].volumeInfo;

            const newBook = {
                id:
                    `book_${Date.now()}`,
                title:
                    vol.title ||
                    'Untitled',
                author:
                    vol.authors
                        ? vol.authors.join(', ')
                        : 'Unknown Author',
                categories:
                    ['Favorites'],
                image:
                    vol.imageLinks
                        ? vol.imageLinks.thumbnail
                            .replace(
                                'http:',
                                'https:'
                            )
                        : 'image/replacement.png'
            };

            library.push(newBook);

            let targetShelf =
                bookshelfState.shelves.find(
                    shelf =>
                        shelf.title.toLowerCase() ===
                        'favorites'
                ) ||
                bookshelfState.shelves[0];

            if (!targetShelf) {
                targetShelf = {
                    id: 'favorites',
                    title: 'Favorites',
                    items: []
                };

                bookshelfState.shelves.push(
                    targetShelf
                );
            }

            if (!targetShelf.items) {
                targetShelf.items = [];
            }

            targetShelf.items.push(
                newBook.id
            );

            saveState();
            initApp();

            alert(
                `Successfully added "${newBook.title}" from Google Books API to your library!`
            );
        }
    } catch (error) {
        console.error(
            'Error fetching from Google Books API:',
            error
        );
    }
}
if (!window.__readingCompanionSignoutBound) {
    window.__readingCompanionSignoutBound = true;

    document.addEventListener('click', e => {
        const signoutButton = e.target.closest('.sidebar-signout');

        if (!signoutButton) return;

        e.preventDefault();

        const isGuest =
            localStorage.getItem('readingCompanionGuest') === 'true';

        if (isGuest) {
            sessionStorage.clear();
        }

        localStorage.removeItem('readingCompanionGuest');
        localStorage.removeItem('readingCompanionLoggedIn');

        window.location.href = './index.html';
    });
}