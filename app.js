/* =============================================
   ELLECTRA STOCK MANAGEMENT - APP.JS
   Firebase Integration + Full Logic
   ============================================= */

// ============ FIREBASE CONFIG ============

// Stock Update Firebase (Primary - for stock data)
const stockFirebaseConfig = {
    apiKey: "AIzaSyBVhppz4Mza-ZRyb3WSoBg02wQE5hSAd2Y",
    authDomain: "stock-updatde.firebaseapp.com",
    databaseURL: "https://stock-updatde-default-rtdb.firebaseio.com",
    projectId: "stock-updatde",
    storageBucket: "stock-updatde.firebasestorage.app",
    messagingSenderId: "151153361639",
    appId: "1:151153361639:web:85e152c12a39ca123e1842"
};

// Ellectra Firebase (Secondary - for component list)
const ellectraFirebaseConfig = {
    apiKey: "AIzaSyAJm0fEDPItyL6nBMWzWGQnSAjreDlCOpQ",
    authDomain: "ellectra-2b95d.firebaseapp.com",
    projectId: "ellectra-2b95d",
    storageBucket: "ellectra-2b95d.firebasestorage.app",
    messagingSenderId: "164410965069",
    appId: "1:164410965069:web:b86f8fd714f84c27e3f004"
};

// Initialize Firebase Apps
const stockApp = firebase.initializeApp(stockFirebaseConfig, "stockApp");
const ellectraApp = firebase.initializeApp(ellectraFirebaseConfig, "ellectraApp");

// Database references
const stockDB = firebase.database(stockApp);
const ellectraFirestore = firebase.firestore(ellectraApp);

// Database paths
const inventoryRef = stockDB.ref("inventory");
const transfersRef = stockDB.ref("transfers");
const activityRef = stockDB.ref("activity");

// ============ APP STATE ============
let appState = {
    inventory: {},
    transfers: [],
    activities: [],
    currentPage: 'dashboard',
    selectedComponents: []
};

// ============ SPLASH SCREEN ============
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        const mainApp = document.getElementById('mainApp');
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.style.display = 'none';
            mainApp.classList.remove('hidden');
            initApp();
        }, 500);
    }, 2500);
});

// ============ INITIALIZATION ============
function initApp() {
    setupNavigation();
    setupSidebar();
    setupModal();
    setupForms();
    setupSearch();
    setupExports();
    loadDataFromFirebase();
    listenForRealtimeUpdates();
}

// ============ NAVIGATION ============
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const activePage = document.getElementById(`page-${page}`);
    if (activePage) activePage.classList.add('active');

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        inventory: 'Main Inventory',
        girish: 'Girish - Stock',
        santa: 'Santa - Stock',
        iyappan: 'Iyappan - Stock',
        components: 'Component List (Ellectra)',
        transfer: 'Transfer Stock',
        reports: 'Reports & Analytics'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    appState.currentPage = page;

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('mobile-open');

    // Refresh page data
    refreshPageData(page);
}

function refreshPageData(page) {
    switch (page) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'inventory':
            renderInventoryTable();
            break;
        case 'girish':
        case 'santa':
        case 'iyappan':
            renderPersonTable(page);
            break;
        case 'components':
            // Components fetched on button click
            break;
        case 'transfer':
            populateTransferDropdowns();
            renderTransferHistory();
            break;
        case 'reports':
            renderReports();
            break;
    }
}

// ============ SIDEBAR ============
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const mobileToggle = document.getElementById('mobileSidebarToggle');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && e.target !== mobileToggle) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });
}

// ============ MODAL ============
function setupModal() {
    const modal = document.getElementById('componentModal');
    const closeBtn = document.getElementById('closeModal');
    const overlay = modal.querySelector('.modal-overlay');
    const addBtn = document.getElementById('addComponentBtn');

    addBtn.addEventListener('click', () => {
        openModal();
    });

    closeBtn.addEventListener('click', () => {
        closeModal();
    });

    overlay.addEventListener('click', () => {
        closeModal();
    });
}

function openModal(componentId = null) {
    const modal = document.getElementById('componentModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('componentForm');

    if (componentId && appState.inventory[componentId]) {
        const comp = appState.inventory[componentId];
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Component';
        document.getElementById('componentId').value = componentId;
        document.getElementById('componentName').value = comp.name || '';
        document.getElementById('componentCategory').value = comp.category || '';
        document.getElementById('componentDesc').value = comp.description || '';
        document.getElementById('warehouseQty').value = comp.warehouse || 0;
        document.getElementById('minStock').value = comp.minStock || 5;
        document.getElementById('girishQty').value = comp.girish || 0;
        document.getElementById('santaQty').value = comp.santa || 0;
        document.getElementById('iyappanQty').value = comp.iyappan || 0;
    } else {
        title.innerHTML = '<i class="fas fa-plus"></i> Add Component';
        form.reset();
        document.getElementById('componentId').value = '';
        document.getElementById('warehouseQty').value = 0;
        document.getElementById('minStock').value = 5;
        document.getElementById('girishQty').value = 0;
        document.getElementById('santaQty').value = 0;
        document.getElementById('iyappanQty').value = 0;
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('componentModal').classList.remove('active');
}

// ============ FORMS ============
function setupForms() {
    // Component Form
    document.getElementById('componentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveComponent();
    });

    // Transfer Form
    document.getElementById('transferForm').addEventListener('submit', (e) => {
        e.preventDefault();
        processTransfer();
    });

    // Import from Ellectra
    document.getElementById('importComponentsBtn').addEventListener('click', () => {
        navigateTo('components');
        fetchEllectraComponents();
    });

    // Fetch Ellectra Components
    document.getElementById('fetchEllectraBtn').addEventListener('click', fetchEllectraComponents);

    // Add Selected to Stock
    document.getElementById('addToStockBtn').addEventListener('click', addSelectedToStock);

    // Select All Checkbox
    document.getElementById('selectAllComponents').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('#ellectraComponentsTable input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    // Refresh Button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadDataFromFirebase();
        showToast('Data refreshed!', 'success');
    });

    // Category Filter
    document.getElementById('categoryFilter').addEventListener('change', renderInventoryTable);

    // Transfer source change - update available quantity
    document.getElementById('transferFrom').addEventListener('change', updateAvailableQty);
    document.getElementById('transferComponent').addEventListener('change', updateAvailableQty);
}

// ============ FIREBASE DATA OPERATIONS ============

function loadDataFromFirebase() {
    updateSyncStatus('loading');

    // Load inventory
    inventoryRef.once('value')
        .then(snapshot => {
            appState.inventory = snapshot.val() || {};
            updateDashboard();
            renderInventoryTable();
            updateSyncStatus('synced');
        })
        .catch(err => {
            console.error('Error loading inventory:', err);
            updateSyncStatus('error');
            showToast('Failed to load inventory data', 'error');
        });

    // Load transfers
    transfersRef.orderByChild('timestamp').limitToLast(50).once('value')
        .then(snapshot => {
            appState.transfers = [];
            snapshot.forEach(child => {
                appState.transfers.unshift({ id: child.key, ...child.val() });
            });
            renderTransferHistory();
        })
        .catch(err => console.error('Error loading transfers:', err));

    // Load activities
    activityRef.orderByChild('timestamp').limitToLast(20).once('value')
        .then(snapshot => {
            appState.activities = [];
            snapshot.forEach(child => {
                appState.activities.unshift({ id: child.key, ...child.val() });
            });
            renderActivityList();
        })
        .catch(err => console.error('Error loading activities:', err));
}

function listenForRealtimeUpdates() {
    inventoryRef.on('value', (snapshot) => {
        appState.inventory = snapshot.val() || {};
        updateDashboard();

        if (appState.currentPage === 'inventory') renderInventoryTable();
        if (['girish', 'santa', 'iyappan'].includes(appState.currentPage)) {
            renderPersonTable(appState.currentPage);
        }
        if (appState.currentPage === 'reports') renderReports();
    });

    activityRef.orderByChild('timestamp').limitToLast(20).on('value', (snapshot) => {
        appState.activities = [];
        snapshot.forEach(child => {
            appState.activities.unshift({ id: child.key, ...child.val() });
        });
        renderActivityList();
    });

    transfersRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        appState.transfers = [];
        snapshot.forEach(child => {
            appState.transfers.unshift({ id: child.key, ...child.val() });
        });
        if (appState.currentPage === 'transfer') renderTransferHistory();
    });
}

// ============ SAVE COMPONENT ============
function saveComponent() {
    const id = document.getElementById('componentId').value;
    const name = document.getElementById('componentName').value.trim();
    const category = document.getElementById('componentCategory').value;
    const description = document.getElementById('componentDesc').value.trim();
    const warehouse = parseInt(document.getElementById('warehouseQty').value) || 0;
    const minStock = parseInt(document.getElementById('minStock').value) || 5;
    const girish = parseInt(document.getElementById('girishQty').value) || 0;
    const santa = parseInt(document.getElementById('santaQty').value) || 0;
    const iyappan = parseInt(document.getElementById('iyappanQty').value) || 0;

    if (!name || !category) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    const totalStock = warehouse + girish + santa + iyappan;

    const componentData = {
        name,
        category,
        description,
        warehouse,
        girish,
        santa,
        iyappan,
        totalStock,
        minStock,
        updatedAt: Date.now()
    };

    let ref;
    let isNew = false;

    if (id) {
        ref = inventoryRef.child(id);
    } else {
        ref = inventoryRef.push();
        componentData.createdAt = Date.now();
        isNew = true;
    }

    ref.set(componentData)
        .then(() => {
            closeModal();
            showToast(isNew ? 'Component added successfully!' : 'Component updated!', 'success');
            logActivity(isNew ? 'add' : 'edit', `${isNew ? 'Added' : 'Updated'} "${name}" in inventory`);
        })
        .catch(err => {
            console.error('Save error:', err);
            showToast('Failed to save component', 'error');
        });
}

// ============ DELETE COMPONENT ============
function deleteComponent(id) {
    const comp = appState.inventory[id];
    if (!comp) return;

    if (confirm(`Are you sure you want to delete "${comp.name}"?`)) {
        inventoryRef.child(id).remove()
            .then(() => {
                showToast(`"${comp.name}" deleted`, 'success');
                logActivity('delete', `Deleted "${comp.name}" from inventory`);
            })
            .catch(err => {
                console.error('Delete error:', err);
                showToast('Failed to delete component', 'error');
            });
    }
}

// ============ TRANSFER STOCK ============
function processTransfer() {
    const componentId = document.getElementById('transferComponent').value;
    const from = document.getElementById('transferFrom').value;
    const to = document.getElementById('transferTo').value;
    const qty = parseInt(document.getElementById('transferQty').value) || 0;
    const notes = document.getElementById('transferNotes').value.trim();

    if (!componentId || !from || !to || qty <= 0) {
        showToast('Please fill in all fields correctly', 'warning');
        return;
    }

    if (from === to) {
        showToast('Source and destination cannot be the same', 'warning');
        return;
    }

    const comp = appState.inventory[componentId];
    if (!comp) {
        showToast('Component not found', 'error');
        return;
    }

    const available = comp[from] || 0;
    if (qty > available) {
        showToast(`Insufficient stock! Available: ${available}`, 'error');
        return;
    }

    // Update stock
    const updates = {};
    updates[`${componentId}/${from}`] = available - qty;
    updates[`${componentId}/${to}`] = (comp[to] || 0) + qty;

    // Recalculate total
    const newWarehouse = from === 'warehouse' ? available - qty : (to === 'warehouse' ? (comp.warehouse || 0) + qty : (comp.warehouse || 0));
    const newGirish = from === 'girish' ? available - qty : (to === 'girish' ? (comp.girish || 0) + qty : (comp.girish || 0));
    const newSanta = from === 'santa' ? available - qty : (to === 'santa' ? (comp.santa || 0) + qty : (comp.santa || 0));
    const newIyappan = from === 'iyappan' ? available - qty : (to === 'iyappan' ? (comp.iyappan || 0) + qty : (comp.iyappan || 0));

    updates[`${componentId}/totalStock`] = newWarehouse + newGirish + newSanta + newIyappan;
    updates[`${componentId}/updatedAt`] = Date.now();

    inventoryRef.update(updates)
        .then(() => {
            // Log transfer
            const transferData = {
                componentId,
                componentName: comp.name,
                from: capitalizeFirst(from),
                to: capitalizeFirst(to),
                quantity: qty,
                notes,
                timestamp: Date.now()
            };

            transfersRef.push(transferData);
            logActivity('transfer', `Transferred ${qty}x "${comp.name}" from ${capitalizeFirst(from)} to ${capitalizeFirst(to)}`);

            showToast(`Transferred ${qty}x ${comp.name}`, 'success');
            document.getElementById('transferForm').reset();
            document.getElementById('availableQty').textContent = '0';
        })
        .catch(err => {
            console.error('Transfer error:', err);
            showToast('Transfer failed', 'error');
        });
}

function updateAvailableQty() {
    const componentId = document.getElementById('transferComponent').value;
    const from = document.getElementById('transferFrom').value;

    if (componentId && from && appState.inventory[componentId]) {
        const qty = appState.inventory[componentId][from] || 0;
        document.getElementById('availableQty').textContent = qty;
    } else {
        document.getElementById('availableQty').textContent = '0';
    }
}

// ============ FETCH ELLECTRA COMPONENTS ============
async function fetchEllectraComponents() {
    showToast('Fetching components from Ellectra DB...', 'info');

    try {
        // Try fetching from Firestore collections - try common collection names
        const collections = ['components', 'parts', 'items', 'products', 'inventory', 'stock'];
        let allComponents = [];

        for (const collName of collections) {
            try {
                const snapshot = await ellectraFirestore.collection(collName).get();
                if (!snapshot.empty) {
                    snapshot.forEach(doc => {
                        allComponents.push({
                            id: doc.id,
                            collection: collName,
                            ...doc.data()
                        });
                    });
                }
            } catch (e) {
                // Collection might not exist, skip
            }
        }

        if (allComponents.length === 0) {
            // If no data found, show sample data from Ellectra
            allComponents = generateSampleEllectraComponents();
            showToast('No collections found in Ellectra DB. Showing sample components. Add your data to Firestore.', 'warning');
        } else {
            showToast(`Found ${allComponents.length} components!`, 'success');
        }

        renderEllectraComponents(allComponents);
    } catch (err) {
        console.error('Ellectra fetch error:', err);
        // Show sample components as fallback
        const sampleComponents = generateSampleEllectraComponents();
        renderEllectraComponents(sampleComponents);
        showToast('Using sample component list. Configure Ellectra Firestore for live data.', 'warning');
    }
}

function generateSampleEllectraComponents() {
    return [
        { id: 'c1', name: '10K Resistor', description: '10K Ohm 1/4W', category: 'Resistors' },
        { id: 'c2', name: '100K Resistor', description: '100K Ohm 1/4W', category: 'Resistors' },
        { id: 'c3', name: '1K Resistor', description: '1K Ohm 1/4W', category: 'Resistors' },
        { id: 'c4', name: '470R Resistor', description: '470 Ohm 1/4W', category: 'Resistors' },
        { id: 'c5', name: '100uF Capacitor', description: '100uF 25V Electrolytic', category: 'Capacitors' },
        { id: 'c6', name: '10uF Capacitor', description: '10uF 50V Electrolytic', category: 'Capacitors' },
        { id: 'c7', name: '0.1uF Capacitor', description: '100nF Ceramic', category: 'Capacitors' },
        { id: 'c8', name: 'Arduino Nano', description: 'ATmega328P Dev Board', category: 'Modules' },
        { id: 'c9', name: 'ESP32', description: 'WiFi+BT Module', category: 'Modules' },
        { id: 'c10', name: 'ESP8266', description: 'NodeMCU WiFi Module', category: 'Modules' },
        { id: 'c11', name: 'NE555 Timer', description: 'Timer IC DIP-8', category: 'ICs' },
        { id: 'c12', name: 'LM7805', description: '5V Voltage Regulator', category: 'ICs' },
        { id: 'c13', name: 'ATmega328P', description: 'Microcontroller DIP-28', category: 'ICs' },
        { id: 'c14', name: 'LM358', description: 'Dual Op-Amp DIP-8', category: 'ICs' },
        { id: 'c15', name: 'Red LED 5mm', description: '5mm Red LED', category: 'LEDs' },
        { id: 'c16', name: 'Green LED 5mm', description: '5mm Green LED', category: 'LEDs' },
        { id: 'c17', name: 'Blue LED 5mm', description: '5mm Blue LED', category: 'LEDs' },
        { id: 'c18', name: 'White LED 5mm', description: '5mm White LED', category: 'LEDs' },
        { id: 'c19', name: 'BC547', description: 'NPN Transistor', category: 'Transistors' },
        { id: 'c20', name: 'BC557', description: 'PNP Transistor', category: 'Transistors' },
        { id: 'c21', name: 'IRF540N', description: 'N-Channel MOSFET', category: 'Transistors' },
        { id: 'c22', name: '1N4007', description: 'Rectifier Diode', category: 'Diodes' },
        { id: 'c23', name: '1N4148', description: 'Signal Diode', category: 'Diodes' },
        { id: 'c24', name: '5.1V Zener', description: '5.1V Zener Diode', category: 'Diodes' },
        { id: 'c25', name: 'DHT11', description: 'Temperature & Humidity Sensor', category: 'Sensors' },
        { id: 'c26', name: 'HC-SR04', description: 'Ultrasonic Distance Sensor', category: 'Sensors' },
        { id: 'c27', name: 'IR Sensor', description: 'IR Obstacle Sensor Module', category: 'Sensors' },
        { id: 'c28', name: 'LDR', description: 'Light Dependent Resistor', category: 'Sensors' },
        { id: 'c29', name: '2-Pin JST', description: '2-Pin JST Connector', category: 'Connectors' },
        { id: 'c30', name: 'USB Type-C', description: 'USB-C Breakout Board', category: 'Connectors' },
        { id: 'c31', name: 'Relay Module', description: '5V 1-Channel Relay Module', category: 'Modules' },
        { id: 'c32', name: 'Motor Driver L298N', description: 'Dual H-Bridge Motor Driver', category: 'Modules' },
    ];
}

function renderEllectraComponents(components) {
    const tbody = document.getElementById('ellectraComponentsTable');
    tbody.innerHTML = '';

    if (components.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-microchip"></i>
                        <h4>No components found</h4>
                        <p>Add components to your Ellectra Firestore database</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    components.forEach(comp => {
        const inStock = isComponentInStock(comp.name);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" data-id="${comp.id}" data-name="${comp.name || ''}" data-desc="${comp.description || ''}" data-category="${comp.category || 'Others'}"></td>
            <td><strong style="color: var(--text-primary)">${comp.name || 'Unknown'}</strong></td>
            <td>${comp.description || '-'}</td>
            <td><span class="status-badge in-stock">${comp.category || 'Others'}</span></td>
            <td>${inStock ? '<span class="status-badge in-stock"><i class="fas fa-check"></i> Yes</span>' : '<span class="status-badge out-of-stock"><i class="fas fa-xmark"></i> No</span>'}</td>
            <td>
                <button class="action-btn add" onclick="quickAddComponent('${escapeHtml(comp.name || '')}', '${escapeHtml(comp.description || '')}', '${escapeHtml(comp.category || 'Others')}')" title="Quick Add">
                    <i class="fas fa-plus"></i>
                </button>
            </td>`;
        tbody.appendChild(tr);
    });
}

function isComponentInStock(name) {
    return Object.values(appState.inventory).some(c =>
        c.name && c.name.toLowerCase() === name.toLowerCase()
    );
}

function quickAddComponent(name, description, category) {
    if (isComponentInStock(name)) {
        showToast(`"${name}" already exists in stock!`, 'warning');
        return;
    }

    const componentData = {
        name,
        category,
        description,
        warehouse: 0,
        girish: 0,
        santa: 0,
        iyappan: 0,
        totalStock: 0,
        minStock: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    inventoryRef.push(componentData)
        .then(() => {
            showToast(`"${name}" added to stock!`, 'success');
            logActivity('add', `Added "${name}" from Ellectra components`);
            fetchEllectraComponents(); // Refresh the list
        })
        .catch(err => {
            showToast('Failed to add component', 'error');
        });
}

function addSelectedToStock() {
    const checkboxes = document.querySelectorAll('#ellectraComponentsTable input[type="checkbox"]:checked');

    if (checkboxes.length === 0) {
        showToast('No components selected', 'warning');
        return;
    }

    let addedCount = 0;
    let skippedCount = 0;
    const promises = [];

    checkboxes.forEach(cb => {
        const name = cb.dataset.name;
        const description = cb.dataset.desc;
        const category = cb.dataset.category;

        if (isComponentInStock(name)) {
            skippedCount++;
            return;
        }

        const componentData = {
            name,
            category,
            description,
            warehouse: 0,
            girish: 0,
            santa: 0,
            iyappan: 0,
            totalStock: 0,
            minStock: 5,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        promises.push(
            inventoryRef.push(componentData).then(() => {
                addedCount++;
            })
        );
    });

    Promise.all(promises).then(() => {
        let msg = `Added ${addedCount} components to stock.`;
        if (skippedCount > 0) msg += ` Skipped ${skippedCount} (already exists).`;
        showToast(msg, 'success');
        logActivity('add', `Bulk added ${addedCount} components from Ellectra`);
        document.getElementById('selectAllComponents').checked = false;
        fetchEllectraComponents();
    });
}

// ============ RENDER FUNCTIONS ============

function updateDashboard() {
    const inventory = appState.inventory;
    const items = Object.values(inventory);

    // Stats
    const totalComponents = items.length;
    const totalStock = items.reduce((sum, c) => sum + (c.totalStock || 0), 0);
    const lowStockItems = items.filter(c => (c.totalStock || 0) <= (c.minStock || 5));

    document.getElementById('totalComponents').textContent = totalComponents;
    document.getElementById('totalStock').textContent = totalStock.toLocaleString();
    document.getElementById('lowStock').textContent = lowStockItems.length;

    // Notification badge
    document.getElementById('notifBadge').textContent = lowStockItems.length;

    // Team bars
    const girishTotal = items.reduce((sum, c) => sum + (c.girish || 0), 0);
    const santaTotal = items.reduce((sum, c) => sum + (c.santa || 0), 0);
    const iyappanTotal = items.reduce((sum, c) => sum + (c.iyappan || 0), 0);
    const warehouseTotal = items.reduce((sum, c) => sum + (c.warehouse || 0), 0);

    const maxTeamStock = Math.max(girishTotal, santaTotal, iyappanTotal, warehouseTotal, 1);

    document.getElementById('teamBars').innerHTML = `
        <div class="team-bar-item">
            <span class="team-bar-label">Warehouse</span>
            <div class="team-bar-track">
                <div class="team-bar-fill warehouse" style="width: ${(warehouseTotal / maxTeamStock * 100)}%">${warehouseTotal}</div>
            </div>
        </div>
        <div class="team-bar-item">
            <span class="team-bar-label">Girish</span>
            <div class="team-bar-track">
                <div class="team-bar-fill girish" style="width: ${(girishTotal / maxTeamStock * 100)}%">${girishTotal}</div>
            </div>
        </div>
        <div class="team-bar-item">
            <span class="team-bar-label">Santa</span>
            <div class="team-bar-track">
                <div class="team-bar-fill santa" style="width: ${(santaTotal / maxTeamStock * 100)}%">${santaTotal}</div>
            </div>
        </div>
        <div class="team-bar-item">
            <span class="team-bar-label">Iyappan</span>
            <div class="team-bar-track">
                <div class="team-bar-fill iyappan" style="width: ${(iyappanTotal / maxTeamStock * 100)}%">${iyappanTotal}</div>
            </div>
        </div>`;

    // Low stock alerts
    const lowStockList = document.getElementById('lowStockList');
    if (lowStockItems.length === 0) {
        lowStockList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h4>All Good!</h4>
                <p>No low stock alerts</p>
            </div>`;
    } else {
        lowStockList.innerHTML = lowStockItems.map(c => `
            <div class="alert-item">
                <i class="fas fa-exclamation-circle"></i>
                <div class="alert-text">
                    <strong>${c.name}</strong>
                    <span>${c.category} | Min: ${c.minStock || 5}</span>
                </div>
                <div class="alert-qty">${c.totalStock || 0}</div>
            </div>`).join('');
    }
}

function renderActivityList() {
    const list = document.getElementById('activityList');

    if (appState.activities.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h4>No Activity Yet</h4>
                <p>Start by adding components</p>
            </div>`;
        return;
    }

    list.innerHTML = appState.activities.slice(0, 15).map(act => {
        const iconClass = act.type === 'add' ? 'add' : act.type === 'transfer' ? 'transfer' : act.type === 'delete' ? 'delete' : 'edit';
        const icon = act.type === 'add' ? 'fa-plus' : act.type === 'transfer' ? 'fa-right-left' : act.type === 'delete' ? 'fa-trash' : 'fa-pen';

        return `
            <div class="activity-item">
                <div class="activity-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-text">
                    <p>${act.message}</p>
                </div>
                <span class="activity-time">${timeAgo(act.timestamp)}</span>
            </div>`;
    }).join('');
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    const filter = document.getElementById('categoryFilter').value;
    const searchTerm = document.getElementById('globalSearch').value.toLowerCase();

    let items = Object.entries(appState.inventory);

    // Apply filters
    if (filter !== 'all') {
        items = items.filter(([_, c]) => c.category === filter);
    }

    if (searchTerm) {
        items = items.filter(([_, c]) =>
            (c.name || '').toLowerCase().includes(searchTerm) ||
            (c.category || '').toLowerCase().includes(searchTerm) ||
            (c.description || '').toLowerCase().includes(searchTerm)
        );
    }

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h4>No Components Found</h4>
                        <p>Add components to get started</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = items.map(([id, c]) => {
        const total = c.totalStock || 0;
        const min = c.minStock || 5;
        let statusClass, statusText;

        if (total === 0) {
            statusClass = 'out-of-stock';
            statusText = 'Out of Stock';
        } else if (total <= min) {
            statusClass = 'low-stock';
            statusText = 'Low Stock';
        } else {
            statusClass = 'in-stock';
            statusText = 'In Stock';
        }

        return `
            <tr>
                <td><strong style="color: var(--text-primary)">${c.name || ''}</strong></td>
                <td>${c.category || ''}</td>
                <td><strong style="color: var(--accent)">${total}</strong></td>
                <td>${c.girish || 0}</td>
                <td>${c.santa || 0}</td>
                <td>${c.iyappan || 0}</td>
                <td>${c.warehouse || 0}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="openModal('${id}')" title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteComponent('${id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function renderPersonTable(person) {
    const tbody = document.getElementById(`${person}-table`);
    const items = Object.entries(appState.inventory).filter(([_, c]) => (c[person] || 0) > 0);

    const totalItems = items.reduce((sum, [_, c]) => sum + (c[person] || 0), 0);
    const totalComponents = items.length;

    document.getElementById(`${person}-total`).textContent = totalItems;
    document.getElementById(`${person}-components`).textContent = totalComponents;

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h4>No Stock Assigned</h4>
                        <p>Transfer stock to ${capitalizeFirst(person)} from the Transfer page</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = items.map(([id, c]) => `
        <tr>
            <td><strong style="color: var(--text-primary)">${c.name || ''}</strong></td>
            <td>${c.category || ''}</td>
            <td><strong style="color: var(--accent)">${c[person] || 0}</strong></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="openModal('${id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

function populateTransferDropdowns() {
    const select = document.getElementById('transferComponent');
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select Component</option>';

    Object.entries(appState.inventory).forEach(([id, c]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${c.name} (Total: ${c.totalStock || 0})`;
        select.appendChild(option);
    });

    if (currentVal) select.value = currentVal;
}

function renderTransferHistory() {
    const container = document.getElementById('transferHistory');

    if (appState.transfers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-right-left"></i>
                <h4>No Transfers Yet</h4>
                <p>Transfer stock between team members</p>
            </div>`;
        return;
    }

    container.innerHTML = appState.transfers.slice(0, 30).map(t => `
        <div class="history-item">
            <div class="history-title">
                ${t.quantity}x ${t.componentName}
            </div>
            <div class="history-detail">
                <i class="fas fa-arrow-right" style="color: var(--accent); margin: 0 5px;"></i>
                ${t.from} → ${t.to}
                ${t.notes ? ` | ${t.notes}` : ''}
            </div>
            <div class="history-time">${timeAgo(t.timestamp)}</div>
        </div>`).join('');
}

// ============ REPORTS ============
function renderReports() {
    const items = Object.values(appState.inventory);

    const girishTotal = items.reduce((sum, c) => sum + (c.girish || 0), 0);
    const santaTotal = items.reduce((sum, c) => sum + (c.santa || 0), 0);
    const iyappanTotal = items.reduce((sum, c) => sum + (c.iyappan || 0), 0);
    const warehouseTotal = items.reduce((sum, c) => sum + (c.warehouse || 0), 0);
    const grandTotal = girishTotal + santaTotal + iyappanTotal + warehouseTotal;

    // Donut Chart
    const chartContainer = document.getElementById('distributionChart');

    if (grandTotal === 0) {
        chartContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-pie"></i>
                <h4>No Data</h4>
                <p>Add stock to see distribution</p>
            </div>`;
    } else {
        const segments = [
            { label: 'Warehouse', value: warehouseTotal, color: '#9C27B0' },
            { label: 'Girish', value: girishTotal, color: '#FFAB00' },
            { label: 'Santa', value: santaTotal, color: '#43A047' },
            { label: 'Iyappan', value: iyappanTotal, color: '#1976D2' }
        ];

        let cumulativePercent = 0;
        const radius = 70;
        const circumference = 2 * Math.PI * radius;

        let svgSegments = '';
        segments.forEach(seg => {
            const percent = seg.value / grandTotal;
            const dashLength = percent * circumference;
            const dashOffset = cumulativePercent * circumference;

            svgSegments += `<circle r="${radius}" cx="100" cy="100"
                fill="transparent"
                stroke="${seg.color}"
                stroke-width="30"
                stroke-dasharray="${dashLength} ${circumference - dashLength}"
                stroke-dashoffset="-${dashOffset}"
                style="transition: stroke-dasharray 0.8s ease"/>`;

            cumulativePercent += percent;
        });

        chartContainer.innerHTML = `
            <div class="donut-chart">
                <svg viewBox="0 0 200 200" width="200" height="200">
                    ${svgSegments}
                </svg>
                <div class="donut-center">
                    <span class="donut-value">${grandTotal}</span>
                    <span class="donut-label">Total</span>
                </div>
            </div>
            <div class="chart-legend">
                ${segments.map(s => `
                    <div class="legend-item">
                        <span class="legend-dot" style="background: ${s.color}"></span>
                        <span>${s.label}: <strong>${s.value}</strong> (${Math.round(s.value / grandTotal * 100)}%)</span>
                    </div>`).join('')}
            </div>`;
    }

    // Category Summary
    const categories = {};
    items.forEach(c => {
        const cat = c.category || 'Others';
        if (!categories[cat]) categories[cat] = { count: 0, stock: 0 };
        categories[cat].count++;
        categories[cat].stock += c.totalStock || 0;
    });

    const summaryContainer = document.getElementById('categorySummary');
    const catEntries = Object.entries(categories).sort((a, b) => b[1].stock - a[1].stock);

    if (catEntries.length === 0) {
        summaryContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-list"></i>
                <h4>No Categories</h4>
            </div>`;
    } else {
        summaryContainer.innerHTML = catEntries.map(([cat, data]) => `
            <div class="summary-item">
                <span class="summary-label">${cat} <small style="color: var(--text-muted)">(${data.count} items)</small></span>
                <span class="summary-value">${data.stock}</span>
            </div>`).join('');
    }
}

// ============ SEARCH ============
function setupSearch() {
    const searchInput = document.getElementById('globalSearch');
    let debounceTimer;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (appState.currentPage === 'inventory') {
                renderInventoryTable();
            }
        }, 300);
    });
}

// ============ EXPORTS ============
function setupExports() {
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('exportJSON').addEventListener('click', exportJSON);
    document.getElementById('printReport').addEventListener('click', printReport);
}

function exportCSV() {
    const items = Object.values(appState.inventory);
    if (items.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    let csv = 'Name,Category,Description,Warehouse,Girish,Santa,Iyappan,Total Stock,Min Stock\n';
    items.forEach(c => {
        csv += `"${c.name || ''}","${c.category || ''}","${c.description || ''}",${c.warehouse || 0},${c.girish || 0},${c.santa || 0},${c.iyappan || 0},${c.totalStock || 0},${c.minStock || 5}\n`;
    });

    downloadFile(csv, 'ellectra_stock.csv', 'text/csv');
    showToast('CSV exported successfully!', 'success');
}

function exportJSON() {
    const data = JSON.stringify(appState.inventory, null, 2);
    downloadFile(data, 'ellectra_stock.json', 'application/json');
    showToast('JSON exported successfully!', 'success');
}

function printReport() {
    window.print();
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ============ ACTIVITY LOG ============
function logActivity(type, message) {
    activityRef.push({
        type,
        message,
        timestamp: Date.now()
    });
}

// ============ UTILITIES ============

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function updateSyncStatus(status) {
    const el = document.getElementById('syncStatus');
    if (status === 'synced') {
        el.className = 'sync-status';
        el.innerHTML = '<i class="fas fa-circle-check"></i><span>Synced</span>';
    } else if (status === 'loading') {
        el.className = 'sync-status';
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Syncing...</span>';
    } else {
        el.className = 'sync-status error';
        el.innerHTML = '<i class="fas fa-circle-xmark"></i><span>Error</span>';
    }
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(timestamp).toLocaleDateString();
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/'/g, "\\'").replace(/"/g, '\\"');
}
