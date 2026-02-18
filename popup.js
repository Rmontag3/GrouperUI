// --- CONFIGURATION ---
const BUILTIN_IDS = {
    DEFAULT: 'default-theme@mozilla.org',
    LIGHT: 'firefox-compact-light@mozilla.org',
    DARK: 'firefox-compact-dark@mozilla.org',
    ALPENGLOW: 'firefox-alpenglow@mozilla.org'
};
const MAX_THEMES_PER_GROUP = 6;

const DEFAULTS_GROUP = {
    id: 'defaults', name: 'Firefox Defaults', type: 'system',
    themes: [
        { name: 'System Default', type: 'builtin', id: BUILTIN_IDS.DEFAULT, preview: '#ffffff' },
        { name: 'Alpenglow', type: 'builtin', id: BUILTIN_IDS.ALPENGLOW, preview: 'linear-gradient(to right, #9059FF, #FF4AA2, #FFBD4F)' },
        { name: 'Dark', type: 'builtin', id: BUILTIN_IDS.DARK, preview: '#1c1b22' },
        { name: 'Light', type: 'builtin', id: BUILTIN_IDS.LIGHT, preview: '#e0e0e6' }
    ]
};

// --- GLOBAL STATE ---
let themeData = [];
let rotationList = []; 
let isSelectionMode = false; 
let rotationInterval = 30; 
let managingGroupId = null; 

const listContainer = document.getElementById('group-list');
const contextMenu = document.getElementById('context-menu');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const rotateToggle = document.getElementById('rotate-toggle');

// --- INIT ---
document.addEventListener('DOMContentLoaded', init);

async function init() {
    let userGroups = [];
    try {
        const storage = await browser.storage.local.get(['savedThemeData', 'isDarkMode', 'rotationList', 'isRotationActive', 'rotationInterval']);
        
        if (storage.isDarkMode) {
            document.body.setAttribute('data-theme', 'dark');
            darkModeToggle.classList.add('active');
        }
        if (storage.rotationList) rotationList = storage.rotationList;
        if (storage.rotationInterval) rotationInterval = storage.rotationInterval;
        
        if (storage.isRotationActive) {
            rotateToggle.classList.add('active');
            rotateToggle.title = `Stop Rotation (${rotationInterval}m)`;
        } else {
            rotateToggle.classList.remove('active');
            rotateToggle.title = "Configure Rotation";
        }

        if (storage.savedThemeData) {
            userGroups = storage.savedThemeData.filter(g => g.type !== 'system');
        }
    } catch (e) { console.error(e); }

    if (!userGroups.find(g => g.type === 'colors_only')) {
        userGroups.unshift({ id: 'creations-1', name: 'My Creations', type: 'colors_only', themes: [] });
    }
    if (!userGroups.find(g => g.type === 'images_only')) {
        userGroups.push({ id: 'gallery-1', name: 'Gallery', type: 'images_only', themes: [] });
    }

    let installedGroup = { id: 'firefox-store', name: 'Browser Themes', type: 'system', themes: [] };
    if (browser.management && browser.management.getAll) {
        try {
            const allExt = await browser.management.getAll();
            const builtInValues = Object.values(BUILTIN_IDS);
            installedGroup.themes = allExt
                .filter(ext => ext.type === 'theme' && !builtInValues.includes(ext.id))
                .map(t => ({
                    name: t.name, type: 'addon', id: t.id,
                    preview: (t.icons && t.icons.length > 0) ? `url(${t.icons[t.icons.length-1].url}) center/cover` : '#aaaaaa'
                }));
        } catch (e) {}
    }

    themeData = [DEFAULTS_GROUP, installedGroup, ...userGroups];
    enforceGroupLimits();
    renderGroups();
}

// --- RENDER ---
function renderGroups() {
    listContainer.innerHTML = '';
    themeData.forEach((group, index) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'group-item';
        if (managingGroupId === group.id) groupEl.classList.add('managing');
        
        if (group.type !== 'system') groupEl.draggable = true;
        groupEl.dataset.index = index;

        // Name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = group.name;
        groupEl.appendChild(nameSpan);

        // Controls
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'group-controls';

        // Manage Button
        if (group.id !== 'defaults') {
            const manageBtn = document.createElement('div');
            manageBtn.className = 'manage-group-btn';
            manageBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
            manageBtn.title = "Manage Group";
            manageBtn.onclick = (e) => {
                e.stopPropagation();
                managingGroupId = (managingGroupId === group.id) ? null : group.id;
                renderGroups();
            };
            controlsDiv.appendChild(manageBtn);
        }

        // Add Button
        const addBtn = document.createElement('div');
        addBtn.className = 'add-theme-btn';
        addBtn.textContent = '+';
        if(group.type === 'colors_only') addBtn.title = "Add Hex Color";
        else if(group.type === 'images_only') addBtn.title = "Upload Image";
        else if(group.name === 'Browser Themes') addBtn.title = "Open Theme Store";
        else addBtn.style.visibility = 'hidden';

        addBtn.onclick = (e) => {
            e.stopPropagation();
            if(isSelectionMode || managingGroupId) return;
            if (group.id === 'firefox-store') browser.tabs.create({ url: "https://addons.mozilla.org/firefox/themes/" });
            else handleGroupSpecificAdd(group);
        };
        controlsDiv.appendChild(addBtn);
        groupEl.appendChild(controlsDiv);

        // List
        const nestedMenu = document.createElement('div');
        nestedMenu.className = 'theme-nested-menu';
        
        if (group.themes.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'theme-option';
            empty.style.color = 'var(--text-secondary)';
            empty.textContent = 'Empty';
            nestedMenu.appendChild(empty);
        } else {
            group.themes.forEach(theme => {
                const themeEl = document.createElement('div');
                themeEl.className = 'theme-option';
                
                if (isThemeSelected(theme)) {
                    if (isSelectionMode) themeEl.classList.add('selected'); 
                    themeEl.classList.add('in-rotation'); 
                }

                const swatch = document.createElement('span');
                swatch.className = 'swatch';
                swatch.style.background = theme.preview; 
                themeEl.appendChild(swatch);
                themeEl.appendChild(document.createTextNode(theme.name));
                
                const badge = document.createElement('div');
                badge.className = 'rotation-badge';
                themeEl.appendChild(badge);

                // --- DELETE BUTTON ---
                const delBtn = document.createElement('div');
                delBtn.className = 'theme-delete-btn';
                delBtn.innerHTML = '×';
                delBtn.onclick = (e) => {
                    e.stopPropagation(); // Stop it from clicking the row
                    performDelete(group, theme);
                };
                themeEl.appendChild(delBtn);

                themeEl.onclick = () => {
                    if (managingGroupId) return;
                    if (isSelectionMode) toggleThemeInRotation(theme);
                    else applyTheme(theme);
                };
                
                themeEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showThemeContextMenu(e, group, theme);
                });
                nestedMenu.appendChild(themeEl);
            });
        }
        groupEl.appendChild(nestedMenu);

        if (group.type !== 'system') {
            setupDragEvents(groupEl);
            groupEl.addEventListener('contextmenu', (e) => showGroupContextMenu(e, group.id));
        }
        listContainer.appendChild(groupEl);
    });
}

// --- DELETE LOGIC ---
function performDelete(group, theme) {
    // 1. ADDONS (Browser Themes)
    if (group.id === 'firefox-store' && theme.type === 'addon') {
        // Just open the manager. It's safe, reliable, and what Firefox wants.
        browser.tabs.create({ url: "about:addons" });
        window.close(); 
    } 
    // 2. CUSTOM THEMES (Colors/Gallery)
    else {
        // Non-blocking confirm using simple alert logic which is safe in popup for sync ops
        if(confirm("Delete this theme?")) {
             const idx = group.themes.indexOf(theme);
            if (idx > -1) {
                group.themes.splice(idx, 1);
                const rotIdx = rotationList.findIndex(t => t.name === theme.name && t.type === theme.type);
                if (rotIdx > -1) {
                    rotationList.splice(rotIdx, 1);
                    browser.storage.local.set({ rotationList: rotationList });
                }
                saveUserGroups();
                renderGroups();
            }
        }
    }
}

// --- ROTATION ---
rotateToggle.onclick = async () => {
    managingGroupId = null;
    if (isSelectionMode) {
        isSelectionMode = false;
        document.body.classList.remove('selection-mode');
        const shouldRun = rotationList.length > 1;
        if (shouldRun) {
            const input = prompt("Rotate every X minutes:", rotationInterval);
            let duration = parseInt(input);
            if (isNaN(duration) || duration < 1) duration = rotationInterval; 
            rotationInterval = duration;
            await browser.storage.local.set({ rotationList, isRotationActive: true, rotationInterval });
            rotateToggle.classList.add('active');
            rotateToggle.title = `Stop Rotation (${rotationInterval}m)`;
            browser.alarms.create('theme-rotation', { periodInMinutes: rotationInterval });
        } else {
            await browser.storage.local.set({ isRotationActive: false });
            browser.alarms.clear('theme-rotation');
            rotateToggle.classList.remove('active');
            rotateToggle.title = "Configure Rotation";
        }
        renderGroups();
        return;
    }
    const storage = await browser.storage.local.get('isRotationActive');
    if (storage.isRotationActive) {
        await browser.storage.local.set({ isRotationActive: false });
        browser.alarms.clear('theme-rotation');
        rotateToggle.classList.remove('active');
        rotateToggle.title = "Configure Rotation";
    } else {
        isSelectionMode = true;
        document.body.classList.add('selection-mode');
        rotateToggle.title = "Select themes then click again to Start";
        renderGroups();
    }
};

function toggleThemeInRotation(theme) {
    const index = rotationList.findIndex(t => t.name === theme.name && t.type === theme.type && (t.id === theme.id || t.color === theme.color));
    if (index === -1) rotationList.push(theme); else rotationList.splice(index, 1);
    renderGroups(); 
}

function isThemeSelected(theme) {
    return rotationList.some(t => t.name === theme.name && t.type === theme.type && (t.id === theme.id || t.color === theme.color));
}

// --- THEME APPLICATION ---
function applyTheme(theme) {
    const isUIInDarkMode = document.body.hasAttribute('data-theme');
    if (theme.type === 'builtin' || theme.type === 'addon') {
        if (browser.management) browser.management.setEnabled(theme.id, true);
    }
    else if (theme.type === 'image') {
        browser.theme.update({
            images: { theme_frame: theme.data },
            colors: {
                frame: isUIInDarkMode ? '#1c1b22' : '#ffffff',
                tab_background_text: isUIInDarkMode ? '#f9f9fb' : '#15141a',
                toolbar: isUIInDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.5)',
                textcolor: isUIInDarkMode ? '#f9f9fb' : '#15141a'
            }
        });
    }
    else if (theme.type === 'custom') {
        browser.theme.update({
            colors: {
                frame: theme.color,
                tab_background_text: isUIInDarkMode ? '#f9f9fb' : '#15141a',
                toolbar: theme.color,
                textcolor: isUIInDarkMode ? '#f9f9fb' : '#15141a',
                toolbar_text: isUIInDarkMode ? '#f9f9fb' : '#15141a'
            }
        });
    }
}

// --- UTILS ---
function enforceGroupLimits() {
    let changesMade = false;
    for (let i = 0; i < themeData.length; i++) {
        let group = themeData[i];
        if (group.id === 'defaults') continue;
        if (group.themes.length > MAX_THEMES_PER_GROUP) {
            const excess = group.themes.splice(MAX_THEMES_PER_GROUP);
            let nextGroup = themeData[i + 1];
            let baseName = group.name.replace(/ \d+$/, ''); 
            if (nextGroup && nextGroup.name.startsWith(baseName) && nextGroup.type === group.type) {
                nextGroup.themes = [...excess, ...nextGroup.themes];
            } else {
                let currentNum = parseInt(group.name.match(/\d+$/)?.[0] || '1');
                const newGroup = { id: 'auto-' + Date.now(), name: baseName + " " + (currentNum + 1), type: group.type, themes: excess };
                themeData.splice(i + 1, 0, newGroup);
            }
            changesMade = true;
        }
    }
    if (changesMade) saveUserGroups();
}

function handleGroupSpecificAdd(group) {
    if (group.type === 'colors_only') {
        const name = prompt("Color Theme Name:");
        if (!name) return;
        const color = prompt("Hex Code:");
        if (color) {
            group.themes.push({ name: name, type: 'custom', color: color, preview: color });
            enforceGroupLimits();
            saveUserGroups();
            renderGroups();
        }
    } else if (group.type === 'images_only') {
        if(confirm("Open uploader?")) { browser.tabs.create({ url: "uploader.html" }); window.close(); }
    }
}

function saveUserGroups() {
    const userGroupsOnly = themeData.filter(g => g.type !== 'system');
    const isDark = document.body.hasAttribute('data-theme');
    browser.storage.local.set({ savedThemeData: userGroupsOnly, isDarkMode: isDark });
}

document.getElementById('store-btn').onclick = () => browser.tabs.create({ url: "https://addons.mozilla.org/firefox/themes/" });
document.getElementById('global-upload-btn').onclick = () => { if(confirm("Open uploader?")) { browser.tabs.create({ url: "uploader.html" }); window.close(); }};
darkModeToggle.onclick = () => {
    const isDark = document.body.hasAttribute('data-theme');
    if (isDark) { document.body.removeAttribute('data-theme'); darkModeToggle.classList.remove('active'); } 
    else { document.body.setAttribute('data-theme', 'dark'); darkModeToggle.classList.add('active'); }
    saveUserGroups();
};
document.getElementById('add-group-btn').onclick = () => {
    const name = prompt("New Collection Name:");
    if(name) { themeData.push({ id: 'g-'+Date.now(), name: name, type: 'colors_only', themes: [] }); saveUserGroups(); renderGroups(); }
};
document.getElementById('ctx-rename').onclick = () => {
    const g = themeData.find(x => x.id === currentRightClickedGroupId);
    if(g) { const n = prompt("Rename:", g.name); if(n) { g.name = n; saveUserGroups(); renderGroups(); } }
};
document.getElementById('ctx-delete').onclick = () => {
    if(confirm("Delete group?")) { themeData = themeData.filter(x => x.id !== currentRightClickedGroupId); saveUserGroups(); renderGroups(); }
};

let dragSrcIndex = null;
function setupDragEvents(el) {
    el.addEventListener('dragstart', (e) => {
        if(isSelectionMode || managingGroupId) { e.preventDefault(); return; }
        dragSrcIndex = +el.dataset.index;
        el.style.opacity = '0.5';
    });
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', (e) => {
        e.stopPropagation();
        const targetIndex = +el.dataset.index;
        if (themeData[targetIndex].type === 'system') return;
        if (dragSrcIndex !== targetIndex) {
            const item = themeData.splice(dragSrcIndex, 1)[0];
            themeData.splice(targetIndex, 0, item);
            enforceGroupLimits();
            saveUserGroups();
            renderGroups();
        }
    });
    el.addEventListener('dragend', () => el.style.opacity = '1');
}

// Context Menu Helper
let currentRightClickedGroupId = null;
function showGroupContextMenu(e, groupId) {
    e.stopPropagation();
    currentRightClickedGroupId = groupId;
    document.getElementById('ctx-rename').style.display = 'block';
    document.getElementById('ctx-delete').style.display = 'block';
    document.getElementById('ctx-uninstall').style.display = 'none';
    document.getElementById('ctx-manage-sys').style.display = 'none';
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.classList.remove('hidden');
}
function showThemeContextMenu(e, group, theme) {
    e.stopPropagation();
    document.getElementById('ctx-rename').style.display = 'none'; 
    document.getElementById('ctx-delete').style.display = 'none'; 
    if (theme.type === 'addon') {
        const uninstallBtn = document.getElementById('ctx-uninstall');
        const manageBtn = document.getElementById('ctx-manage-sys');
        uninstallBtn.style.display = 'block';
        manageBtn.style.display = 'block';
        uninstallBtn.onclick = () => {
             browser.tabs.create({ url: "about:addons" });
             window.close();
        };
        manageBtn.onclick = () => {
            browser.tabs.create({ url: "about:addons" });
            window.close();
        };
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.classList.remove('hidden');
    } 
}
document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) contextMenu.classList.add('hidden');
});

document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("bug-footer");
  const modal = document.getElementById("bug-modal");
  const cancelBtn = document.getElementById("cancel-bug-btn");
  const submitBtn = document.getElementById("submit-bug-btn");

  if (!footer || !modal) return;

  // Sanitization helper
  function sanitize(str) {
      if (!str) return "N/A";
      return str
          .replace(/@/g, '&#64;') // Prevent Discord @everyone/@here pings
          .replace(/</g, '&lt;')  // Prevent HTML/Markdown injection
          .replace(/>/g, '&gt;')
          .trim()
          .slice(0, 1000);        // Hard limit length to respect Discord limits
  }

  // Open modal
  footer.addEventListener("click", () => {
      modal.style.display = "flex";
  });

  // Close modal
  cancelBtn.addEventListener("click", () => {
      modal.style.display = "none";
      document.getElementById("bug-desc").value = "";
      document.getElementById("bug-steps").value = "";
  });

  // Submit Logic
  submitBtn.addEventListener("click", async () => {
      const type = document.getElementById("bug-type").value;
      const severity = document.getElementById("bug-severity").value;
      const desc = sanitize(document.getElementById("bug-desc").value);
      const steps = sanitize(document.getElementById("bug-steps").value);

      if (desc === "N/A" || desc.length < 5) {
          alert("Please provide a bit more detail in the description.");
          return;
      }

      submitBtn.textContent = "Sending...";
      submitBtn.disabled = true;

      // Gather environment details automatically
      const systemInfo = sanitize(navigator.userAgent);
      const activeThemes = sanitize(rotationList.map(t => t.name).join(", ") || "None");
      const isDark = document.body.hasAttribute('data-theme') ? "Yes" : "No";

      // Package everything up nicely
      const payloadObj = {
          type,
          severity,
          description: desc,
          steps,
          environment: `OS/Browser: ${systemInfo}\nDark Mode UI: ${isDark}\nThemes in Rotation: ${activeThemes}`
      };

      try {
          // Send to background script instead of direct fetch
          const response = await browser.runtime.sendMessage({ 
              type: "reportBug", 
              data: payloadObj 
          });

          if (response && response.success) {
              alert("Bug report sent — thank you!");
              cancelBtn.click(); // close and reset
          } else {
              alert("Failed to send report. Please check your internet connection.");
          }
      } catch (e) {
          console.error("Messaging error:", e);
          alert("Error communicating with background script.");
      } finally {
          submitBtn.textContent = "Submit Report";
          submitBtn.disabled = false;
      }
  });
});