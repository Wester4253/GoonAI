/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat } from '@google/genai';
import { marked } from 'marked';

// Use 'as' to assert the type of the element.
const chatHistory = document.getElementById('chat-history') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const sendButton = chatForm.querySelector('button') as HTMLButtonElement;

// Adhere to Gemini API guidelines for initialization and model usage.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const chat: Chat = ai.chats.create({ model: 'gemini-2.5-flash' });

/**
 * Appends a message to the chat history.
 * @param message The message content (can be markdown).
 * @param sender The sender of the message.
 * @param element An optional existing element to update.
 * @returns The created or updated message element.
 */
async function displayMessage(
  message: string,
  sender: 'user' | 'model',
  element?: HTMLElement,
): Promise<HTMLElement> {
  const messageElement = element || document.createElement('div');

  if (!element) {
    messageElement.classList.add('message', `${sender}-message`);
    chatHistory.appendChild(messageElement);
  }

  // Sanitize and render markdown.
  messageElement.innerHTML = await marked.parse(message, {
    async: true,
    gfm: true,
  });

  // Scroll to the bottom of the chat history.
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return messageElement;
}

/**
 * Creates and displays a loading indicator for the model's response.
 * @returns The loading indicator element.
 */
function showLoadingIndicator(): HTMLElement {
  const modelMessageElement = document.createElement('div');
  modelMessageElement.classList.add('message', 'model-message', 'thinking');
  modelMessageElement.innerHTML = '<div class="spinner"></div>';
  chatHistory.appendChild(modelMessageElement);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return modelMessageElement;
}

/**
 * Handles the chat form submission.
 * @param e The form submission event.
 */
async function handleChatSubmit(e: Event) {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) {
    return;
  }

  // Disable form elements to prevent multiple submissions.
  chatInput.value = '';
  chatInput.disabled = true;
  sendButton.disabled = true;

  // Display the user's message immediately.
  await displayMessage(message, 'user');

  // Show a loading indicator while waiting for the model's response.
  const modelMessageElement = showLoadingIndicator();

  try {
    const responseStream = await chat.sendMessageStream({ message });

    let fullResponse = '';
    let firstChunk = true;

    for await (const chunk of responseStream) {
      if (firstChunk) {
        // Remove the loading spinner on the first chunk.
        modelMessageElement.classList.remove('thinking');
        modelMessageElement.innerHTML = '';
        firstChunk = false;
      }
      fullResponse += chunk.text;
      // Display the streaming response with a blinking cursor effect.
      await displayMessage(fullResponse + '▍', 'model', modelMessageElement);
    }

    // Update the message with the final, complete response.
    await displayMessage(fullResponse, 'model', modelMessageElement);
  } catch (error) {
    console.error('Error during chat:', error);
    const errorMessage = 'An error occurred. Please try again.';
    await displayMessage(errorMessage, 'model', modelMessageElement);
  } finally {
    // Re-enable form elements.
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.focus();
  }
}

chatForm.addEventListener('submit', handleChatSubmit);
