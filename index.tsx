/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat, Part } from '@google/genai';
import { marked } from 'marked';

// --- DOM Element Selection ---
const chatHistory = document.getElementById('chat-history') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const sendButton = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
const micButton = document.getElementById('mic-button') as HTMLButtonElement;
const welcomeScreen = document.getElementById('welcome-screen') as HTMLDivElement;
const stopButton = document.getElementById('stop-button') as HTMLButtonElement;

// App Header
const appHeader = document.getElementById('app-header') as HTMLElement;
const userInfo = document.getElementById('user-info') as HTMLElement;
const logoutButton = document.getElementById('logout-button') as HTMLButtonElement;
const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
const clearChatButton = document.getElementById('clear-chat-button') as HTMLButtonElement;

// Auth Modal
const authModal = document.getElementById('auth-modal') as HTMLElement;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const authTitle = document.getElementById('auth-title') as HTMLHeadingElement;
const authSubtitle = document.getElementById('auth-subtitle') as HTMLParagraphElement;
const authButton = document.getElementById('auth-button') as HTMLButtonElement;
const authToggleLink = document.getElementById('auth-toggle-link') as HTMLParagraphElement;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const passwordInput = document.getElementById('password-input') as HTMLInputElement;
const authError = document.getElementById('auth-error') as HTMLDivElement;

// Settings Modal
const settingsModal = document.getElementById('settings-modal') as HTMLElement;
const settingsForm = document.getElementById('settings-form') as HTMLFormElement;
const systemInstructionInput = document.getElementById('system-instruction-input') as HTMLTextAreaElement;
const settingsCancelButton = document.getElementById('settings-cancel-button') as HTMLButtonElement;

// File Upload
const attachFileButton = document.getElementById('attach-file-button') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const filePreviewContainer = document.getElementById('file-preview-container') as HTMLDivElement;


// --- Gemini API Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat: Chat;

// --- State Management ---
let isGenerating = false;
let currentUser: string | null = null;
let isLoginMode = true;
let attachedFile: {
    name: string;
    size: number;
    mimeType: string;
    data: string; // base64 data
    content?: string; // text content for text files
    isImage: boolean;
} | null = null;

type ChatMessagePart = Part;
type ChatMessage = { 
    role: 'user' | 'model'; 
    parts: ChatMessagePart[];
    file?: { name: string; mimeType: string; size: number };
};
let chatHistoryLog: ChatMessage[] = [];

// --- Constants and SVGs ---
const USER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
const MODEL_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.5C12.4142 2.5 12.75 2.83579 12.75 3.25V5.75C12.75 6.16421 12.4142 6.5 12 6.5C11.5858 6.5 11.25 6.16421 11.25 5.75V3.25C11.25 2.83579 11.5858 2.5 12 2.5ZM6.25 6.5C6.66421 6.5 7 6.16421 7 5.75L7 4.5C7 4.08579 6.66421 3.75 6.25 3.75C5.83579 3.75 5.5 4.08579 5.5 4.5L5.5 5.75C5.5 6.16421 5.83579 6.5 6.25 6.5ZM17.75 6.5C18.1642 6.5 18.5 6.16421 18.5 5.75L18.5 4.5C18.5 4.08579 18.1642 3.75 17.75 3.75C17.3358 3.75 17 4.08579 17 4.5L17 5.75C17 6.16421 17.3358 6.5 17.75 6.5ZM3.25 12.75H5.75C6.16421 12.75 6.5 12.4142 6.5 12C6.5 11.5858 6.16421 11.25 5.75 11.25H3.25C2.83579 11.25 2.5 11.5858 2.5 12C2.5 12.4142 2.83579 12.75 3.25 12.75ZM18.25 12.75H20.75C21.1642 12.75 21.5 12.4142 21.5 12C21.5 11.5858 21.1642 11.25 20.75 11.25H18.25C17.8358 11.25 17.5 11.5858 17.5 12C17.5 12.4142 17.8358 12.75 18.25 12.75ZM12 17.5C11.5858 17.5 11.25 17.8358 11.25 18.25V20.75C11.25 21.1642 11.5858 21.5 12 21.5C12.4142 21.5 12.75 21.1642 12.75 20.75V18.25C12.75 17.8358 12.4142 17.5 12 17.5ZM6.25 17.5C5.83579 17.5 5.5 17.8358 5.5 18.25L5.5 19.5C5.5 19.9142 5.83579 20.25 6.25 20.25C6.66421 20.25 7 19.9142 7 19.5L7 18.25C7 17.8358 6.66421 17.5 6.25 17.5ZM17.75 17.5C17.3358 17.5 17 17.8358 17 18.25L17 19.5C17 19.9142 17.3358 20.25 17.75 20.25C18.1642 20.25 18.5 19.9142 18.5 19.5L18.5 18.25C18.5 17.8358 18.1642 17.5 17.75 17.5Z" fill="currentColor"/></svg>`;
const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const COPIED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const SPEAKER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
const FILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;

/**
 * Creates the message structure with an avatar and content.
 */
function createMessageElement(sender: 'user' | 'model'): [HTMLElement, HTMLElement] {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', `${sender}-message`);

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.innerHTML = sender === 'user' ? USER_ICON : MODEL_ICON;

    const messageContent = document.createElement('div');
    messageContent.classList.add('message');

    wrapper.appendChild(avatar);
    wrapper.appendChild(messageContent);

    chatHistory.appendChild(wrapper);
    return [wrapper, messageContent];
}

function formatFileSize(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Appends a message to the chat history.
 */
async function displayMessage(
    message: ChatMessage,
    element?: HTMLElement,
): Promise<HTMLElement> {
    const isNew = !element;
    let messageElement = element;
    const { role, parts, file } = message;

    if (isNew) {
        const [, content] = createMessageElement(role);
        messageElement = content;
        if (role === 'user') {
            welcomeScreen.classList.add('hidden');
        }
    }

    if (!messageElement) {
        console.error("Message element could not be found or created.");
        return document.createElement('div');
    }

    // Handle thinking indicator
    const isThinking = role === 'model' && parts.length === 1 && 'text' in parts[0] && parts[0].text === '';
    if (isThinking) {
        messageElement.classList.add('thinking');
        messageElement.innerHTML = '<div class="spinner"></div>';
        return messageElement;
    }
    messageElement.classList.remove('thinking');
    
    // Combine text parts and handle image/file parts
    let fullText = '';
    let htmlContent = '';
    
    if (file) {
        htmlContent += `
            <div class="file-card">
                <div class="file-card-icon">${FILE_ICON}</div>
                <div class="file-card-info">
                    <div class="file-card-name">${file.name}</div>
                    <div class="file-card-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
    }

    for(const part of parts) {
        if ('text' in part) {
            fullText += part.text;
        } else if ('inlineData' in part) {
            const { mimeType, data } = part.inlineData;
            htmlContent += `<img src="data:${mimeType};base64,${data}" class="user-image" alt="User uploaded content">`;
        }
    }

    const rawMessage = fullText.replace(/▍$/, '');
    messageElement.dataset.rawMessage = rawMessage;
    // Only parse and add markdown if there's text content
    if (rawMessage.trim()) {
        htmlContent += await marked.parse(rawMessage, { async: true, gfm: true });
    }
    messageElement.innerHTML = htmlContent;

    // Add actions (copy, speak) for model messages
    if (role === 'model' && !messageElement.querySelector('.message-actions')) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.setAttribute('aria-label', 'Copy message');
        copyButton.innerHTML = COPY_ICON;
        copyButton.addEventListener('click', handleCopyClick);

        const speakerButton = document.createElement('button');
        speakerButton.className = 'speaker-button';
        speakerButton.setAttribute('aria-label', 'Read message aloud');
        speakerButton.innerHTML = SPEAKER_ICON;
        speakerButton.addEventListener('click', handleSpeakClick);

        actions.appendChild(speakerButton);
        actions.appendChild(copyButton);
        messageElement.appendChild(actions);
    }

    chatHistory.scrollTop = chatHistory.scrollHeight;
    return messageElement;
}


// --- UI Action Handlers ---

function handleCopyClick(e: MouseEvent) {
    const button = e.currentTarget as HTMLElement;
    const messageElement = button.closest('.message') as HTMLElement | null;

    if (messageElement?.dataset.rawMessage) {
        navigator.clipboard.writeText(messageElement.dataset.rawMessage).then(() => {
            button.innerHTML = COPIED_ICON;
            button.setAttribute('aria-label', 'Copied!');
            setTimeout(() => {
                button.innerHTML = COPY_ICON;
                button.setAttribute('aria-label', 'Copy message');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
}

function handleSpeakClick(e: MouseEvent) {
    const button = e.currentTarget as HTMLElement;
    const messageElement = button.closest('.message') as HTMLElement | null;
    if (!messageElement?.dataset.rawMessage) return;

    if (window.speechSynthesis.speaking) {
        if (button.classList.contains('speaking')) {
            window.speechSynthesis.cancel(); // Stop speaking
        } else {
             // Another message is speaking, stop it first
            window.speechSynthesis.cancel();
            speakText(messageElement.dataset.rawMessage, button);
        }
    } else {
        speakText(messageElement.dataset.rawMessage, button);
    }
}

function speakText(text: string, button: HTMLElement) {
    const utterance = new SpeechSynthesisUtterance(text);
    const allSpeakerButtons = document.querySelectorAll('.speaker-button');
    
    utterance.onstart = () => {
        allSpeakerButtons.forEach(btn => btn.classList.remove('speaking'));
        button.classList.add('speaking');
    };

    utterance.onend = () => {
        button.classList.remove('speaking');
    };
    
    utterance.onerror = () => {
        button.classList.remove('speaking');
        console.error("Speech synthesis error");
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * Toggles the state of form elements during message generation.
 */
function setFormState(isGenerating: boolean) {
    chatInput.disabled = isGenerating;
    sendButton.disabled = isGenerating;
    micButton.disabled = isGenerating;
    attachFileButton.disabled = isGenerating;
    stopButton.classList.toggle('hidden', !isGenerating);
    chatForm.classList.toggle('hidden', isGenerating);
}

/**
 * Handles the chat form submission.
 */
async function handleChatSubmit(e?: Event) {
    e?.preventDefault();
    const userPromptText = chatInput.value.trim();
    if (!userPromptText && !attachedFile) return;

    isGenerating = true;
    setFormState(true);
    window.speechSynthesis.cancel();

    // 1. Prepare parts for the model API call
    const modelParts: ChatMessagePart[] = [];
    let modelPromptText = userPromptText;

    if (attachedFile) {
        if (attachedFile.isImage) {
            modelParts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.data } });
        } else if (attachedFile.content) {
            const filePrompt = `The content of the file "${attachedFile.name}" is:\n\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n`;
            modelPromptText = filePrompt + modelPromptText;
        }
    }
    if (modelPromptText) {
        modelParts.push({ text: modelPromptText });
    }

    // Don't send if there's nothing to send (e.g., a non-text file without a prompt)
    if (modelParts.length === 0) {
        isGenerating = false;
        setFormState(false);
        return;
    }
    
    // 2. Prepare the message object for display and local history
    const userMessage: ChatMessage = { role: 'user', parts: [] };
    if (attachedFile) {
        if (attachedFile.isImage) {
            userMessage.parts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.data } });
        } else {
            userMessage.file = { name: attachedFile.name, mimeType: attachedFile.mimeType, size: attachedFile.size };
        }
    }
    if (userPromptText) {
        userMessage.parts.push({ text: userPromptText });
    }

    // 3. Update UI and send message
    chatHistoryLog.push(userMessage);
    saveChatHistory();
    await displayMessage(userMessage);

    // Reset form and file input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    removeAttachedFile();
    
    const modelMessageElement = await displayMessage({role: 'model', parts: [{text: ''}]});

    try {
        if (!chat) {
            throw new Error("Chat session is not initialized. Please try again.");
        }
        const responseStream = await chat.sendMessageStream({ message: modelParts });
        let fullResponse = '';
        for await (const chunk of responseStream) {
            if (!isGenerating) break;
            fullResponse += chunk.text;
            await displayMessage({ role: 'model', parts: [{text: fullResponse + '▍'}] }, modelMessageElement);
        }
        await displayMessage({ role: 'model', parts: [{text: fullResponse}] }, modelMessageElement);
        chatHistoryLog.push({ role: 'model', parts: [{text: fullResponse}] });
        saveChatHistory();
    } catch (error) {
        console.error('Error during chat:', error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
        await displayMessage({ role: 'model', parts: [{text: errorMessage}] }, modelMessageElement);
    } finally {
        isGenerating = false;
        setFormState(false);
        chatInput.focus();
    }
}


// --- UI Setup Functions ---

function setupTextarea() {
    function resizeTextarea() {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    }
    chatInput.addEventListener('input', resizeTextarea);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmit();
        }
    });
    resizeTextarea();
}

function setupFileUpload() {
    attachFileButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        removeAttachedFile(); // Clear any previous file

        const isImage = file.type.startsWith('image/');
        const isText = file.type.startsWith('text/') || /\.(js|py|json|html|css|md|ts|tsx|jsx)$/.test(file.name);

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const result = e.target?.result as string;
            
            let base64Data = '';
            let textContent: string | undefined = undefined;
            let previewUrl = '';

            if (isImage) {
                previewUrl = result;
                base64Data = result.split(',')[1];
            } else if (isText) {
                textContent = result;
            }

            attachedFile = { 
                name: file.name,
                size: file.size,
                mimeType: file.type, 
                data: base64Data,
                content: textContent,
                isImage,
            };

            // Create preview
            let previewHtml = '';
            if (isImage) {
                previewHtml = `<img src="${previewUrl}" alt="Image preview" />`;
            } else {
                previewHtml = `
                    <div class="file-card">
                        <div class="file-card-icon">${FILE_ICON}</div>
                        <div class="file-card-info">
                            <div class="file-card-name">${file.name}</div>
                            <div class="file-card-size">${formatFileSize(file.size)}</div>
                        </div>
                    </div>`;
            }
            filePreviewContainer.innerHTML = previewHtml + `<button type="button" id="remove-file-button" aria-label="Remove file">&times;</button>`;
            filePreviewContainer.classList.remove('hidden');
        };

        reader.onerror = (err) => {
            console.error("File reading error:", err);
            removeAttachedFile();
        }

        if (isImage) {
            reader.readAsDataURL(file);
        } else if (isText) {
            reader.readAsText(file);
        } else {
             // For other non-readable files, just show the card, don't read content
             attachedFile = { 
                name: file.name,
                size: file.size,
                mimeType: file.type, 
                data: '',
                content: undefined,
                isImage: false,
            };
            const previewHtml = `
                    <div class="file-card">
                        <div class="file-card-icon">${FILE_ICON}</div>
                        <div class="file-card-info">
                            <div class="file-card-name">${file.name}</div>
                            <div class="file-card-size">${formatFileSize(file.size)}</div>
                        </div>
                    </div>`;
            filePreviewContainer.innerHTML = previewHtml + `<button type="button" id="remove-file-button" aria-label="Remove file">&times;</button>`;
            filePreviewContainer.classList.remove('hidden');
        }
    });
    
    filePreviewContainer.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('#remove-file-button')) {
            removeAttachedFile();
        }
    });
}

function removeAttachedFile() {
    attachedFile = null;
    fileInput.value = ''; // Reset file input
    filePreviewContainer.classList.add('hidden');
    filePreviewContainer.innerHTML = '';
}


function setupSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micButton.style.display = 'none';
        console.warn('Speech Recognition API not supported in this browser.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    let isRecording = false;

    recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        chatInput.value = transcript;
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    };

    const toggleRecording = () => {
        if (isGenerating) return;
        isRecording = !isRecording;
        if (isRecording) {
            recognition.start();
            micButton.classList.add('recording');
            micButton.setAttribute('aria-label', 'Stop recording');
        } else {
            recognition.stop();
        }
    };

    recognition.onend = () => {
        isRecording = false;
        micButton.classList.remove('recording');
        micButton.setAttribute('aria-label', 'Use microphone');
    };

    recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        isRecording = false;
        micButton.classList.remove('recording');
        micButton.setAttribute('aria-label', 'Use microphone');
    };

    micButton.addEventListener('click', toggleRecording);
}

// --- Auth and History Management ---

function initAuth() {
    currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        startUserSession(currentUser);
    } else {
        authModal.classList.remove('hidden');
        usernameInput.focus();
    }
}

function startUserSession(username: string) {
    currentUser = username;
    sessionStorage.setItem('currentUser', username);

    userInfo.textContent = username;
    appHeader.classList.remove('hidden');
    authModal.classList.add('hidden');
    authError.classList.add('hidden');
    authForm.reset();

    loadChatHistory();
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    authError.classList.add('hidden');
    authForm.reset();
    if (isLoginMode) {
        authTitle.textContent = 'Login';
        authSubtitle.textContent = 'Welcome back! Please enter your credentials.';
        authButton.textContent = 'Login';
        authToggleLink.innerHTML = `Don't have an account? <a href="#">Sign Up</a>`;
    } else {
        authTitle.textContent = 'Sign Up';
        authSubtitle.textContent = 'Create a new account to save your chat history.';
        authButton.textContent = 'Sign Up';
        authToggleLink.innerHTML = `Already have an account? <a href="#">Login</a>`;
    }
}

function handleAuthSubmit(e: Event) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
        showAuthError("Username and password are required.");
        return;
    }

    let users = {};
    try {
        users = JSON.parse(localStorage.getItem('users') || '{}');
    } catch (err) {
        console.error("Could not parse users from localStorage", err);
        // If users are corrupted, default to an empty object, allowing signup.
        users = {};
    }

    if (isLoginMode) {
        if ((users as any)[username] && (users as any)[username].password === password) {
            startUserSession(username);
        } else {
            showAuthError("Invalid username or password.");
        }
    } else { // Sign up mode
        if ((users as any)[username]) {
            showAuthError("Username already exists.");
        } else {
            (users as any)[username] = { password, systemInstruction: '' };
            localStorage.setItem('users', JSON.stringify(users));
            startUserSession(username);
        }
    }
}

function showAuthError(message: string) {
    authError.textContent = message;
    authError.classList.remove('hidden');
}

function handleLogout() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    window.location.reload();
}

function loadChatHistory() {
    const savedHistory = localStorage.getItem(`chatHistory_${currentUser}`);
    chatHistory.innerHTML = '';
    const historyForModel: ChatMessage[] = [];
    
    chatHistoryLog = []; // Reset history log first

    if (savedHistory) {
        try {
            // Try to parse and assign
            chatHistoryLog = JSON.parse(savedHistory);
        } catch (e) {
            console.error("Failed to parse chat history from localStorage. Clearing history.", e);
            localStorage.removeItem(`chatHistory_${currentUser}`); // Remove corrupted entry
        }
    }
    
    if (chatHistoryLog.length > 0) {
        welcomeScreen.classList.add('hidden');
        chatHistoryLog.forEach(msg => {
            displayMessage(msg);
            // Reconstruct history for the model, converting file info back to prompts
            const modelMessage: ChatMessage = { role: msg.role, parts: [] };
            let messageText = '';
            if(msg.file) {
                 // NOTE: This loses file content on reload. A more robust solution
                 // would require a different storage strategy for large files.
                 messageText += `The user attached the file "${msg.file.name}".\n\n`;
            }
            for(const part of msg.parts){
                if('text' in part){
                    messageText += part.text;
                } else {
                    modelMessage.parts.push(part);
                }
            }
            if(messageText) modelMessage.parts.push({text: messageText});

            historyForModel.push(modelMessage);
        });
    } else {
         welcomeScreen.classList.remove('hidden');
    }

    let users: any = {};
    try {
        users = JSON.parse(localStorage.getItem('users') || '{}');
    } catch(e) {
        console.error("Failed to parse users from localStorage. Using default.", e);
        users = {}; // Default to empty if corrupt, so app doesn't crash.
    }
    const systemInstruction = users[currentUser!]?.systemInstruction || '';
    
    chat = ai.chats.create({ 
        model: 'gemini-2.5-flash', 
        history: historyForModel,
        config: {
            ...(systemInstruction && { systemInstruction })
        }
    });
}

function saveChatHistory() {
    if (currentUser) {
        localStorage.setItem(`chatHistory_${currentUser}`, JSON.stringify(chatHistoryLog));
    }
}

function handleClearChat() {
    if (confirm('Are you sure you want to clear the entire chat history? This action cannot be undone.')) {
        chatHistoryLog = [];
        saveChatHistory();
        loadChatHistory(); // This will re-initialize the chat and clear the display
    }
}

// --- Settings Management ---

function openSettingsModal() {
    let users: any = {};
    try {
        users = JSON.parse(localStorage.getItem('users') || '{}');
    } catch(e) {
        console.error("Failed to parse users from localStorage for settings.", e);
    }
    systemInstructionInput.value = users[currentUser!]?.systemInstruction || '';
    settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}

function handleSaveSettings(e: Event) {
    e.preventDefault();
    const newInstruction = systemInstructionInput.value.trim();
    let users: any = {};
    try {
        users = JSON.parse(localStorage.getItem('users') || '{}');
    } catch (e) {
        console.error("Failed to parse users from localStorage for saving settings.", e);
        // If it's corrupt, we might not be able to save. Let's proceed and it will likely overwrite.
    }
    if (users[currentUser!]) {
        users[currentUser!].systemInstruction = newInstruction;
        localStorage.setItem('users', JSON.stringify(users));
        // Re-initialize chat with new instruction
        loadChatHistory(); 
    }
    closeSettingsModal();
}

// --- Initial Setup ---
function initializeApp() {
    chatForm.addEventListener('submit', handleChatSubmit);
    stopButton.addEventListener('click', () => {
        isGenerating = false;
        setFormState(false);
        chatInput.focus();
    });
    authForm.addEventListener('submit', handleAuthSubmit);
    logoutButton.addEventListener('click', handleLogout);
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
    clearChatButton.addEventListener('click', handleClearChat);
    settingsButton.addEventListener('click', openSettingsModal);
    settingsForm.addEventListener('submit', handleSaveSettings);
    settingsCancelButton.addEventListener('click', closeSettingsModal);


    initAuth();
    setupTextarea();
    setupFileUpload();
    setupSpeechRecognition();
}

initializeApp();
