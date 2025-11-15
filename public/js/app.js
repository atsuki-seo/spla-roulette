// API URLs
const API_URLS = {
    rule: 'https://stat.ink/api/v3/rule',
    stage: 'https://stat.ink/api/v3/stage',
    weapon: 'https://stat.ink/api/v3/weapon'
};

// Cache keys
const CACHE_KEYS = {
    rule: 'spla-rules',
    stage: 'spla-stages',
    weapon: 'spla-weapons',
    selectedItems: 'spla-selected-items'
};

// Data storage
let data = {
    rules: [],
    stages: [],
    weapons: []
};

// Excluded items
const EXCLUDED_ITEMS = {
    rule: ['tricolor'],
    stage: ['grand_arena']
};

// UI state - selected items for roulette (all selected by default)
let selectedItems = {
    rule: [],
    stage: [],
    weapon: []
};

let currentResults = {};
let currentTeams = {}; // { memberId: 'alpha' | 'bravo' }

// Cache key for section states
const SECTION_STATES_KEY = 'spla-section-states';
const FILTER_SECTION_STATE_KEY = 'spla-filter-section-state';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Set copyright year
    const currentYear = new Date().getFullYear();
    const copyrightElement = document.getElementById('copyright');
    if (copyrightElement) {
        copyrightElement.textContent = `©${currentYear} s_at_ki`;
    }

    // Load saved member count
    const savedMemberCount = localStorage.getItem('memberCount');
    if (savedMemberCount) {
        document.getElementById('memberCount').value = savedMemberCount;
    }

    initializeSectionToggle();
    initializeFilterSectionToggle();
    initializeMemberNames();

    // Load saved team division checkbox state
    const savedTeamDivisionState = localStorage.getItem('teamDivisionToggle');
    if (savedTeamDivisionState === 'true') {
        document.getElementById('teamDivisionToggle').checked = true;
    }

    initializeTeamDivisionCheckbox();
    document.getElementById('memberCount').addEventListener('change', () => {
        // Save member count
        localStorage.setItem('memberCount', document.getElementById('memberCount').value);
        initializeMemberNames();
        initializeResults();
    });
    loadDataFromCacheOrAPI();
});

// ========== Data Management ==========

/**
 * Load data from cache or API
 */
async function loadDataFromCacheOrAPI() {
    try {
        // Try loading from cache
        const cached = loadFromCache();

        if (cached.rules.length > 0 && cached.stages.length > 0 && cached.weapons.length > 0) {
            data = cached;
            initializeUI();
        } else {
            // Fetch from API
            await fetchAndCacheData();
            initializeUI();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        updateLoadingStatus('エラー: データを読み込めません');
    }
}

/**
 * Load data from localStorage cache
 */
function loadFromCache() {
    const cached = {
        rules: [],
        stages: [],
        weapons: []
    };

    const ruleCache = localStorage.getItem(CACHE_KEYS.rule);
    const stageCache = localStorage.getItem(CACHE_KEYS.stage);
    const weaponCache = localStorage.getItem(CACHE_KEYS.weapon);

    try {
        if (ruleCache) cached.rules = JSON.parse(ruleCache);
        if (stageCache) cached.stages = JSON.parse(stageCache);
        if (weaponCache) cached.weapons = JSON.parse(weaponCache);
    } catch (error) {
        console.error('Error parsing cached data:', error);
    }

    return cached;
}

/**
 * Fetch data from API and cache it
 */
async function fetchAndCacheData() {
    try {
        const [rulesData, stagesData, weaponsData] = await Promise.all([
            fetchFromAPI(API_URLS.rule),
            fetchFromAPI(API_URLS.stage),
            fetchFromAPI(API_URLS.weapon)
        ]);

        // Filter data and exclude specified items
        data.rules = rulesData.filter(item => !EXCLUDED_ITEMS.rule.includes(item.key));
        data.stages = stagesData.filter(item => !EXCLUDED_ITEMS.stage.includes(item.key));
        data.weapons = weaponsData;

        // Cache data
        localStorage.setItem(CACHE_KEYS.rule, JSON.stringify(data.rules));
        localStorage.setItem(CACHE_KEYS.stage, JSON.stringify(data.stages));
        localStorage.setItem(CACHE_KEYS.weapon, JSON.stringify(data.weapons));

    } catch (error) {
        console.error('Error fetching data from API:', error);
        throw error;
    }
}

/**
 * Fetch JSON from API
 */
async function fetchFromAPI(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
}

/**
 * Refresh data from API
 */
async function refreshData() {
    try {
        // Clear cache
        localStorage.removeItem(CACHE_KEYS.rule);
        localStorage.removeItem(CACHE_KEYS.stage);
        localStorage.removeItem(CACHE_KEYS.weapon);
        localStorage.removeItem(CACHE_KEYS.selectedItems);

        // Fetch new data
        await fetchAndCacheData();
        initializeUI();
    } catch (error) {
        console.error('Error refreshing data:', error);
        updateLoadingStatus('更新に失敗しました');
    }
}

/**
 * Save selected items to localStorage
 */
function saveSelectedItems() {
    try {
        localStorage.setItem(CACHE_KEYS.selectedItems, JSON.stringify(selectedItems));
    } catch (error) {
        console.error('Error saving selected items:', error);
    }
}

/**
 * Load selected items from localStorage
 */
function loadSelectedItems() {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.selectedItems);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (error) {
        console.error('Error loading selected items:', error);
    }
    return null;
}

/**
 * Initialize section toggle functionality
 */
function initializeSectionToggle() {
    // Load saved section states
    const savedStates = loadSectionStates();

    // Set up click handlers for all section headers
    document.querySelectorAll('.section-header').forEach(header => {
        const section = header.closest('.section');
        const sectionId = section.getAttribute('data-section');

        // Set initial collapsed state
        if (savedStates && savedStates[sectionId] === false) {
            section.classList.add('collapsed');
        } else if (!savedStates && sectionId === 'controlsSection') {
            // If no saved states and this is controlsSection, collapse it by default
            section.classList.add('collapsed');
        }

        // Add click handler to toggle section
        header.addEventListener('click', () => {
            section.classList.toggle('collapsed');
            saveSectionStates();
        });
    });
}

/**
 * Load section states from localStorage
 */
function loadSectionStates() {
    try {
        const saved = localStorage.getItem(SECTION_STATES_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading section states:', error);
    }
    return null;
}

/**
 * Save section states to localStorage
 */
function saveSectionStates() {
    try {
        const states = {};
        document.querySelectorAll('.section[data-section]').forEach(section => {
            const sectionId = section.getAttribute('data-section');
            states[sectionId] = !section.classList.contains('collapsed');
        });
        localStorage.setItem(SECTION_STATES_KEY, JSON.stringify(states));
    } catch (error) {
        console.error('Error saving section states:', error);
    }
}

/**
 * Initialize filter section toggle functionality
 */
function initializeFilterSectionToggle() {
    // Load saved filter section state
    const savedState = loadFilterSectionState();

    const filterHeader = document.querySelector('.filter-section-header');
    if (!filterHeader) return;

    // Set initial collapsed state
    if (savedState === false) {
        filterHeader.classList.add('collapsed');
    }

    // Add click handler to toggle filter section
    filterHeader.addEventListener('click', () => {
        filterHeader.classList.toggle('collapsed');
        saveFilterSectionState();
    });
}

/**
 * Load filter section state from localStorage
 */
function loadFilterSectionState() {
    try {
        const saved = localStorage.getItem(FILTER_SECTION_STATE_KEY);
        if (saved !== null) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading filter section state:', error);
    }
    return true; // Default to expanded
}

/**
 * Save filter section state to localStorage
 */
function saveFilterSectionState() {
    try {
        const filterHeader = document.querySelector('.filter-section-header');
        const isExpanded = !filterHeader.classList.contains('collapsed');
        localStorage.setItem(FILTER_SECTION_STATE_KEY, JSON.stringify(isExpanded));
    } catch (error) {
        console.error('Error saving filter section state:', error);
    }
}

/**
 * Apply team division checkbox state
 */
function applyTeamDivisionState(isChecked) {
    const teamDivisionOnlyBtn = document.getElementById('teamDivisionOnlyBtn');

    if (isChecked) {
        // Execute team division
        divideTeams();
        // Update result cards with team information
        updateResultCardsTeamColor();
        // Show team division only button
        if (teamDivisionOnlyBtn) {
            teamDivisionOnlyBtn.style.display = '';
        }
    } else {
        // Clear team information
        currentTeams = {};
        // Update result cards to remove team colors
        updateResultCardsTeamColor();
        // Hide team division only button
        if (teamDivisionOnlyBtn) {
            teamDivisionOnlyBtn.style.display = 'none';
        }
    }
}

/**
 * Initialize team division checkbox functionality
 */
function initializeTeamDivisionCheckbox() {
    const checkbox = document.getElementById('teamDivisionToggle');
    if (!checkbox) return;

    // Apply initial state if checkbox is already checked
    if (checkbox.checked) {
        applyTeamDivisionState(true);
    }

    // Add change handler to checkbox
    checkbox.addEventListener('change', () => {
        // Save team division state to localStorage
        localStorage.setItem('teamDivisionToggle', checkbox.checked.toString());

        // Apply the state change
        applyTeamDivisionState(checkbox.checked);
    });
}

// ========== UI Initialization ==========

/**
 * Initialize member name inputs
 */
function initializeMemberNames() {
    const memberCount = parseInt(document.getElementById('memberCount').value);
    const container = document.getElementById('memberNames');
    container.innerHTML = '';

    for (let i = 1; i <= memberCount; i++) {
        const group = document.createElement('div');
        group.className = 'member-input-group';

        const label = document.createElement('label');
        label.htmlFor = `memberName${i}`;
        label.textContent = `メンバー${i}`;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `memberName${i}`;
        input.className = 'member-input';
        input.placeholder = `メンバー${i}`;
        input.value = localStorage.getItem(`memberName${i}`) || `メンバー${i}`;

        input.addEventListener('blur', () => {
            localStorage.setItem(`memberName${i}`, input.value);
        });

        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);
    }
}

/**
 * Initialize filters and result display
 */
function initializeUI() {
    initializeFilters();
    initializeResults();
}

/**
 * Initialize filter checkboxes
 */
function initializeFilters() {
    // Initialize selectedItems with all items by default
    selectedItems.rule = data.rules.map(item => item.key);
    selectedItems.stage = data.stages.map(item => item.key);
    selectedItems.weapon = data.weapons.map(item => item.key);

    // Load cached selections and apply them
    const cachedSelections = loadSelectedItems();
    if (cachedSelections) {
        // Only apply cached selections that exist in current data
        selectedItems.rule = selectedItems.rule.filter(key =>
            cachedSelections.rule.includes(key)
        );
        selectedItems.stage = selectedItems.stage.filter(key =>
            cachedSelections.stage.includes(key)
        );
        selectedItems.weapon = selectedItems.weapon.filter(key =>
            cachedSelections.weapon.includes(key)
        );
    }

    createFilterList('rule', data.rules);
    createFilterList('stage', data.stages);
    createFilterList('weapon', data.weapons);
}

/**
 * Create filter list for given type
 */
function createFilterList(type, items) {
    const container = document.getElementById(`${type}Filter`);
    container.innerHTML = '';

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'filter-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${type}-${item.key}`;
        checkbox.checked = selectedItems[type].includes(item.key);

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!selectedItems[type].includes(item.key)) {
                    selectedItems[type].push(item.key);
                }
            } else {
                selectedItems[type] = selectedItems[type].filter(key => key !== item.key);
            }
            saveSelectedItems();
        });

        const label = document.createElement('label');
        label.htmlFor = `${type}-${item.key}`;
        label.textContent = getItemName(type, item);

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);
        container.appendChild(itemDiv);
    });
}

/**
 * Initialize empty results display
 */
function initializeResults() {
    const memberCount = parseInt(document.getElementById('memberCount').value);
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    // Initialize common results (rule and stage)
    const commonRuleElement = document.getElementById('commonRule');
    const commonStageElement = document.getElementById('commonStage');
    if (commonRuleElement) commonRuleElement.textContent = '-';
    if (commonStageElement) commonStageElement.textContent = '-';

    // Initialize member-specific results (weapons only)
    for (let i = 1; i <= memberCount; i++) {
        const memberName = document.getElementById(`memberName${i}`).value;
        const card = document.createElement('div');
        card.className = 'result-card';
        card.id = `result-${i}`;

        // Get team info if available
        const teamInfo = currentTeams[i];
        const teamClass = teamInfo ? (teamInfo === 'alpha' ? 'alpha-team' : 'bravo-team') : '';
        if (teamClass) {
            card.classList.add(teamClass);
        }

        let teamHTML = '';
        if (teamInfo) {
            const teamName = teamInfo === 'alpha' ? 'アルファグループ' : 'ブラボーグループ';
            teamHTML = `<div class="result-team-label">${teamName}</div>`;
        }

        card.innerHTML = `
            <h3>${memberName}</h3>
            ${teamHTML}
            <div class="result-item">
                <div class="result-label">ブキ</div>
                <div class="result-value result-weapon">-</div>
            </div>
        `;

        container.appendChild(card);
    }
}

// ========== Roulette Logic ==========

/**
 * Get available items (excluding selected items)
 */
function getAvailableItems(type) {
    const itemsMap = {
        rule: data.rules,
        stage: data.stages,
        weapon: data.weapons
    };

    const items = itemsMap[type] || [];
    // If no items selected, default to all items
    if (selectedItems[type].length === 0) {
        return items;
    }
    return items.filter(item => selectedItems[type].includes(item.key));
}

/**
 * Get Japanese name for item
 */
function getItemName(type, item) {
    // Try to get Japanese name first, fallback to name
    if (item.name && item.name['ja_JP']) {
        return item.name['ja_JP'];
    } else if (item.name && typeof item.name === 'object') {
        // If name is an object, find any string value
        for (const key in item.name) {
            if (typeof item.name[key] === 'string') {
                return item.name[key];
            }
        }
    } else if (typeof item.name === 'string') {
        return item.name;
    }
    return item.key || 'Unknown';
}

/**
 * Select random item
 */
function selectRandomItem(items) {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * Run roulette for specific type
 */
function runRoulette(type) {
    const memberCount = parseInt(document.getElementById('memberCount').value);
    const availableItems = getAvailableItems(type);

    if (availableItems.length === 0) {
        alert(`利用可能な${getTypeName(type)}がありません`);
        return;
    }

    if (type === 'rule' || type === 'stage') {
        // For rule and stage, use common result display (single item)
        const item = selectRandomItem(availableItems);
        const resultElementId = type === 'rule' ? 'commonRule' : 'commonStage';
        const resultElement = document.getElementById(resultElementId);

        if (resultElement) {
            resultElement.classList.remove('spinning');
            setTimeout(() => {
                resultElement.classList.add('spinning');
                resultElement.textContent = getItemName(type, item);
                currentResults[`common-${type}`] = item;
            }, 10);
        }
    } else {
        // For weapons, show individual results for each member
        for (let i = 1; i <= memberCount; i++) {
            const item = selectRandomItem(availableItems);
            const resultElement = document.querySelector(`#result-${i} .result-${type}`);

            if (resultElement) {
                // Add animation
                resultElement.classList.remove('spinning');
                setTimeout(() => {
                    resultElement.classList.add('spinning');
                    resultElement.textContent = getItemName(type, item);
                    currentResults[`${i}-${type}`] = item;
                }, 10);
            }
        }
    }
}

/**
 * Run all roulettes
 */
function runAllRoulette() {
    runRoulette('rule');
    runRoulette('stage');
    runRoulette('weapon');
}

/**
 * Run rule roulette only
 */
function runRuleRoulette() {
    runRoulette('rule');
}

/**
 * Run stage roulette only
 */
function runStageRoulette() {
    runRoulette('stage');
}

/**
 * Run weapon roulette only
 */
function runWeaponRoulette() {
    runRoulette('weapon');
}

// ========== Team Division ==========

/**
 * Divide members into two teams randomly
 */
function divideTeams() {
    const memberCount = parseInt(document.getElementById('memberCount').value);

    // Get member names
    const members = [];
    for (let i = 1; i <= memberCount; i++) {
        const memberName = document.getElementById(`memberName${i}`).value;
        members.push(memberName);
    }

    // Shuffle members
    const shuffledMembers = shuffleArray(members);

    // Calculate team sizes
    const alphaSize = Math.ceil(memberCount / 2);

    // Divide into teams
    const alphaTeam = shuffledMembers.slice(0, alphaSize);
    const bravoTeam = shuffledMembers.slice(alphaSize);

    // Display results
    displayTeamResults(alphaTeam, bravoTeam);
    // Update result cards with team information
    updateResultCardsTeamColor();
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Update result cards with team color and information
 */
function updateResultCardsTeamColor() {
    const memberCount = parseInt(document.getElementById('memberCount').value);

    for (let i = 1; i <= memberCount; i++) {
        const card = document.getElementById(`result-${i}`);
        if (!card) continue;

        // Remove previous team classes
        card.classList.remove('alpha-team', 'bravo-team');

        // Remove old team label if exists
        const oldTeamLabel = card.querySelector('.result-team-label');
        if (oldTeamLabel) {
            oldTeamLabel.remove();
        }

        // Add new team class and label if team assigned
        const teamInfo = currentTeams[i];
        if (teamInfo) {
            const teamClass = teamInfo === 'alpha' ? 'alpha-team' : 'bravo-team';
            card.classList.add(teamClass);

            const teamName = teamInfo === 'alpha' ? 'アルファグループ' : 'ブラボーグループ';
            const teamLabel = document.createElement('div');
            teamLabel.className = 'result-team-label';
            teamLabel.textContent = teamName;

            // Insert after h3
            const h3 = card.querySelector('h3');
            h3.insertAdjacentElement('afterend', teamLabel);
        }
    }
}

/**
 * Display team division results
 */
function displayTeamResults(alphaTeam, bravoTeam) {
    // Store team information in currentTeams object
    // First, get the member IDs for each team member
    const memberCount = parseInt(document.getElementById('memberCount').value);
    const memberNames = [];
    for (let i = 1; i <= memberCount; i++) {
        memberNames[i] = document.getElementById(`memberName${i}`).value;
    }

    // Clear previous team data
    currentTeams = {};

    // Assign alpha team
    alphaTeam.forEach(memberName => {
        for (let i = 1; i <= memberCount; i++) {
            if (memberNames[i] === memberName) {
                currentTeams[i] = 'alpha';
                break;
            }
        }
    });

    // Assign bravo team
    bravoTeam.forEach(memberName => {
        for (let i = 1; i <= memberCount; i++) {
            if (memberNames[i] === memberName) {
                currentTeams[i] = 'bravo';
                break;
            }
        }
    });
}

// ========== Utility Functions ==========

/**
 * Get Japanese name for type
 */
function getTypeName(type) {
    const typeNames = {
        rule: 'ルール',
        stage: 'ステージ',
        weapon: 'ブキ'
    };
    return typeNames[type] || type;
}

/**
 * Update loading status message
 */
function updateLoadingStatus(message) {
    const statusElement = document.getElementById('loadingStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}
