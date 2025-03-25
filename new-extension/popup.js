// DOM Elements
const promptList = document.getElementById('prompt-list');
const searchInput = document.getElementById('search');
const addPromptBtn = document.getElementById('add-prompt-btn');
const promptModal = document.getElementById('prompt-modal');
const promptForm = document.getElementById('prompt-form');
const promptTitleInput = document.getElementById('prompt-title-input');
const promptTextInput = document.getElementById('prompt-text-input');
const promptTagsInput = document.getElementById('prompt-tags-input');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.querySelector('.close');
const toast = document.getElementById('toast');
const themeToggle = document.getElementById('theme-toggle');
const folderSelect = document.getElementById('folder-select');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const fileInput = document.getElementById('file-input');

// State
let prompts = [];
let folders = [];
let editingPromptId = null;
let darkMode = false;
let currentFolder = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPrompts();
    loadFolders();
    loadTheme();
    
    // Add event listeners
    searchInput.addEventListener('input', filterPrompts);
    addPromptBtn.addEventListener('click', showAddPromptModal);
    closeBtn.addEventListener('click', closeModal);
    promptForm.addEventListener('submit', savePrompt);
    themeToggle.addEventListener('click', toggleTheme);
    folderSelect.addEventListener('change', changeFolder);
    exportBtn.addEventListener('click', exportPrompts);
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', importPrompts);
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === promptModal) {
            closeModal();
        }
    });
});

// Load folders from storage
function loadFolders() {
    chrome.storage.local.get('folders', (data) => {
        folders = data.folders || [];
        renderFolders();
    });
}

// Render folders to select dropdown
function renderFolders() {
    // Clear current options except the first one (All Prompts)
    while (folderSelect.options.length > 1) {
        folderSelect.remove(1);
    }
    
    // Add folders to select
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        folderSelect.appendChild(option);
    });
    
    // Set current folder
    folderSelect.value = currentFolder;
}

// Change current folder
function changeFolder() {
    currentFolder = folderSelect.value;
    filterPrompts();
}

// Load prompts from storage
function loadPrompts() {
    chrome.storage.local.get('prompts', (data) => {
        prompts = data.prompts || getDefaultPrompts();
        renderPrompts();
        
        // Save default prompts if none exist
        if (!data.prompts) {
            savePromptsToStorage();
        }
    });
}

// Load theme from storage
function loadTheme() {
    chrome.storage.local.get('darkMode', (data) => {
        darkMode = data.darkMode || false;
        applyTheme();
    });
}

// Apply current theme
function applyTheme() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙';
    }
}

// Toggle theme
function toggleTheme() {
    darkMode = !darkMode;
    applyTheme();
    chrome.storage.local.set({ darkMode });
}

// Default prompts
function getDefaultPrompts() {
    return [
        {
            id: '1',
            title: 'Creative Writing Assistant',
            text: 'I want you to act as a creative writing assistant. You will help me craft engaging stories with vivid descriptions and compelling characters.'
        },
        {
            id: '2',
            title: 'Code Reviewer',
            text: 'Act as a senior software developer reviewing my code. Identify bugs, suggest improvements for readability, performance, and maintainability.'
        },
        {
            id: '3',
            title: 'Study Plan Creator',
            text: 'Create a comprehensive study plan for me to learn [subject] in [timeframe]. Include resources, practice exercises, and milestones.'
        },
        {
            id: '4',
            title: 'Interview Coach',
            text: 'Act as an interview coach for a [position] role. Provide common interview questions, strategies for answering them, and feedback on my responses.'
        }
    ];
}

// Render prompts to the list
function renderPrompts(filteredPrompts = null) {
    const promptsToRender = filteredPrompts || prompts;
    promptList.innerHTML = '';
    
    if (promptsToRender.length === 0) {
        promptList.innerHTML = '<p>No prompts found. Add a new prompt to get started!</p>';
        return;
    }
    
    promptsToRender.forEach(prompt => {
        const promptElement = document.createElement('div');
        promptElement.className = 'prompt-item';
        
        // Create tags HTML if prompt has tags
        let tagsHtml = '';
        if (prompt.tags && prompt.tags.length > 0) {
            tagsHtml = '<div class="prompt-tags">' +
                prompt.tags.map(tag => `<span class="tag">${tag}</span>`).join('') +
                '</div>';
        }
        
        promptElement.innerHTML = `
            <div class="prompt-title">${prompt.title}</div>
            ${tagsHtml}
            <div class="prompt-text">${prompt.text}</div>
            <div class="prompt-actions">
                <button class="use-btn" data-id="${prompt.id}">Use</button>
                <button class="edit-btn" data-id="${prompt.id}">Edit</button>
                <button class="copy-btn" data-id="${prompt.id}">Copy</button>
                <button class="delete-btn" data-id="${prompt.id}">Delete</button>
            </div>
        `;
        
        promptList.appendChild(promptElement);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.use-btn').forEach(btn => {
        btn.addEventListener('click', () => usePrompt(btn.dataset.id));
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editPrompt(btn.dataset.id));
    });
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => copyPrompt(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deletePrompt(btn.dataset.id));
    });
}

// Filter prompts based on search input and current folder
function filterPrompts() {
    const searchTerm = searchInput.value.toLowerCase();
    
    let filtered = prompts;
    
    // Filter by folder if a folder is selected
    if (currentFolder) {
        filtered = filtered.filter(prompt =>
            prompt.tags && prompt.tags.includes(currentFolder)
        );
    }
    
    // Filter by search term if provided
    if (searchTerm) {
        filtered = filtered.filter(prompt =>
            prompt.title.toLowerCase().includes(searchTerm) ||
            prompt.text.toLowerCase().includes(searchTerm) ||
            (prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }
    
    renderPrompts(filtered);
}

// Show add prompt modal
function showAddPromptModal() {
    modalTitle.textContent = 'Add New Prompt';
    promptTitleInput.value = '';
    promptTextInput.value = '';
    editingPromptId = null;
    promptModal.style.display = 'block';
}

// Edit prompt
function editPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;
    
    modalTitle.textContent = 'Edit Prompt';
    promptTitleInput.value = prompt.title;
    promptTextInput.value = prompt.text;
    editingPromptId = id;
    promptModal.style.display = 'block';
}

// Use prompt with variable replacement
function usePrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;
    
    // Check if prompt has variables (text enclosed in {{...}})
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(prompt.text)) !== null) {
        variables.push(match[1]);
    }
    
    if (variables.length > 0) {
        // Show variable input modal
        showVariableModal(prompt, variables);
    } else {
        // No variables, just copy the text
        copyPrompt(id);
    }
}

// Show modal for variable input
function showVariableModal(prompt, variables) {
    // Create modal for variable input
    const variableModal = document.createElement('div');
    variableModal.className = 'modal';
    variableModal.style.display = 'block';
    
    let variableInputsHtml = '';
    variables.forEach(variable => {
        variableInputsHtml += `
            <div class="form-group">
                <label for="var-${variable}">${variable}</label>
                <input type="text" id="var-${variable}" placeholder="Enter value for ${variable}">
            </div>
        `;
    });
    
    variableModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Fill in Variables</h2>
            <form id="variable-form">
                ${variableInputsHtml}
                <button type="submit">Use Prompt</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(variableModal);
    
    // Add event listeners
    const closeBtn = variableModal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(variableModal);
    });
    
    const variableForm = variableModal.querySelector('#variable-form');
    variableForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let replacedText = prompt.text;
        variables.forEach(variable => {
            const value = document.getElementById(`var-${variable}`).value || `[${variable}]`;
            replacedText = replacedText.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
        });
        
        navigator.clipboard.writeText(replacedText)
            .then(() => showToast('Prompt with variables copied to clipboard!'))
            .catch(err => showToast('Failed to copy prompt: ' + err));
        
        document.body.removeChild(variableModal);
    });
}

// Copy prompt to clipboard
function copyPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;
    
    navigator.clipboard.writeText(prompt.text)
        .then(() => showToast('Prompt copied to clipboard!'))
        .catch(err => showToast('Failed to copy prompt: ' + err));
}

// Delete prompt
function deletePrompt(id) {
    if (confirm('Are you sure you want to delete this prompt?')) {
        prompts = prompts.filter(p => p.id !== id);
        savePromptsToStorage();
        renderPrompts();
        showToast('Prompt deleted');
    }
}

// Close modal
function closeModal() {
    promptModal.style.display = 'none';
}

// Save prompt
function savePrompt(e) {
    e.preventDefault();
    
    const title = promptTitleInput.value.trim();
    const text = promptTextInput.value.trim();
    const tagsInput = promptTagsInput ? promptTagsInput.value.trim() : '';
    
    if (!title || !text) {
        showToast('Please fill in all required fields');
        return;
    }
    
    // Process tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    // Add new tags to folders list
    const newFolders = tags.filter(tag => !folders.includes(tag));
    if (newFolders.length > 0) {
        folders = [...folders, ...newFolders];
        chrome.storage.local.set({ folders });
        renderFolders();
    }
    
    if (editingPromptId) {
        // Update existing prompt
        const index = prompts.findIndex(p => p.id === editingPromptId);
        if (index !== -1) {
            prompts[index] = { ...prompts[index], title, text, tags };
        }
    } else {
        // Add new prompt
        const newPrompt = {
            id: Date.now().toString(),
            title,
            text,
            tags
        };
        prompts.unshift(newPrompt);
    }
    
    savePromptsToStorage();
    renderPrompts();
    closeModal();
    showToast(editingPromptId ? 'Prompt updated' : 'Prompt added');
}

// Save prompts to storage
function savePromptsToStorage() {
    chrome.storage.local.set({ prompts });
}

// Export prompts to JSON file
function exportPrompts() {
    const dataStr = JSON.stringify({ prompts, folders }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'ai-prompt-genius-export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Prompts exported successfully');
}

// Import prompts from JSON file
function importPrompts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.prompts && Array.isArray(data.prompts)) {
                // Merge with existing prompts, avoiding duplicates by ID
                const existingIds = prompts.map(p => p.id);
                const newPrompts = data.prompts.filter(p => !existingIds.includes(p.id));
                
                prompts = [...newPrompts, ...prompts];
                savePromptsToStorage();
                
                // Import folders if available
                if (data.folders && Array.isArray(data.folders)) {
                    const newFolders = data.folders.filter(f => !folders.includes(f));
                    if (newFolders.length > 0) {
                        folders = [...folders, ...newFolders];
                        chrome.storage.local.set({ folders });
                        renderFolders();
                    }
                }
                
                renderPrompts();
                showToast(`Imported ${newPrompts.length} prompts successfully`);
            } else {
                showToast('Invalid import file format');
            }
        } catch (error) {
            showToast('Error importing prompts: ' + error.message);
        }
        
        // Reset file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Show toast message
function showToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}