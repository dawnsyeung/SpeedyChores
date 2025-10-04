class ChoreTracker {
    constructor() {
        this.chores = this.loadChores();
        this.userData = this.loadUserData();
        this.familyData = this.loadFamilyData();
        this.currentFilter = 'all';
        this.editingId = null;
        this.currentPlayer = 'parent';
        
        // Gaming timer properties
        this.gamingTimer = null;
        this.gamingTimeLeft = 30 * 60; // 30 minutes in seconds
        this.gamingTimerInterval = null;
        this.isGaming = false;
        this.isPaused = false;
        
        // Home page elements
        this.homePage = document.getElementById('homePage');
        this.mainApp = document.getElementById('mainApp');
        this.startChoresBtn = document.getElementById('startChoresBtn');
        
        this.initializeElements();
        this.bindEvents();
        this.loadSavedName();
        this.render();
        this.initializeHomePage();
    }
    
    initializeElements() {
        this.choreInput = document.getElementById('choreInput');
        this.choreCategory = document.getElementById('choreCategory');
        this.chorePriority = document.getElementById('chorePriority');
        this.addBtn = document.getElementById('addBtn');
        this.choreList = document.getElementById('choreList');
        this.emptyState = document.getElementById('emptyState');
        this.totalChores = document.getElementById('totalChores');
        this.completedChores = document.getElementById('completedChores');
        this.remainingChores = document.getElementById('remainingChores');
        this.points = document.getElementById('points');
        this.streak = document.getElementById('streak');
        this.dishesWashed = document.getElementById('dishesWashed');
        this.dishStreak = document.getElementById('dishStreak');
        this.tablesCleaned = document.getElementById('tablesCleaned');
        this.tableStreak = document.getElementById('tableStreak');
        this.familyMember = document.getElementById('familyMember');
        this.userName = document.getElementById('userName');
        this.parentScore = document.getElementById('parentScore');
        this.little2Score = document.getElementById('little2Score');
        this.challengeDescription = document.getElementById('challengeDescription');
        this.challengeProgress = document.getElementById('challengeProgress');
        this.challengeText = document.getElementById('challengeText');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.redeemBtns = document.querySelectorAll('.redeem-btn');
        this.quickBtns = document.querySelectorAll('.quick-btn');
        
        // Gaming timer elements
        this.gamingTimerDisplay = document.getElementById('gamingTimer');
        this.startGamingBtn = document.getElementById('startGamingBtn');
        this.pauseGamingBtn = document.getElementById('pauseGamingBtn');
        this.stopGamingBtn = document.getElementById('stopGamingBtn');
        this.gamingSessions = document.getElementById('gamingSessions');
        this.totalGamingTime = document.getElementById('totalGamingTime');
    }
    
    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addChore());
        this.choreInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addChore();
        });
        
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
        
        this.redeemBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.redeemReward(e.target));
        });
        
        this.quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.quickAddChore(e.target));
        });
        
        this.familyMember.addEventListener('change', (e) => this.switchPlayer(e.target.value));
        this.userName.addEventListener('input', (e) => this.updateUserName(e.target.value));
        
        // Gaming timer events
        this.startGamingBtn.addEventListener('click', () => this.startGaming());
        this.pauseGamingBtn.addEventListener('click', () => this.pauseGaming());
        this.stopGamingBtn.addEventListener('click', () => this.stopGaming());
        
        // Home page events
        this.startChoresBtn.addEventListener('click', () => this.startChores());
    }
    
    initializeHomePage() {
        // Show home page by default
        this.homePage.style.display = 'flex';
        this.mainApp.style.display = 'none';
    }
    
    startChores() {
        // Hide home page and show main app with animation
        this.homePage.style.opacity = '0';
        setTimeout(() => {
            this.homePage.style.display = 'none';
            this.mainApp.style.display = 'block';
            this.mainApp.style.opacity = '0';
            setTimeout(() => {
                this.mainApp.style.opacity = '1';
            }, 50);
        }, 300);
    }
    
    addChore() {
        const text = this.choreInput.value.trim();
        if (!text) return;
        
        if (this.editingId !== null) {
            this.updateChore(this.editingId, text);
        } else {
            const chore = {
                id: Date.now(),
                text: text,
                category: this.choreCategory.value,
                priority: this.chorePriority.value,
                completed: false,
                player: this.currentPlayer,
                createdAt: new Date().toISOString()
            };
            this.chores.unshift(chore);
        }
        
        this.choreInput.value = '';
        this.choreCategory.value = 'general';
        this.chorePriority.value = 'low';
        this.editingId = null;
        this.addBtn.textContent = 'Add Chore';
        this.saveChores();
        this.render();
    }
    
    updateChore(id, newText) {
        const chore = this.chores.find(c => c.id === id);
        if (chore) {
            chore.text = newText;
            this.saveChores();
        }
    }
    
    toggleChore(id) {
        const chore = this.chores.find(c => c.id === id);
        if (chore) {
            const wasCompleted = chore.completed;
            chore.completed = !chore.completed;
            
            if (!wasCompleted && chore.completed) {
                // Chore was just completed - award points and update streak
                let points = 10;
                if (chore.category === 'gaming') points = 50;
                else if (chore.category === 'race') points = 20;
                else if (chore.category === 'pool') points = 15;
                else if (chore.category === 'violin') points = 15;
                else if (chore.category === 'piano') points = 15;
                else if (chore.category === 'dishes') points = 15;
                else if (chore.category === 'table') points = 12;
                else if (chore.category === 'bathroom') points = 12;
                else if (chore.priority === 'high') points = 15;
                else if (chore.priority === 'medium') points = 12;
                
                this.awardPoints(points);
                this.updateStreak(true);
                this.updateDishStats(chore, true);
                this.updateTableStats(chore, true);
                this.updateFamilyScores();
                this.updateWeeklyChallenge();
                this.showNotification(`+${points} points! Great job! 🎉`, 'success');
            } else if (wasCompleted && !chore.completed) {
                // Chore was uncompleted - remove points and reset streak
                let points = 10;
                if (chore.category === 'gaming') points = 50;
                else if (chore.category === 'race') points = 20;
                else if (chore.category === 'pool') points = 15;
                else if (chore.category === 'violin') points = 15;
                else if (chore.category === 'piano') points = 15;
                else if (chore.category === 'dishes') points = 15;
                else if (chore.category === 'table') points = 12;
                else if (chore.category === 'bathroom') points = 12;
                else if (chore.priority === 'high') points = 15;
                else if (chore.priority === 'medium') points = 12;
                
                this.awardPoints(-points);
                this.updateStreak(false);
                this.updateDishStats(chore, false);
                this.updateTableStats(chore, false);
                this.updateFamilyScores();
                this.updateWeeklyChallenge();
                this.showNotification(`-${points} points for uncompleting chore 😔`, 'warning');
            }
            
            this.saveChores();
            this.saveUserData();
            this.render();
        }
    }
    
    deleteChore(id) {
        if (confirm('Are you sure you want to delete this chore?')) {
            this.chores = this.chores.filter(c => c.id !== id);
            this.saveChores();
            this.render();
        }
    }
    
    editChore(id) {
        const chore = this.chores.find(c => c.id === id);
        if (chore) {
            this.choreInput.value = chore.text;
            this.choreInput.focus();
            this.editingId = id;
            this.addBtn.textContent = 'Update Chore';
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }
    
    getFilteredChores() {
        switch (this.currentFilter) {
            case 'completed':
                return this.chores.filter(chore => chore.completed);
            case 'pending':
                return this.chores.filter(chore => !chore.completed);
            case 'dishes':
                return this.chores.filter(chore => chore.category === 'dishes');
            case 'high':
                return this.chores.filter(chore => chore.priority === 'high');
            case 'today':
                const today = new Date().toDateString();
                return this.chores.filter(chore => 
                    new Date(chore.createdAt).toDateString() === today
                );
            default:
                return this.chores;
        }
    }
    
    updateStats() {
        const total = this.chores.length;
        const completed = this.chores.filter(c => c.completed).length;
        const remaining = total - completed;
        
        this.totalChores.textContent = total;
        this.completedChores.textContent = completed;
        this.remainingChores.textContent = remaining;
        this.points.textContent = this.userData.points;
        this.streak.textContent = this.userData.streak;
        
        // Update special stats
        const dishesCompleted = this.chores.filter(c => c.category === 'dishes' && c.completed).length;
        this.dishesWashed.textContent = dishesCompleted;
        this.dishStreak.textContent = this.userData.dishStreak || 0;
        
        const tablesCompleted = this.chores.filter(c => c.category === 'table' && c.completed).length;
        this.tablesCleaned.textContent = tablesCompleted;
        this.tableStreak.textContent = this.userData.tableStreak || 0;
    }
    
    render() {
        const filteredChores = this.getFilteredChores();
        
        this.choreList.innerHTML = '';
        
        if (filteredChores.length === 0) {
            this.emptyState.style.display = 'block';
            this.choreList.style.display = 'none';
        } else {
            this.emptyState.style.display = 'none';
            this.choreList.style.display = 'block';
            
            filteredChores.forEach(chore => {
                const li = document.createElement('li');
                li.className = `chore-item ${chore.category} ${chore.priority} ${chore.completed ? 'completed' : ''}`;
                
                const priorityIcon = chore.priority === 'high' ? '🔴' : chore.priority === 'medium' ? '🟡' : '🟢';
                
                li.innerHTML = `
                    <input type="checkbox" class="chore-checkbox" ${chore.completed ? 'checked' : ''}>
                    <span class="chore-text">${this.escapeHtml(chore.text)}</span>
                    <span class="priority-indicator">${priorityIcon}</span>
                    <div class="chore-actions">
                        <button class="edit-btn" title="Edit chore">✏️</button>
                        <button class="delete-btn" title="Delete chore">🗑️</button>
                    </div>
                `;
                
                // Bind events for this chore item
                const checkbox = li.querySelector('.chore-checkbox');
                const editBtn = li.querySelector('.edit-btn');
                const deleteBtn = li.querySelector('.delete-btn');
                
                checkbox.addEventListener('change', () => this.toggleChore(chore.id));
                editBtn.addEventListener('click', () => this.editChore(chore.id));
                deleteBtn.addEventListener('click', () => this.deleteChore(chore.id));
                
                this.choreList.appendChild(li);
            });
        }
        
        this.updateStats();
        this.updateRedeemButtons();
        this.updateFamilyScores();
        this.updateWeeklyChallenge();
        this.updateGamingStats();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    saveChores() {
        localStorage.setItem('choreTracker', JSON.stringify(this.chores));
    }
    
    loadChores() {
        // Check if it's Monday and reset if needed
        if (this.shouldResetWeekly()) {
            this.performWeeklyReset();
            return [];
        }
        
        const saved = localStorage.getItem('choreTracker');
        return saved ? JSON.parse(saved) : [];
    }
    
    loadUserData() {
        // Check if it's Monday and reset if needed
        if (this.shouldResetWeekly()) {
            this.performWeeklyReset();
            return {
                name: '',
                points: 0,
                streak: 0,
                dishStreak: 0,
                tableStreak: 0,
                lastCompletedDate: null,
                lastDishDate: null,
                lastTableDate: null,
                missedChores: 0,
                missedDishChores: 0,
                missedTableChores: 0,
                redeemedRewards: [],
                gamingSessions: 0,
                totalGamingTime: 0
            };
        }
        
        const saved = localStorage.getItem('choreTrackerUserData');
        return saved ? JSON.parse(saved) : {
            name: '',
            points: 0,
            streak: 0,
            dishStreak: 0,
            tableStreak: 0,
            lastCompletedDate: null,
            lastDishDate: null,
            lastTableDate: null,
            missedChores: 0,
            missedDishChores: 0,
            missedTableChores: 0,
            redeemedRewards: [],
            gamingSessions: 0,
            totalGamingTime: 0
        };
    }
    
    loadFamilyData() {
        // Check if it's Monday and reset if needed
        if (this.shouldResetWeekly()) {
            this.performWeeklyReset();
            return {
                parent: { score: 0, weeklyChores: 0 },
                little2: { score: 0, weeklyChores: 0 },
                weeklyChallenge: {
                    description: "Complete 30 chores to win the week!",
                    target: 30,
                    startDate: new Date().toISOString()
                }
            };
        }
        
        const saved = localStorage.getItem('choreTrackerFamilyData');
        return saved ? JSON.parse(saved) : {
            parent: { score: 0, weeklyChores: 0 },
            little2: { score: 0, weeklyChores: 0 },
            weeklyChallenge: {
                description: "Complete 30 chores to win the week!",
                target: 30,
                startDate: new Date().toISOString()
            }
        };
    }
    
    saveFamilyData() {
        localStorage.setItem('choreTrackerFamilyData', JSON.stringify(this.familyData));
    }
    
    saveUserData() {
        localStorage.setItem('choreTrackerUserData', JSON.stringify(this.userData));
    }
    
    shouldResetWeekly() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Check if it's Monday (day 1)
        if (dayOfWeek === 1) {
            const lastReset = localStorage.getItem('choreTrackerLastReset');
            if (lastReset) {
                const lastResetDate = new Date(lastReset);
                const todayString = today.toDateString();
                const lastResetString = lastResetDate.toDateString();
                
                // Only reset if we haven't reset today yet
                return todayString !== lastResetString;
            }
            return true; // First time on a Monday
        }
        return false;
    }
    
    performWeeklyReset() {
        // Clear all data
        localStorage.removeItem('choreTracker');
        localStorage.removeItem('choreTrackerUserData');
        localStorage.removeItem('choreTrackerFamilyData');
        
        // Set the last reset date to today
        localStorage.setItem('choreTrackerLastReset', new Date().toISOString());
        
        // Show reset notification
        this.showNotification('🔄 Weekly Reset! All data cleared for a fresh start!', 'success');
    }
    
    awardPoints(points) {
        this.userData.points = Math.max(0, this.userData.points + points);
    }
    
    updateStreak(completed) {
        const today = new Date().toDateString();
        
        if (completed) {
            if (this.userData.lastCompletedDate === today) {
                // Already completed today, don't increase streak
                return;
            }
            
            if (this.userData.lastCompletedDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()) {
                // Completed yesterday, increase streak
                this.userData.streak++;
            } else if (this.userData.lastCompletedDate !== today) {
                // First completion in a while, reset streak
                this.userData.streak = 1;
            }
            
            this.userData.lastCompletedDate = today;
            this.userData.missedChores = 0; // Reset missed chores counter
        } else {
            // Chore was uncompleted
            this.userData.missedChores++;
            this.checkConsequences();
        }
    }
    
    updateDishStats(chore, completed) {
        if (chore.category === 'dishes') {
            const today = new Date().toDateString();
            
            if (completed) {
                if (this.userData.lastDishDate === today) {
                    return; // Already completed dishes today
                }
                
                if (this.userData.lastDishDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()) {
                    // Completed dishes yesterday, increase streak
                    this.userData.dishStreak++;
                } else if (this.userData.lastDishDate !== today) {
                    // First dish completion in a while, reset streak
                    this.userData.dishStreak = 1;
                }
                
                this.userData.lastDishDate = today;
                this.userData.missedDishChores = 0; // Reset missed dish chores counter
            } else {
                // Dish chore was uncompleted
                this.userData.missedDishChores++;
                this.checkDishConsequences();
            }
        }
    }
    
    checkConsequences() {
        const missedCount = this.userData.missedChores;
        let consequence = null;
        
        if (missedCount >= 10) {
            consequence = "💸 Pay fine ($5)";
        } else if (missedCount >= 7) {
            consequence = "🚫 No treats for a day";
        } else if (missedCount >= 5) {
            consequence = "🧹 Extra cleaning";
        } else if (missedCount >= 3) {
            consequence = "📱 No phone for 1 hour";
        }
        
        if (consequence) {
            this.showNotification(`Consequence triggered: ${consequence}`, 'error');
        }
    }
    
    updateTableStats(chore, completed) {
        if (chore.category === 'table') {
            const today = new Date().toDateString();
            
            if (completed) {
                if (this.userData.lastTableDate === today) {
                    return; // Already completed table cleaning today
                }
                
                if (this.userData.lastTableDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()) {
                    // Completed table cleaning yesterday, increase streak
                    this.userData.tableStreak++;
                } else if (this.userData.lastTableDate !== today) {
                    // First table cleaning in a while, reset streak
                    this.userData.tableStreak = 1;
                }
                
                this.userData.lastTableDate = today;
                this.userData.missedTableChores = 0; // Reset missed table chores counter
            } else {
                // Table chore was uncompleted
                this.userData.missedTableChores++;
                this.checkTableConsequences();
            }
        }
    }
    
    checkDishConsequences() {
        const missedDishCount = this.userData.missedDishChores;
        let consequence = null;
        
        if (missedDishCount >= 4) {
            consequence = "🧽 Deep clean kitchen";
        } else if (missedDishCount >= 2) {
            consequence = "🍽️ Wash all dishes by hand";
        }
        
        if (consequence) {
            this.showNotification(`Dish consequence triggered: ${consequence}`, 'error');
        }
    }
    
    checkTableConsequences() {
        const missedTableCount = this.userData.missedTableChores;
        let consequence = null;
        
        if (missedTableCount >= 3) {
            consequence = "🧽 Deep clean all tables";
        } else if (missedTableCount >= 2) {
            consequence = "🪑 Polish all furniture";
        }
        
        if (consequence) {
            this.showNotification(`Table consequence triggered: ${consequence}`, 'error');
        }
    }
    
    quickAddChore(button) {
        const choreText = button.dataset.chore;
        const category = button.dataset.category;
        
        this.choreInput.value = choreText;
        this.choreCategory.value = category;
        
        // Add the chore immediately
        this.addChore();
        
        // Show feedback
        this.showNotification(`Quick added: ${choreText}`, 'success');
    }
    
    switchPlayer(player) {
        this.currentPlayer = player;
        this.showNotification(`Now playing as ${player === 'parent' ? 'Parent' : 'Little One'}!`, 'success');
        this.updateFamilyScores();
    }
    
    updateUserName(name) {
        this.userData.name = name.trim();
        this.saveUserData();
        this.updateDisplayName();
    }
    
    loadSavedName() {
        // Load the saved name into the input field
        this.userName.value = this.userData.name;
        this.updateDisplayName();
    }
    
    updateDisplayName() {
        // Update the header title to include the user's name if available
        const headerTitle = document.querySelector('header h1');
        if (this.userData.name) {
            headerTitle.textContent = `🏠 Chore Tracker - Welcome ${this.userData.name}!`;
        } else {
            headerTitle.textContent = '🏠 Chore Tracker';
        }
    }
    
    updateFamilyScores() {
        // Calculate scores for each player
        const parentChores = this.chores.filter(c => c.player === 'parent' && c.completed);
        const little2Chores = this.chores.filter(c => c.player === 'little2' && c.completed);
        
        let parentScore = 0;
        let little2Score = 0;
        
        parentChores.forEach(chore => {
            let points = 10;
            if (chore.category === 'gaming') points = 50;
            else if (chore.category === 'race') points = 20;
            else if (chore.category === 'pool') points = 15;
            else if (chore.category === 'violin') points = 15;
            else if (chore.category === 'piano') points = 15;
            else if (chore.category === 'dishes') points = 15;
            else if (chore.category === 'table') points = 12;
            else if (chore.category === 'bathroom') points = 12;
            else if (chore.priority === 'high') points = 15;
            else if (chore.priority === 'medium') points = 12;
            parentScore += points;
        });
        
        little2Chores.forEach(chore => {
            let points = 10;
            if (chore.category === 'gaming') points = 50;
            else if (chore.category === 'race') points = 20;
            else if (chore.category === 'pool') points = 15;
            else if (chore.category === 'violin') points = 15;
            else if (chore.category === 'piano') points = 15;
            else if (chore.category === 'dishes') points = 15;
            else if (chore.category === 'table') points = 12;
            else if (chore.category === 'bathroom') points = 12;
            else if (chore.priority === 'high') points = 15;
            else if (chore.priority === 'medium') points = 12;
            little2Score += points;
        });
        
        this.familyData.parent.score = parentScore;
        this.familyData.little2.score = little2Score;
        this.familyData.parent.weeklyChores = parentChores.length;
        this.familyData.little2.weeklyChores = little2Chores.length;
        
        this.parentScore.textContent = parentScore;
        this.little2Score.textContent = little2Score;
        
        // Update leaderboard order
        this.updateLeaderboard();
        this.saveFamilyData();
    }
    
    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        const parentItem = leaderboardList.children[0];
        const little2Item = leaderboardList.children[1];
        
        if (this.familyData.parent.score >= this.familyData.little2.score) {
            // Parent is winning
            parentItem.style.order = '1';
            little2Item.style.order = '2';
            parentItem.querySelector('.rank').textContent = '1st';
            little2Item.querySelector('.rank').textContent = '2nd';
        } else {
            // Little one is winning
            little2Item.style.order = '1';
            parentItem.style.order = '2';
            little2Item.querySelector('.rank').textContent = '1st';
            parentItem.querySelector('.rank').textContent = '2nd';
        }
    }
    
    updateWeeklyChallenge() {
        const currentPlayerData = this.familyData[this.currentPlayer];
        const progress = currentPlayerData.weeklyChores;
        const target = this.familyData.weeklyChallenge.target;
        
        const percentage = Math.min((progress / target) * 100, 100);
        this.challengeProgress.style.width = `${percentage}%`;
        this.challengeText.textContent = `${progress}/${target}`;
        
        if (progress >= target) {
            this.showNotification(`🎉 Weekly challenge completed! You're amazing!`, 'success');
        }
    }
    
    redeemReward(button) {
        const cost = parseInt(button.dataset.cost);
        const reward = button.dataset.reward;
        
        if (this.userData.points >= cost) {
            this.userData.points -= cost;
            this.userData.redeemedRewards.push({
                reward: reward,
                cost: cost,
                date: new Date().toISOString()
            });
            
            this.saveUserData();
            this.updateStats();
            this.updateRedeemButtons();
            this.showNotification(`Redeemed: ${reward}! Enjoy! 🎉`, 'success');
        } else {
            this.showNotification(`Not enough points! Need ${cost}, have ${this.userData.points}`, 'error');
        }
    }
    
    updateRedeemButtons() {
        this.redeemBtns.forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            btn.disabled = this.userData.points < cost;
        });
    }
    
    startGaming() {
        if (!this.isGaming) {
            this.isGaming = true;
            this.isPaused = false;
            this.gamingTimeLeft = 30 * 60; // Reset to 30 minutes
            
            this.startGamingBtn.disabled = true;
            this.pauseGamingBtn.disabled = false;
            this.stopGamingBtn.disabled = false;
            
            this.gamingTimerInterval = setInterval(() => {
                this.gamingTimeLeft--;
                this.updateGamingTimerDisplay();
                
                if (this.gamingTimeLeft <= 0) {
                    this.completeGamingSession();
                }
            }, 1000);
            
            this.showNotification('🎮 Gaming session started! Complete 30 minutes to earn 50 points!', 'success');
        }
    }
    
    pauseGaming() {
        if (this.isGaming && !this.isPaused) {
            this.isPaused = true;
            clearInterval(this.gamingTimerInterval);
            
            this.startGamingBtn.disabled = false;
            this.pauseGamingBtn.disabled = true;
            this.stopGamingBtn.disabled = false;
            
            this.showNotification('⏸️ Gaming session paused', 'warning');
        } else if (this.isGaming && this.isPaused) {
            this.isPaused = false;
            
            this.startGamingBtn.disabled = true;
            this.pauseGamingBtn.disabled = false;
            this.stopGamingBtn.disabled = false;
            
            this.gamingTimerInterval = setInterval(() => {
                this.gamingTimeLeft--;
                this.updateGamingTimerDisplay();
                
                if (this.gamingTimeLeft <= 0) {
                    this.completeGamingSession();
                }
            }, 1000);
            
            this.showNotification('▶️ Gaming session resumed', 'success');
        }
    }
    
    stopGaming() {
        if (this.isGaming) {
            this.isGaming = false;
            this.isPaused = false;
            clearInterval(this.gamingTimerInterval);
            
            this.startGamingBtn.disabled = false;
            this.pauseGamingBtn.disabled = true;
            this.stopGamingBtn.disabled = true;
            
            this.gamingTimeLeft = 30 * 60; // Reset to 30 minutes
            this.updateGamingTimerDisplay();
            
            this.showNotification('⏹️ Gaming session stopped', 'warning');
        }
    }
    
    completeGamingSession() {
        this.isGaming = false;
        this.isPaused = false;
        clearInterval(this.gamingTimerInterval);
        
        this.startGamingBtn.disabled = false;
        this.pauseGamingBtn.disabled = true;
        this.stopGamingBtn.disabled = true;
        
        // Award 50 points for completing 30 minutes of gaming
        this.awardPoints(50);
        
        // Update gaming statistics
        this.userData.gamingSessions++;
        this.userData.totalGamingTime += 30; // 30 minutes
        
        // Add gaming chore to the list
        const gamingChore = {
            id: Date.now(),
            text: '30 minutes of gaming',
            category: 'gaming',
            priority: 'medium',
            completed: true,
            player: this.currentPlayer,
            createdAt: new Date().toISOString()
        };
        this.chores.unshift(gamingChore);
        
        this.saveChores();
        this.saveUserData();
        this.updateGamingStats();
        this.updateStats();
        this.updateFamilyScores();
        
        this.gamingTimeLeft = 30 * 60; // Reset for next session
        this.updateGamingTimerDisplay();
        
        this.showNotification('🎉 Gaming session completed! You earned 50 points!', 'success');
    }
    
    updateGamingTimerDisplay() {
        const minutes = Math.floor(this.gamingTimeLeft / 60);
        const seconds = this.gamingTimeLeft % 60;
        this.gamingTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateGamingStats() {
        this.gamingSessions.textContent = this.userData.gamingSessions;
        
        const totalHours = Math.floor(this.userData.totalGamingTime / 60);
        const totalMinutes = this.userData.totalGamingTime % 60;
        this.totalGamingTime.textContent = `${totalHours}h ${totalMinutes}m`;
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            maxWidth: '300px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
        notification.style.backgroundColor = colors[type] || colors.success;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChoreTracker();
});
