document.addEventListener('DOMContentLoaded', () => {
  
    createCustomModalDOM();
    const selectionGroups = document.querySelectorAll('.option-list, .option-grid-2');

    selectionGroups.forEach(group => {
        const buttons = group.querySelectorAll('.option-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    });

    let initialGoals = JSON.parse(localStorage.getItem('userActiveGoals')) || [];
    updateTopStats(initialGoals);

    renderActiveGoals();
    renderCompletedMilestones();
    updateAllTimeStats();

    window.addEventListener('storage', (e) => {
        if (e.key === 'userActiveGoals') {
            let updatedGoals = JSON.parse(localStorage.getItem('userActiveGoals')) || [];
            updateTopStats(updatedGoals);
        }
    });

    const presetCards = document.querySelectorAll('.presets-section .preset-card');

    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            const titleEl = card.querySelector('.preset-title');
            const subtitleEl = card.querySelector('.preset-subtitle');
            
            const goalName = titleEl ? titleEl.textContent.trim() : 'Reading Goal';
            const goalType = subtitleEl ? subtitleEl.textContent.trim() : 'Annual Books';
            
            const matches = goalName.match(/\d+/);
            const targetNumber = matches ? parseInt(matches[0], 10) : 25;

            showCustomModal({
                title: 'Add Preset Goal',
                message: `Do you want to add "${goalName}" directly to your active goals?`,
                type: 'confirm',
                onConfirm: () => {
                    const newGoal = {
                        name: goalName,
                        type: goalType,
                        timeline: 'Active',
                        target: targetNumber,
                        current: 0,
                        timeLeft: 'Active',
                        statusText: 'Just added from quick presets',
                        pinned: false
                    };

                    saveActiveGoalToMemory(newGoal);
                    renderActiveGoals();
                    updateAllTimeStats();
                    showCustomModal({
                        title: 'Success!',
                        message: `Successfully added "${goalName}" to your active goals.`,
                        type: 'alert'
                    });
                }
            });
        });
    });

    const tabButtons = document.querySelectorAll('.goals-tab-nav .tab-btn');
    const tabContents = document.querySelectorAll('.goals-tabs-section .tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const targetContent = document.getElementById(targetTabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    const addAnotherGoalBar = document.querySelector('.add-another-goal-bar');
    const goalFormCard = document.querySelector('.goal-form-card');

    if (addAnotherGoalBar && goalFormCard) {
        addAnotherGoalBar.style.cursor = 'pointer';
        addAnotherGoalBar.addEventListener('click', () => {
            goalFormCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            const firstInput = document.getElementById('goal-name-input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 300);
            }
        });
    }

    const goalForm = document.getElementById('goal-form');
    const targetInput = document.getElementById('target-number');

    if (goalForm) {
        goalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const goalName = document.getElementById('goal-name-input')?.value.trim() || 'Custom Reading Goal';
            
            const activeGoalTypeBtn = document.querySelector('[data-select="goal-type"] .option-btn.active');
            let goalType = activeGoalTypeBtn?.getAttribute('data-value') || 'Books';
            if (goalType === 'custom-input-trigger') {
                goalType = document.getElementById('custom-goal-type-text')?.value.trim() || 'Custom';
            }

            const activeTimelineBtn = document.querySelector('[data-select="timeline"] .option-btn.active');
            let timeline = activeTimelineBtn?.getAttribute('data-value') || 'Annual';
            if (timeline === 'custom-input-trigger') {
                timeline = document.getElementById('custom-timeline-text')?.value.trim() || 'Custom';
            }

            const targetValue = parseInt(targetInput?.value, 10);

            if (isNaN(targetValue) || targetValue <= 0) {
                showCustomModal({
                    title: 'Invalid Target',
                    message: 'Please enter a valid target number greater than zero.',
                    type: 'alert'
                });
                return;
            }

            const newGoal = {
                name: goalName,
                type: goalType,
                timeline: timeline,
                target: targetValue,
                current: 0,
                timeLeft: timeline,
                statusText: 'Just started &mdash; track your first progress',
                pinned: false
            };

            saveActiveGoalToMemory(newGoal);
            renderActiveGoals();
            updateAllTimeStats();

            showCustomModal({
                title: 'Goal Created',
                message: `Successfully added active goal: ${goalName}`,
                type: 'alert'
            });

            goalForm.reset();
        });
    }

    // 7. Dynamic Custom Button Handler for Option Lists / Grids
    function setupCustomToggle(containerSelector, customInputId) {
        const buttons = document.querySelectorAll(`[data-select="${containerSelector}"] .option-btn`);
        const customInput = document.getElementById(customInputId);

        if (!customInput) return;

        buttons.forEach(btn => {
            btn.addEventListener("click", function () {
                buttons.forEach(b => b.classList.remove("active"));
                this.classList.add("active");

                if (this.getAttribute("data-value") === "custom-input-trigger") {
                    customInput.style.display = "block";
                    customInput.focus();
                } else {
                    customInput.style.display = "none";
                    customInput.value = ""; 
                }
            });
        });
    }

    setupCustomToggle("goal-type", "custom-goal-type-text");
    setupCustomToggle("timeline", "custom-timeline-text");
});

// --- HELPER FUNCTIONS FOR MEMORY & RENDERING ---

function saveActiveGoalToMemory(goal) {
    let activeGoals = JSON.parse(localStorage.getItem('userActiveGoals')) || [];
    activeGoals.push(goal);
    localStorage.setItem('userActiveGoals', JSON.stringify(activeGoals));
}

function renderActiveGoals() {
    let activeGoals = JSON.parse(localStorage.getItem('userActiveGoals'));
    
    if (!activeGoals) {
        activeGoals = [];
        localStorage.setItem('userActiveGoals', JSON.stringify(activeGoals));
    }

    updateTopStats(activeGoals);
    updateAllTimeStats();

    const activeBadge = document.querySelector('[data-tab="active-goals"] .tab-badge');
    if (activeBadge) {
        activeBadge.textContent = activeGoals.length;
    }

    const grid = document.querySelector(".active-goals-grid");
    if (!grid) return;

    const existingCards = grid.querySelectorAll(".active-goal-card");
    existingCards.forEach(c => c.remove());

    let emptyMessage = document.getElementById("no-goals-message");
    if (!emptyMessage) {
        emptyMessage = document.createElement('div');
        emptyMessage.id = "no-goals-message";
        emptyMessage.style.cssText = "grid-column: 1 / -1; text-align: center; padding: 2rem; color: #78716C; font-style: italic;";
        grid.appendChild(emptyMessage);
    }

    if (activeGoals.length === 0) {
        emptyMessage.textContent = "Awaiting goals";
        emptyMessage.style.display = "block";
        return;
    }

    emptyMessage.style.display = "none";

    activeGoals.forEach((goal, index) => {
        const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const isFinished = goal.current >= goal.target;
        const isPinned = goal.pinned || false;

        const card = document.createElement('div');
        card.className = 'active-goal-card';
        
        card.innerHTML = `
            <div class="goal-card-header">
                <h3 class="active-goal-title">${goal.name}</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="pin-goal-btn ${isPinned ? 'pinned' : ''}" type="button" data-index="${index}" title="Pin to top stats" style="background: none; border: none; cursor: pointer; font-size: 1rem; opacity: ${isPinned ? '1' : '0.3'}; transition: opacity 0.2s;">📌</button>
                    <span class="goal-time-left">${isFinished ? 'Completed! 🎉' : (goal.timeLeft || 'Active')}</span>
                </div>
            </div>
            <span class="goal-category-pill sage">${goal.type}</span>
            <div class="goal-progress-container">
                <div class="goal-progress-track">
                    <div class="goal-progress-fill sage" style="width: ${percentage}%;"></div>
                </div>
                <div class="goal-progress-stats">
                    <span class="fraction">${goal.current} / ${goal.target}</span>
                    <span class="percentage">${percentage}%</span>
                </div>
            </div>
            <p class="goal-status-text">${isFinished ? 'Goal target reached!' : goal.statusText}</p>
            <div class="goal-card-actions">
               <button class="${isFinished ? 'add-to-milestones-btn' : 'update-progress-btn'}" type="button" data-index="${index}">
                   ${isFinished ? 'Add to Milestones' : 'Update Progress'}
               </button>
               <button class="delete-goal-btn" type="button" data-index="${index}">Delete</button>
            </div>
        `;

        card.querySelector('.pin-goal-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const pinnedCount = activeGoals.filter(g => g.pinned).length;
            
            if (!goal.pinned && pinnedCount >= 4) {
                showCustomModal({
                    title: 'Pin Limit Reached',
                    message: 'You can only select up to 4 goals for the top stats grid. Unpin another goal first.',
                    type: 'alert'
                });
                return;
            }

            goal.pinned = !goal.pinned;
            activeGoals[index] = goal;
            localStorage.setItem('userActiveGoals', JSON.stringify(activeGoals));
            renderActiveGoals();
        });

        card.querySelector('.delete-goal-btn').addEventListener('click', () => {
            showCustomModal({
                title: 'Delete Goal',
                message: `Are you sure you want to delete "${goal.name}"?`,
                type: 'confirm',
                onConfirm: () => {
                    activeGoals.splice(index, 1);
                    localStorage.setItem('userActiveGoals', JSON.stringify(activeGoals));
                    renderActiveGoals();
                    updateAllTimeStats();
                }
            });
        });

        if (isFinished) {
            card.querySelector('.add-to-milestones-btn').addEventListener('click', () => {
                const milestone = {
                    name: goal.name,
                    type: goal.type,
                    desc: `Completed with ${goal.current} / ${goal.target} achieved`,
                    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    icon: '🏆'
                };

                let completed = JSON.parse(localStorage.getItem('userCompletedMilestones')) || [];
                completed.unshift(milestone);
                localStorage.setItem('userCompletedMilestones', JSON.stringify(completed));

                activeGoals.splice(index, 1);
                localStorage.setItem('userActiveGoals', JSON.stringify(activeGoals));

                renderActiveGoals();
                renderCompletedMilestones();
                updateAllTimeStats();

                document.querySelector('[data-tab="completed-milestones"]')?.click();

                showCustomModal({
                    title: 'Milestone Added!',
                    message: `Successfully moved "${goal.name}" to Completed Milestones!`,
                    type: 'alert'
                });
            });
        } else {
            card.querySelector('.update-progress-btn').addEventListener('click', () => {
                showCustomModal({
                    title: 'Update Progress',
                    message: `Add progress for "${goal.name}" (Current: ${goal.current}/${goal.target}):`,
                    type: 'prompt',
                    defaultValue: '1',
                    onPromptSubmit: (value) => {
                        const added = parseInt(value, 10);
                        if (!isNaN(added)) {
                            goal.current = Math.min(goal.target, goal.current + added);
                            activeGoals[index] = goal;
                            localStorage.setItem('userActiveGoals', JSON.stringify(activeGoals));
                            renderActiveGoals();
                            updateAllTimeStats();
                        }
                    }
                });
            });
        }

        grid.appendChild(card);
    });
}

function renderCompletedMilestones() {
    const achievementsList = document.getElementById("achievements-list");
    const archivedCard = document.getElementById("archived-achievements-card");
    let noMilestonesMsg = document.getElementById("no-milestones-message");
    const countBadge = document.getElementById("archived-count-badge");
    const statsGoalsCompleted = document.getElementById("stats-goals-completed");
    const archivedHeader = archivedCard ? archivedCard.querySelector(".archived-header") : null;

    if (!achievementsList) return;

    if (!noMilestonesMsg && archivedCard) {
        noMilestonesMsg = document.createElement('div');
        noMilestonesMsg.id = "no-milestones-message";
        noMilestonesMsg.style.cssText = "text-align: center; padding: 2rem; color: #78716C; font-style: italic;";
        archivedCard.appendChild(noMilestonesMsg);
    }

    let completedMilestones = JSON.parse(localStorage.getItem('userCompletedMilestones')) || [];
    const completedBadge = document.querySelector('[data-tab="completed-milestones"] .tab-badge');
    if (completedBadge) {
        completedBadge.textContent = completedMilestones.length;
    }

    if (statsGoalsCompleted) {
        statsGoalsCompleted.textContent = completedMilestones.length > 0 ? completedMilestones.length : '0';
    }

    updateAllTimeStats();

    if (completedMilestones.length === 0) {
        if (noMilestonesMsg) {
            noMilestonesMsg.textContent = "Awaiting goals";
            noMilestonesMsg.style.display = "block";
        }
        if (achievementsList) achievementsList.innerHTML = '';
        if (archivedCard) {
            const viewMoreEl = document.getElementById("milestones-view-more-container");
            if (viewMoreEl) viewMoreEl.style.display = "none";
        }
        return;
    }

    if (noMilestonesMsg) noMilestonesMsg.style.display = "none";
    if (archivedCard) archivedCard.style.display = "block";
    if (countBadge) countBadge.textContent = `${completedMilestones.length} completed`;

    let visibleCount = 5;

    function renderMilestonesList() {
        achievementsList.innerHTML = '';
        
        const milestonesToDisplay = completedMilestones.slice(0, visibleCount);

        milestonesToDisplay.forEach(item => {
            const row = document.createElement('div');
            row.className = 'achievement-row';
            row.innerHTML = `
                <div class="achievement-left">
                    <div class="achievement-icon-box">${item.icon || '🏆'}</div>
                    <div class="achievement-details">
                        <div class="achievement-name-row">
                            <h4 class="achievement-name">${item.name}</h4>
                            <span class="goal-category-pill sage">${item.type}</span>
                        </div>
                        <span class="goal-category-pill-mobile sage">${item.type}</span>
                        <p class="achievement-desc">${item.desc}</p>
                    </div>
                </div>
                <span class="achievement-date">${item.date}</span>
            `;
            achievementsList.appendChild(row);
        });

        let viewMoreContainer = document.getElementById("milestones-view-more-container");
        if (completedMilestones.length > visibleCount) {
            if (!viewMoreContainer) {
                viewMoreContainer = document.createElement('div');
                viewMoreContainer.id = "milestones-view-more-container";
                viewMoreContainer.style.cssText = "text-align: center; margin-top: 1rem; padding-bottom: 0.5rem;";
                viewMoreContainer.innerHTML = `<button id="milestones-view-more-btn" type="button" style="background: none; border: 1px solid #D3CBC0; padding: 0.5rem 1rem; border-radius: 12px; font-size: 0.85rem; color: #3B433E; cursor: pointer; font-weight: 600; font-family: 'DM Sans', sans-serif;">View More (${completedMilestones.length - visibleCount} remaining)</button>`;
                archivedCard.appendChild(viewMoreContainer);

                document.getElementById("milestones-view-more-btn").addEventListener('click', () => {
                    visibleCount += 5;
                    renderMilestonesList();
                });
            } else {
                viewMoreContainer.style.display = "block";
                document.getElementById("milestones-view-more-btn").textContent = `View More (${completedMilestones.length - visibleCount} remaining)`;
            }
        } else if (viewMoreContainer) {
            viewMoreContainer.style.display = "none";
        }
    }

    renderMilestonesList();

    if (archivedHeader) {
        const newHeader = archivedHeader.cloneNode(true);
        archivedHeader.parentNode.replaceChild(newHeader, archivedHeader);

        const arrow = newHeader.querySelector(".accordion-arrow");
        let isCollapsed = false;

        const newClearBtn = newHeader.querySelector("#clear-milestones-btn");
        if (newClearBtn) {
            newClearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showCustomModal({
                    title: 'Clear Milestones',
                    message: 'Are you sure you want to clear all completed milestones?',
                    type: 'confirm',
                    confirmText: 'Clear All',
                    onConfirm: () => {
                        localStorage.removeItem('userCompletedMilestones');
                        renderCompletedMilestones();
                        updateAllTimeStats();
                    }
                });
            });
        }

        newHeader.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            const listEl = document.getElementById("achievements-list");
            const viewMoreEl = document.getElementById("milestones-view-more-container");
            const targetArrow = newHeader.querySelector(".accordion-arrow");

            if (isCollapsed) {
                if (listEl) listEl.style.display = "none";
                if (viewMoreEl) viewMoreEl.style.display = "none";
                if (targetArrow) targetArrow.style.transform = "rotate(180deg)";
            } else {
                if (listEl) listEl.style.display = "block";
                if (viewMoreEl) viewMoreEl.style.display = "block";
                if (targetArrow) targetArrow.style.transform = "rotate(0deg)";
            }
        });
        
        if (arrow) arrow.style.transition = "transform 0.2s ease";
    }
}

function updateAllTimeStats() {
    const activeGoals = JSON.parse(localStorage.getItem('userActiveGoals')) || [];
    const completedMilestones = JSON.parse(localStorage.getItem('userCompletedMilestones')) || [];

    //  Goals Completed
    const goalsCompletedEl = document.getElementById('stats-goals-completed');
    if (goalsCompletedEl) {
        goalsCompletedEl.textContent = completedMilestones.length > 0 ? completedMilestones.length : '—';
    }

    //  Books Read
    let booksRead = 0;
    activeGoals.forEach(g => {
        if (g.type.toLowerCase().includes('book') || g.type.toLowerCase().includes('target') || g.name.toLowerCase().includes('book')) {
            booksRead += g.current;
        }
    });
    completedMilestones.forEach(m => {
        if (m.type.toLowerCase().includes('book') || m.type.toLowerCase().includes('target') || m.name.toLowerCase().includes('book')) {
            const match = m.desc.match(/(\d+)\s*\/\s*(\d+)/);
            if (match) {
                booksRead += parseInt(match[2], 10);
            } else {
                booksRead += 1;
            }
        }
    });
    const booksReadEl = document.getElementById('stats-books-read');
    if (booksReadEl) {
        booksReadEl.textContent = booksRead > 0 ? booksRead.toLocaleString() : '—';
    }

    // Pages Turned
    let pagesTurned = 0;
    activeGoals.forEach(g => {
        if (g.type.toLowerCase().includes('page') || g.name.toLowerCase().includes('page')) {
            pagesTurned += g.current;
        }
    });
    completedMilestones.forEach(m => {
        if (m.type.toLowerCase().includes('page') || m.name.toLowerCase().includes('page')) {
            const match = m.desc.match(/(\d+)\s*\/\s*(\d+)/);
            if (match) {
                pagesTurned += parseInt(match[2], 10);
            }
        }
    });
    const pagesTurnedEl = document.getElementById('stats-pages-turned');
    if (pagesTurnedEl) {
        pagesTurnedEl.textContent = pagesTurned > 0 ? pagesTurned.toLocaleString() : '—';
    }

    // 4. Longest Streak
    let longestStreak = 0;
    activeGoals.forEach(g => {
        if (g.type.toLowerCase().includes('streak') || g.name.toLowerCase().includes('streak')) {
            if (g.current > longestStreak) {
                longestStreak = g.current;
            }
        }
    });
    completedMilestones.forEach(m => {
        if (m.type.toLowerCase().includes('streak') || m.name.toLowerCase().includes('streak')) {
            const match = m.desc.match(/(\d+)\s*\/\s*(\d+)/);
            if (match) {
                const val = parseInt(match[2], 10);
                if (val > longestStreak) longestStreak = val;
            }
        }
    });
    const streakEl = document.getElementById('stats-longest-streak');
    if (streakEl) {
        streakEl.textContent = longestStreak > 0 ? `${longestStreak} days` : '—';
    }
}

function createCustomModalDOM() {
    if (document.getElementById('custom-app-modal')) return;

    const modalHTML = `
        <div id="custom-app-modal">
            <div>
                <button id="modal-close-btn-top" type="button">&times;</button>
                <div class="modal-icon-badge">✨</div>
                <h3 id="modal-title">Update Progress</h3>
                <p id="modal-message">Keep track of your reading journey</p>
                <div id="modal-input-container">
                    <label id="modal-input-label" for="modal-prompt-input">PAGES READ SO FAR</label>
                    <input type="number" id="modal-prompt-input" />
                </div>
                <div class="modal-footer">
                    <button id="modal-cancel-btn" type="button">Cancel</button>
                    <button id="modal-confirm-btn" type="button">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showCustomModal({ title, message, type = 'alert', inputLabel = 'PAGES READ SO FAR', defaultValue = '', confirmText = 'Save Changes', onConfirm, onPromptSubmit }) {
    const modal = document.getElementById('custom-app-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const inputContainer = document.getElementById('modal-input-container');
    const inputLabelEl = document.getElementById('modal-input-label');
    const promptInput = document.getElementById('modal-prompt-input');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const closeBtnTop = document.getElementById('modal-close-btn-top');

    if (!modal) return;

    titleEl.textContent = title || 'Update Progress';
    messageEl.innerHTML = message || 'Keep track of your reading journey';
    inputLabelEl.textContent = inputLabel;
    promptInput.value = defaultValue;
    confirmBtn.textContent = confirmText;

    if (type === 'alert') {
        cancelBtn.style.display = 'none';
        inputContainer.style.display = 'none';
        confirmBtn.style.gridColumn = '1 / -1';
        confirmBtn.textContent = 'OK';
    } else if (type === 'confirm') {
        cancelBtn.style.display = 'block';
        inputContainer.style.display = 'none';
        confirmBtn.style.gridColumn = 'auto';
    } else if (type === 'prompt') {
        cancelBtn.style.display = 'block';
        inputContainer.style.display = 'block';
        confirmBtn.style.gridColumn = 'auto';
        setTimeout(() => promptInput.focus(), 50);
    }

    modal.style.display = 'flex';

    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newCloseBtnTop = closeBtnTop.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    closeBtnTop.parentNode.replaceChild(newCloseBtnTop, closeBtnTop);

    newConfirmBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (type === 'prompt' && typeof onPromptSubmit === 'function') {
            onPromptSubmit(promptInput.value);
        } else if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });

    const closeModal = () => { modal.style.display = 'none'; };
    newCancelBtn.addEventListener('click', closeModal);
    newCloseBtnTop.addEventListener('click', closeModal);

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function updateTopStats(activeGoals) {
    if (!activeGoals || activeGoals.length === 0) {
        for (let i = 1; i <= 4; i++) {
            const titleEl = document.getElementById(`stat-title-${i}`);
            const valEl = document.getElementById(`stat-val-${i}`);
            const descEl = document.getElementById(`stat-desc-${i}`);
            if (titleEl) titleEl.textContent = 'Awaiting goals';
            if (valEl) valEl.textContent = '—';
            if (descEl) descEl.textContent = 'Awaiting goals';
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
            titleEl.textContent = 'Awaiting goals';
            valEl.textContent = '—';
            descEl.textContent = 'Awaiting goals';
        }
    }
}