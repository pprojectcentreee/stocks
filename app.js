/* =============================================
   ELLECTRA STOCK MANAGEMENT - APP.JS
   Firebase Integration + Full Logic
   Updated: New Firebase config injected
   ============================================= */

// ============ FIREBASE CONFIG ============

// Inventory Manager Firebase (Primary - for stock data)
const stockFirebaseConfig = {
    apiKey: "AIzaSyCdt12rV5wkS5sPwM7-dYZVjIHHhnL1lXE",
    authDomain: "inventory-manager-176e6.firebaseapp.com",
    projectId: "inventory-manager-176e6",
    storageBucket: "inventory-manager-176e6.firebasestorage.app",
    messagingSenderId: "509788833256",
    appId: "1:509788833256:web:38c4c33f394341233d105d"
};

// Initialize Firebase App
const stockApp = firebase.initializeApp(stockFirebaseConfig, "stockApp");

// Firestore reference (production mode)
const db = firebase.firestore(stockApp);

// Collection references
const inventoryCol = db.collection("inventory");
const transfersCol = db.collection("transfers");
const activityCol = db.collection("activity");

// ============ APP STATE ============
let appState = {
    inventory: {},        // { docId: { ...data } }
    transfers: [],
    activities: [],
    currentPage: 'dashboard',
    unsubscribers: []     // realtime listeners to clean up
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
    listenForRealtimeUpdates();   // single real-time boot, no one-time load needed
}

// ============ NAVIGATION ============
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const activePage = document.getElementById(`page-${page}`);
    if (activePage) activePage.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        inventory: 'Main Inventory',
        girish: 'Girish - Stock',
        santa: 'Santa - Stock',
        iyappan: 'Iyappan - Stock',
        components: 'Component List',
        transfer: 'Transfer Stock',
        reports: 'Reports & Analytics'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    appState.currentPage = page;
    document.getElementById('sidebar').classList.remove('mobile-open');
    refreshPageData(page);
}

function refreshPageData(page) {
    switch (page) {
        case 'dashboard':    updateDashboard();            break;
        case 'inventory':    renderInventoryTable();       break;
        case 'girish':
        case 'santa':
        case 'iyappan':      renderPersonTable(page);      break;
        case 'transfer':
            populateTransferDropdowns();
            renderTransferHistory();
            break;
        case 'reports':      renderReports();              break;
    }
}

// ============ SIDEBAR ============
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');

    document.getElementById('sidebarToggle').addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    document.getElementById('mobileSidebarToggle').addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            e.target !== document.getElementById('mobileSidebarToggle')) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

// ============ MODAL ============
function setupModal() {
    const modal = document.getElementById('componentModal');
    document.getElementById('addComponentBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModal').addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

function openModal(componentId = null) {
    const modal = document.getElementById('componentModal');
    const title = document.getElementById('modalTitle');
    const form  = document.getElementById('componentForm');

    if (componentId && appState.inventory[componentId]) {
        const c = appState.inventory[componentId];
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Component';
        document.getElementById('componentId').value       = componentId;
        document.getElementById('componentName').value     = c.name        || '';
        document.getElementById('componentCategory').value = c.category    || '';
        document.getElementById('componentDesc').value     = c.description || '';
        document.getElementById('warehouseQty').value      = c.warehouse   || 0;
        document.getElementById('minStock').value          = c.minStock    || 5;
        document.getElementById('girishQty').value         = c.girish      || 0;
        document.getElementById('santaQty').value          = c.santa       || 0;
        document.getElementById('iyappanQty').value        = c.iyappan     || 0;
    } else {
        title.innerHTML = '<i class="fas fa-plus"></i> Add Component';
        form.reset();
        document.getElementById('componentId').value  = '';
        document.getElementById('warehouseQty').value = 0;
        document.getElementById('minStock').value      = 5;
        document.getElementById('girishQty').value     = 0;
        document.getElementById('santaQty').value      = 0;
        document.getElementById('iyappanQty').value    = 0;
    }
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('componentModal').classList.remove('active');
}

// ============ FORMS ============
function setupForms() {
    document.getElementById('componentForm').addEventListener('submit', (e) => {
        e.preventDefault(); saveComponent();
    });

    document.getElementById('transferForm').addEventListener('submit', (e) => {
        e.preventDefault(); processTransfer();
    });

    document.getElementById('importComponentsBtn').addEventListener('click', () => {
        navigateTo('components');
        fetchEllectraComponents();
    });

    document.getElementById('fetchEllectraBtn').addEventListener('click', fetchEllectraComponents);
    document.getElementById('addToStockBtn').addEventListener('click', addSelectedToStock);

    document.getElementById('selectAllComponents').addEventListener('change', (e) => {
        document.querySelectorAll('#ellectraComponentsTable input[type="checkbox"]')
            .forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        // Real-time listeners already keep data fresh; just re-render current page
        refreshPageData(appState.currentPage);
        showToast('Data refreshed!', 'success');
    });

    document.getElementById('categoryFilter').addEventListener('change', renderInventoryTable);
    document.getElementById('transferFrom').addEventListener('change', updateAvailableQty);
    document.getElementById('transferComponent').addEventListener('change', updateAvailableQty);
}

// ============ FIRESTORE HELPERS ============

/** Convert a Firestore QuerySnapshot to a plain object keyed by doc.id */
function snapshotToMap(snapshot) {
    const map = {};
    snapshot.forEach(doc => { map[doc.id] = { id: doc.id, ...doc.data() }; });
    return map;
}

// ============ REAL-TIME LISTENERS (Firestore) ============
function listenForRealtimeUpdates() {
    updateSyncStatus('loading');

    // --- Inventory ---
    const unsubInventory = inventoryCol.onSnapshot(
        (snapshot) => {
            appState.inventory = snapshotToMap(snapshot);
            updateDashboard();
            const p = appState.currentPage;
            if (p === 'inventory') renderInventoryTable();
            if (['girish', 'santa', 'iyappan'].includes(p)) renderPersonTable(p);
            if (p === 'reports') renderReports();
            if (p === 'transfer') populateTransferDropdowns();
            updateSyncStatus('synced');
        },
        (err) => {
            console.error('Inventory listener error:', err);
            updateSyncStatus('error');
            showToast('Inventory sync error: ' + err.message, 'error');
        }
    );

    // --- Activity (last 20, ordered by timestamp desc) ---
    const unsubActivity = activityCol
        .orderBy('timestamp', 'desc')
        .limit(20)
        .onSnapshot(
            (snapshot) => {
                appState.activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                renderActivityList();
            },
            (err) => console.error('Activity listener error:', err)
        );

    // --- Transfers (last 50, ordered by timestamp desc) ---
    const unsubTransfers = transfersCol
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot(
            (snapshot) => {
                appState.transfers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                if (appState.currentPage === 'transfer') renderTransferHistory();
            },
            (err) => console.error('Transfers listener error:', err)
        );

    appState.unsubscribers = [unsubInventory, unsubActivity, unsubTransfers];
}

// ============ SAVE COMPONENT ============
function saveComponent() {
    const id          = document.getElementById('componentId').value.trim();
    const name        = document.getElementById('componentName').value.trim();
    const category    = document.getElementById('componentCategory').value;
    const description = document.getElementById('componentDesc').value.trim();
    const warehouse   = parseInt(document.getElementById('warehouseQty').value) || 0;
    const minStock    = parseInt(document.getElementById('minStock').value)     || 5;
    const girish      = parseInt(document.getElementById('girishQty').value)    || 0;
    const santa       = parseInt(document.getElementById('santaQty').value)     || 0;
    const iyappan     = parseInt(document.getElementById('iyappanQty').value)   || 0;

    if (!name || !category) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    const totalStock = warehouse + girish + santa + iyappan;
    const componentData = {
        name, category, description,
        warehouse, girish, santa, iyappan,
        totalStock, minStock,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    let promise;
    let isNew = false;

    if (id) {
        promise = inventoryCol.doc(id).update(componentData);
    } else {
        isNew = true;
        componentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        promise = inventoryCol.add(componentData);
    }

    promise
        .then(() => {
            closeModal();
            showToast(isNew ? 'Component added successfully!' : 'Component updated!', 'success');
            logActivity(isNew ? 'add' : 'edit',
                `${isNew ? 'Added' : 'Updated'} "${name}" in inventory`);
        })
        .catch(err => {
            console.error('Save error:', err);
            showToast('Failed to save: ' + err.message, 'error');
        });
}

// ============ DELETE COMPONENT ============
function deleteComponent(id) {
    const comp = appState.inventory[id];
    if (!comp) return;

    if (confirm(`Are you sure you want to delete "${comp.name}"?`)) {
        inventoryCol.doc(id).delete()
            .then(() => {
                showToast(`"${comp.name}" deleted`, 'success');
                logActivity('delete', `Deleted "${comp.name}" from inventory`);
            })
            .catch(err => {
                console.error('Delete error:', err);
                showToast('Failed to delete: ' + err.message, 'error');
            });
    }
}

// ============ TRANSFER STOCK ============
function processTransfer() {
    const componentId = document.getElementById('transferComponent').value;
    const from        = document.getElementById('transferFrom').value;
    const to          = document.getElementById('transferTo').value;
    const qty         = parseInt(document.getElementById('transferQty').value) || 0;
    const notes       = document.getElementById('transferNotes').value.trim();

    if (!componentId || !from || !to || qty <= 0) {
        showToast('Please fill in all fields correctly', 'warning');
        return;
    }
    if (from === to) {
        showToast('Source and destination cannot be the same', 'warning');
        return;
    }

    const comp = appState.inventory[componentId];
    if (!comp) { showToast('Component not found', 'error'); return; }

    const available = comp[from] || 0;
    if (qty > available) {
        showToast(`Insufficient stock! Available: ${available}`, 'error');
        return;
    }

    // Build atomic update object for Firestore
    const updatedFields = {
        [from]: available - qty,
        [to]: (comp[to] || 0) + qty,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Recompute totalStock
    const members = ['warehouse', 'girish', 'santa', 'iyappan'];
    updatedFields.totalStock = members.reduce((sum, key) => {
        if (key === from) return sum + (available - qty);
        if (key === to)   return sum + (comp[to] || 0) + qty;
        return sum + (comp[key] || 0);
    }, 0);

    inventoryCol.doc(componentId).update(updatedFields)
        .then(() => {
            return transfersCol.add({
                componentId,
                componentName: comp.name,
                from: capitalizeFirst(from),
                to:   capitalizeFirst(to),
                quantity: qty,
                notes,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            logActivity('transfer',
                `Transferred ${qty}x "${comp.name}" from ${capitalizeFirst(from)} to ${capitalizeFirst(to)}`);
            showToast(`Transferred ${qty}x ${comp.name}`, 'success');
            document.getElementById('transferForm').reset();
            document.getElementById('availableQty').textContent = '0';
        })
        .catch(err => {
            console.error('Transfer error:', err);
            showToast('Transfer failed: ' + err.message, 'error');
        });
}

function updateAvailableQty() {
    const componentId = document.getElementById('transferComponent').value;
    const from        = document.getElementById('transferFrom').value;
    const qty = (componentId && from && appState.inventory[componentId])
        ? (appState.inventory[componentId][from] || 0)
        : 0;
    document.getElementById('availableQty').textContent = qty;
}

// ============ FETCH ELLECTRA / SAMPLE COMPONENTS ============
async function fetchEllectraComponents() {
    showToast('Loading component list...', 'info');
    try {
        // Try to read from a "components" collection in the same project
        const snapshot = await db.collection('components').get();
        let components = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => components.push({ id: doc.id, ...doc.data() }));
            showToast(`Found ${components.length} components!`, 'success');
        } else {
            components = generateSampleEllectraComponents();
            showToast('No "components" collection found. Showing sample list.', 'warning');
        }
        renderEllectraComponents(components);
    } catch (err) {
        console.error('Component fetch error:', err);
        const sampleComponents = generateSampleEllectraComponents();
        renderEllectraComponents(sampleComponents);
        showToast('Using sample component list. Add a "components" collection in Firestore for live data.', 'warning');
    }
}

function generateSampleEllectraComponents() {
    return [
        { id: 'c1',  name: '10K Resistor',       description: '10K Ohm 1/4W',             category: 'Resistors'   },
        { id: 'c2',  name: '100K Resistor',       description: '100K Ohm 1/4W',            category: 'Resistors'   },
        { id: 'c3',  name: '1K Resistor',         description: '1K Ohm 1/4W',              category: 'Resistors'   },
        { id: 'c4',  name: '470R Resistor',       description: '470 Ohm 1/4W',             category: 'Resistors'   },
        { id: 'c5',  name: '100uF Capacitor',     description: '100uF 25V Electrolytic',   category: 'Capacitors'  },
        { id: 'c6',  name: '10uF Capacitor',      description: '10uF 50V Electrolytic',    category: 'Capacitors'  },
        { id: 'c7',  name: '0.1uF Capacitor',     description: '100nF Ceramic',            category: 'Capacitors'  },
        { id: 'c8',  name: 'Arduino Nano',        description: 'ATmega328P Dev Board',     category: 'Modules'     },
        { id: 'c9',  name: 'ESP32',               description: 'WiFi+BT Module',           category: 'Modules'     },
        { id: 'c10', name: 'ESP8266',             description: 'NodeMCU WiFi Module',      category: 'Modules'     },
        { id: 'c11', name: 'NE555 Timer',         description: 'Timer IC DIP-8',           category: 'ICs'         },
        { id: 'c12', name: 'LM7805',              description: '5V Voltage Regulator',     category: 'ICs'         },
        { id: 'c13', name: 'ATmega328P',          description: 'Microcontroller DIP-28',   category: 'ICs'         },
        { id: 'c14', name: 'LM358',               description: 'Dual Op-Amp DIP-8',        category: 'ICs'         },
        { id: 'c15', name: 'Red LED 5mm',         description: '5mm Red LED',              category: 'LEDs'        },
        { id: 'c16', name: 'Green LED 5mm',       description: '5mm Green LED',            category: 'LEDs'        },
        { id: 'c17', name: 'Blue LED 5mm',        description: '5mm Blue LED',             category: 'LEDs'        },
        { id: 'c18', name: 'White LED 5mm',       description: '5mm White LED',            category: 'LEDs'        },
        { id: 'c19', name: 'BC547',               description: 'NPN Transistor',           category: 'Transistors' },
        { id: 'c20', name: 'BC557',               description: 'PNP Transistor',           category: 'Transistors' },
        { id: 'c21', name: 'IRF540N',             description: 'N-Channel MOSFET',         category: 'Transistors' },
        { id: 'c22', name: '1N4007',              description: 'Rectifier Diode',          category: 'Diodes'      },
        { id: 'c23', name: '1N4148',              description: 'Signal Diode',             category: 'Diodes'      },
        { id: 'c24', name: '5.1V Zener',          description: '5.1V Zener Diode',         category: 'Diodes'      },
        { id: 'c25', name: 'DHT11',               description: 'Temp & Humidity Sensor',  category: 'Sensors'     },
        { id: 'c26', name: 'HC-SR04',             description: 'Ultrasonic Distance Sensor', category: 'Sensors'  },
        { id: 'c27', name: 'IR Sensor',           description: 'IR Obstacle Sensor',       category: 'Sensors'    },
        { id: 'c28', name: 'LDR',                 description: 'Light Dependent Resistor', category: 'Sensors'    },
        { id: 'c29', name: '2-Pin JST',           description: '2-Pin JST Connector',      category: 'Connectors' },
        { id: 'c30', name: 'USB Type-C',          description: 'USB-C Breakout Board',     category: 'Connectors' },
        { id: 'c31', name: 'Relay Module',        description: '5V 1-Channel Relay',       category: 'Modules'    },
        { id: 'c32', name: 'Motor Driver L298N',  description: 'Dual H-Bridge Driver',     category: 'Modules'    },
    ];
}

function renderEllectraComponents(components) {
    const tbody = document.getElementById('ellectraComponentsTable');
    if (components.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty-state">
                    <i class="fas fa-microchip"></i>
                    <h4>No components found</h4>
                    <p>Add a "components" collection to Firestore</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = components.map(comp => {
        const inStock = isComponentInStock(comp.name);
        return `
            <tr>
                <td><input type="checkbox" data-id="${comp.id}"
                    data-name="${escapeAttr(comp.name || '')}"
                    data-desc="${escapeAttr(comp.description || '')}"
                    data-category="${escapeAttr(comp.category || 'Others')}"></td>
                <td><strong style="color: var(--text-primary)">${comp.name || 'Unknown'}</strong></td>
                <td>${comp.description || '-'}</td>
                <td><span class="status-badge in-stock">${comp.category || 'Others'}</span></td>
                <td>${inStock
                    ? '<span class="status-badge in-stock"><i class="fas fa-check"></i> Yes</span>'
                    : '<span class="status-badge out-of-stock"><i class="fas fa-xmark"></i> No</span>'}</td>
                <td>
                    <button class="action-btn add"
                        onclick="quickAddComponent('${escapeHtml(comp.name || '')}','${escapeHtml(comp.description || '')}','${escapeHtml(comp.category || 'Others')}')"
                        title="Quick Add">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function isComponentInStock(name) {
    return Object.values(appState.inventory).some(c =>
        c.name && c.name.toLowerCase() === (name || '').toLowerCase()
    );
}

function quickAddComponent(name, description, category) {
    if (isComponentInStock(name)) {
        showToast(`"${name}" already exists in stock!`, 'warning');
        return;
    }
    const componentData = {
        name, category, description,
        warehouse: 0, girish: 0, santa: 0, iyappan: 0,
        totalStock: 0, minStock: 5,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    inventoryCol.add(componentData)
        .then(() => {
            showToast(`"${name}" added to stock!`, 'success');
            logActivity('add', `Added "${name}" from component list`);
            fetchEllectraComponents();
        })
        .catch(err => showToast('Failed to add: ' + err.message, 'error'));
}

function addSelectedToStock() {
    const checkboxes = document.querySelectorAll('#ellectraComponentsTable input[type="checkbox"]:checked');
    if (checkboxes.length === 0) { showToast('No components selected', 'warning'); return; }

    let addedCount = 0, skippedCount = 0;
    const promises = [];

    checkboxes.forEach(cb => {
        const { name, desc: description, category } = cb.dataset;
        if (isComponentInStock(name)) { skippedCount++; return; }

        const componentData = {
            name, category, description,
            warehouse: 0, girish: 0, santa: 0, iyappan: 0,
            totalStock: 0, minStock: 5,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        promises.push(inventoryCol.add(componentData).then(() => addedCount++));
    });

    Promise.all(promises).then(() => {
        let msg = `Added ${addedCount} components to stock.`;
        if (skippedCount > 0) msg += ` Skipped ${skippedCount} (already exists).`;
        showToast(msg, 'success');
        logActivity('add', `Bulk added ${addedCount} components`);
        document.getElementById('selectAllComponents').checked = false;
        fetchEllectraComponents();
    });
}

// ============ ACTIVITY LOG ============
function logActivity(type, message) {
    activityCol.add({ type, message, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(err => console.error('Activity log error:', err));
}

// ============ RENDER FUNCTIONS ============

function updateDashboard() {
    const items = Object.values(appState.inventory);

    const totalComponents = items.length;
    const totalStock      = items.reduce((s, c) => s + (c.totalStock || 0), 0);
    const lowStockItems   = items.filter(c => (c.totalStock || 0) <= (c.minStock || 5));

    document.getElementById('totalComponents').textContent  = totalComponents;
    document.getElementById('totalStock').textContent       = totalStock.toLocaleString();
    document.getElementById('lowStock').textContent         = lowStockItems.length;
    document.getElementById('notifBadge').textContent       = lowStockItems.length;

    const girishTotal    = items.reduce((s, c) => s + (c.girish    || 0), 0);
    const santaTotal     = items.reduce((s, c) => s + (c.santa     || 0), 0);
    const iyappanTotal   = items.reduce((s, c) => s + (c.iyappan   || 0), 0);
    const warehouseTotal = items.reduce((s, c) => s + (c.warehouse || 0), 0);
    const maxBar         = Math.max(girishTotal, santaTotal, iyappanTotal, warehouseTotal, 1);

    const barPct = (val) => Math.round(val / maxBar * 100);

    document.getElementById('teamBars').innerHTML = `
        <div class="team-bar-item">
            <span class="team-bar-label">Warehouse</span>
            <div class="team-bar-track">
                <div class="team-bar-fill warehouse" style="width:${barPct(warehouseTotal)}%">${warehouseTotal}</div>
            </div>
        </div>
        <div class="team-bar-item">
            <span class="team-bar-label">Girish</span>
            <div class="team-bar-track">
                <div class="team-bar-fill girish" style="width:${barPct(girishTotal)}%">${girishTotal}</div>
            </div>
        </div>
        <div class="team-bar-item">
            <span class="team-bar-label">Santa</span>
            <div class="team-bar-track">
                <div class="team-bar-fill santa" style="width:${barPct(santaTotal)}%">${santaTotal}</div>
            </div>
        </div>
        <div class="team-bar-item">
            <span class="team-bar-label">Iyappan</span>
            <div class="team-bar-track">
                <div class="team-bar-fill iyappan" style="width:${barPct(iyappanTotal)}%">${iyappanTotal}</div>
            </div>
        </div>`;

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

    const iconMap = { add: 'fa-plus', transfer: 'fa-right-left', delete: 'fa-trash', edit: 'fa-pen' };

    list.innerHTML = appState.activities.slice(0, 15).map(act => {
        const icon = iconMap[act.type] || 'fa-pen';
        const ts = act.timestamp ? (act.timestamp.toDate ? act.timestamp.toDate().getTime() : act.timestamp) : null;
        return `
            <div class="activity-item">
                <div class="activity-icon ${act.type || 'edit'}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-text"><p>${act.message}</p></div>
                <span class="activity-time">${timeAgo(ts)}</span>
            </div>`;
    }).join('');
}

function renderInventoryTable() {
    const tbody      = document.getElementById('inventoryTableBody');
    const filter     = document.getElementById('categoryFilter').value;
    const searchTerm = document.getElementById('globalSearch').value.toLowerCase();

    let items = Object.entries(appState.inventory);

    if (filter !== 'all')  items = items.filter(([_, c]) => c.category === filter);
    if (searchTerm)        items = items.filter(([_, c]) =>
        (c.name || '').toLowerCase().includes(searchTerm)       ||
        (c.category || '').toLowerCase().includes(searchTerm)   ||
        (c.description || '').toLowerCase().includes(searchTerm));

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h4>No Components Found</h4>
                <p>Add components to get started</p>
            </div></td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(([id, c]) => {
        const total = c.totalStock || 0;
        const min   = c.minStock   || 5;
        const [statusClass, statusText] = total === 0
            ? ['out-of-stock', 'Out of Stock']
            : total <= min
                ? ['low-stock', 'Low Stock']
                : ['in-stock', 'In Stock'];

        return `
            <tr>
                <td><strong style="color:var(--text-primary)">${c.name || ''}</strong></td>
                <td>${c.category || ''}</td>
                <td><strong style="color:var(--accent)">${total}</strong></td>
                <td>${c.girish    || 0}</td>
                <td>${c.santa     || 0}</td>
                <td>${c.iyappan   || 0}</td>
                <td>${c.warehouse || 0}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit"   onclick="openModal('${id}')"       title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete" onclick="deleteComponent('${id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function renderPersonTable(person) {
    const tbody     = document.getElementById(`${person}-table`);
    const items     = Object.entries(appState.inventory).filter(([_, c]) => (c[person] || 0) > 0);
    const totalQty  = items.reduce((s, [_, c]) => s + (c[person] || 0), 0);

    document.getElementById(`${person}-total`).textContent      = totalQty;
    document.getElementById(`${person}-components`).textContent = items.length;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h4>No Stock Assigned</h4>
                <p>Transfer stock to ${capitalizeFirst(person)} from the Transfer page</p>
            </div></td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(([id, c]) => `
        <tr>
            <td><strong style="color:var(--text-primary)">${c.name || ''}</strong></td>
            <td>${c.category || ''}</td>
            <td><strong style="color:var(--accent)">${c[person] || 0}</strong></td>
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
    const select   = document.getElementById('transferComponent');
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select Component</option>';
    Object.entries(appState.inventory).forEach(([id, c]) => {
        const opt = document.createElement('option');
        opt.value       = id;
        opt.textContent = `${c.name} (Total: ${c.totalStock || 0})`;
        select.appendChild(opt);
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

    container.innerHTML = appState.transfers.slice(0, 30).map(t => {
        const ts = t.timestamp ? (t.timestamp.toDate ? t.timestamp.toDate().getTime() : t.timestamp) : null;
        return `
            <div class="history-item">
                <div class="history-title">${t.quantity}x ${t.componentName}</div>
                <div class="history-detail">
                    <i class="fas fa-arrow-right" style="color:var(--accent);margin:0 5px;"></i>
                    ${t.from} → ${t.to}${t.notes ? ` | ${t.notes}` : ''}
                </div>
                <div class="history-time">${timeAgo(ts)}</div>
            </div>`;
    }).join('');
}

// ============ REPORTS ============
function renderReports() {
    const items = Object.values(appState.inventory);

    const warehouseTotal = items.reduce((s, c) => s + (c.warehouse || 0), 0);
    const girishTotal    = items.reduce((s, c) => s + (c.girish    || 0), 0);
    const santaTotal     = items.reduce((s, c) => s + (c.santa     || 0), 0);
    const iyappanTotal   = items.reduce((s, c) => s + (c.iyappan   || 0), 0);
    const grandTotal     = warehouseTotal + girishTotal + santaTotal + iyappanTotal;

    const chartContainer = document.getElementById('distributionChart');
    if (grandTotal === 0) {
        chartContainer.innerHTML = `<div class="empty-state"><i class="fas fa-chart-pie"></i><h4>No Data</h4><p>Add stock to see distribution</p></div>`;
    } else {
        const segments = [
            { label: 'Warehouse', value: warehouseTotal, color: '#9C27B0' },
            { label: 'Girish',    value: girishTotal,    color: '#FFAB00' },
            { label: 'Santa',     value: santaTotal,     color: '#43A047' },
            { label: 'Iyappan',   value: iyappanTotal,   color: '#1976D2' }
        ];
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        let cumulativePercent = 0;

        let svgSegments = '';
        segments.forEach(seg => {
            const pct       = seg.value / grandTotal;
            const dashLen   = pct * circumference;
            const dashOffset = cumulativePercent * circumference;
            svgSegments += `<circle r="${radius}" cx="100" cy="100"
                fill="transparent" stroke="${seg.color}" stroke-width="30"
                stroke-dasharray="${dashLen} ${circumference - dashLen}"
                stroke-dashoffset="-${dashOffset}"
                style="transition:stroke-dasharray 0.8s ease"/>`;
            cumulativePercent += pct;
        });

        chartContainer.innerHTML = `
            <div class="donut-chart">
                <svg viewBox="0 0 200 200" width="200" height="200">${svgSegments}</svg>
                <div class="donut-center">
                    <span class="donut-value">${grandTotal}</span>
                    <span class="donut-label">Total</span>
                </div>
            </div>
            <div class="chart-legend">
                ${segments.map(s => `
                    <div class="legend-item">
                        <span class="legend-dot" style="background:${s.color}"></span>
                        <span>${s.label}: <strong>${s.value}</strong> (${Math.round(s.value / grandTotal * 100)}%)</span>
                    </div>`).join('')}
            </div>`;
    }

    // Category summary
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
        summaryContainer.innerHTML = `<div class="empty-state"><i class="fas fa-list"></i><h4>No Categories</h4></div>`;
    } else {
        summaryContainer.innerHTML = catEntries.map(([cat, data]) => `
            <div class="summary-item">
                <span class="summary-label">${cat} <small style="color:var(--text-muted)">(${data.count} items)</small></span>
                <span class="summary-value">${data.stock}</span>
            </div>`).join('');
    }
}

// ============ SEARCH ============
function setupSearch() {
    let debounceTimer;
    document.getElementById('globalSearch').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (appState.currentPage === 'inventory') renderInventoryTable();
        }, 300);
    });
}

// ============ EXPORTS ============
function setupExports() {
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('exportJSON').addEventListener('click', exportJSON);
    document.getElementById('printReport').addEventListener('click', () => window.print());
}

function exportCSV() {
    const items = Object.values(appState.inventory);
    if (items.length === 0) { showToast('No data to export', 'warning'); return; }
    let csv = 'Name,Category,Description,Warehouse,Girish,Santa,Iyappan,Total Stock,Min Stock\n';
    items.forEach(c => {
        csv += `"${c.name||''}","${c.category||''}","${c.description||''}",${c.warehouse||0},${c.girish||0},${c.santa||0},${c.iyappan||0},${c.totalStock||0},${c.minStock||5}\n`;
    });
    downloadFile(csv, 'ellectra_stock.csv', 'text/csv');
    showToast('CSV exported successfully!', 'success');
}

function exportJSON() {
    downloadFile(JSON.stringify(appState.inventory, null, 2), 'ellectra_stock.json', 'application/json');
    showToast('JSON exported successfully!', 'success');
}

function downloadFile(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
}

// ============ UTILITIES ============

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function updateSyncStatus(status) {
    const el = document.getElementById('syncStatus');
    const states = {
        synced:  ['sync-status',       'fa-circle-check',  'Synced'],
        loading: ['sync-status',       'fa-spinner fa-spin', 'Syncing...'],
        error:   ['sync-status error', 'fa-circle-xmark',  'Error']
    };
    const [cls, icon, label] = states[status] || states.error;
    el.className = cls;
    el.innerHTML = `<i class="fas ${icon}"></i><span>${label}</span>`;
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60)    return 'Just now';
    if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800)return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Escapes for use in HTML attribute values
function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Escapes for use inside JS string literals in onclick="..."
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/'/g, "\\'").replace(/"/g, '\\"');
}
