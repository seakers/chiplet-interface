<template>
    <div id="chat-column" v-if="chatOpen">
        <div id="chat-header">
            <h2>AI Assistant</h2>
        </div>
        <div id="chat-body">
            <p>Welcome! I can assist with analysis, generate reports, provide insights, and answer your chiplet design questions.</p>

            <div id="chat-messages" ref="messagesContainer">
                <div v-for="(msg, index) in messages" :key="index" :class="['chat-message', msg.sender, { 'rich-message': msg.rich }]">
                    <template v-if="msg.rich">
                        <span class="gpt-badge">GPT-4o</span>
                        <span v-html="renderRichMessage(msg.content)"></span>
                    </template>
                    <template v-else>
                        <span v-html="renderMessageWithLinks(msg.text)"></span>
                        <div v-if="msg.sender === 'chat' && msg.citations && msg.citations.length" class="citations">
                            <div v-for="c in msg.citations" :key="c.tag" class="citation-item">
                                <span class="citation-tag">[{{ c.tag }}]</span>
                                <span class="citation-path">{{ c.file_path || (c.metadata && c.metadata.file_path) || '' }}</span>
                            </div>
                        </div>
                    </template>
                </div>
                <!-- Show loading when waiting for a response -->
                <div v-if="loading" class="chat-message chat thinking-bubble">
                    <span class="thinking-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                    <span class="thinking-text">{{ thinkingText }}</span>
                </div>
                <div v-if="gettingData" class="chat-message chat">Loading Data...</div>
            </div>

            <div id="chat-input">
                <textarea v-model="chatMessage" placeholder="Type your message..."
                    @keydown.enter.exact.prevent="sendMessage" @keydown.enter.shift="insertNewLine" />
                <div id="chat-input-buttons" class="dropdown-wrapper">
                    <button @click="sendMessage">Send</button>
                    <button @click="showOptions = !showOptions">Model Options</button>
                    <ul v-if="showOptions" class="dropdown-options">
                        <li @click="dropdownSelectOption('Help')">Ask for Help</li>
                        <li @click="dropdownSelectOption('Clear')">Clear Chat</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, nextTick } from "vue";
import "../assets/styles.css";
import axios from "axios";
import { sendChat, clearChat, addInfo } from '@/services/chat';

export default {
    props: {
        chatOpen:          { type: Boolean, default: true },
        selectedModel:     { type: String,  default: null },
        run_id:            { type: String,  default: null },
        selectedObjectives: { type: Array,  default: () => [] },
    },
    emits: ["toggle-chat", "highlighting-response"],
    data() {
        return {
            chatMessage: "",
            messages: [],
            loading: false,
            gettingData: false,
            showOptions: false,
            thinkingText: 'Thinking...',
        };
    },
    setup() {
        const messagesContainer = ref(null);
        return { messagesContainer };
    },
    methods: {
        toggleChat() {
            this.$emit("toggle-chat");
        },
        async assistantMessage() {
            this.messages.push({ text: this.chatMessage, sender: "chat" });
            this.chatMessage = ""; // Clear input
        },
        async sendMessage() {
            if (this.chatMessage.trim() !== "") {
                // Add user message
                this.messages.push({ text: this.chatMessage, sender: "user" });

                const userMessage = this.chatMessage;
                this.chatMessage = ""; // Clear input
                
                // Smart thinking text based on query content
                const queryLower = userMessage.toLowerCase();
                if (queryLower.includes('highlight') || queryLower.includes('show me') || queryLower.includes('filter')) {
                    this.thinkingText = '🔍 Highlighting designs...';
                } else if (queryLower.includes('correlat') || queryLower.includes('dcorr') || queryLower.includes('relationship')) {
                    this.thinkingText = '📊 Running distance correlation...';
                } else if (queryLower.includes('rule') || queryLower.includes('pattern') || queryLower.includes('mining')) {
                    this.thinkingText = '⛏️ Mining design rules...';
                } else if (queryLower.includes('evaluat') || queryLower.includes('simulate')) {
                    this.thinkingText = '⚙️ Evaluating design...';
                } else if (queryLower.includes('energy')) {
                    this.thinkingText = '🔋 Analyzing energy...';
                } else if (queryLower.includes('optim') || queryLower.includes('run ga') || queryLower.includes('start')) {
                    this.thinkingText = '🚀 Starting optimization...';
                } else {
                    this.thinkingText = '🤔 Thinking...';
                }
                this.loading = true;
                const evaluator = this.selectedModel || 'CASCADE';

                await nextTick(); // Wait for DOM update
                this.scrollToBottom();

                console.log("[CHAT] Objectives: ", this.selectedObjectives)
                // Send message to backend
                const response = await sendChat({
                    role: "user",
                    content: userMessage,
                    evaluator: evaluator,
                    run_id: this.run_id,
                    objectives: this.selectedObjectives,
                });

                // If backend returns a 'message' field (optimization confirmation), show it immediately
                if (response.message) {
                    this.messages.push({ text: response.message, sender: "chat" });
                    // If a run was started via chat, fetch latest run directory and notify parent
                    if (response.run_started) {
                        try {
                            const latest = await axios.get('/api/get-latest-run-directory/');
                            if (latest.data && latest.data.status === 'success' && latest.data.run_directory) {
                                this.$emit('run-id-updated', latest.data.run_directory);
                            }
                        } catch (e) {
                            console.warn('Failed to get latest run directory after chat start:', e?.message || e);
                        }
                    }
                    
                    // Check if this is a highlighting response
                    if (response.highlighting_data) {
                        console.log('Chat: Received highlighting data:', response.highlighting_data);
                        this.$emit('highlighting-response', response.highlighting_data);
                    }

                    // Process frontend actions from agent tool calls
                    if (response.frontend_actions && response.frontend_actions.length > 0) {
                        response.frontend_actions.forEach(action => {
                            if (action.type === 'highlight_points') {
                                this.$emit('highlighting-response', action.data);
                            } else if (action.type === 'update_distance_correlation') {
                                this.$emit('agent-dcorr-update', action.data);
                            } else if (action.type === 'update_rule_mining') {
                                this.$emit('agent-rule-mining-update', action.data);
                            }
                        });
                    }
                    
                    this.loading = false;
                    await nextTick();
                    this.scrollToBottom();
                    return;
                }

                // Otherwise, show LLM response
                if (response.response) {
                    this.messages.push({ text: response.response, sender: "chat", citations: response.citations || [] });
                }

                // Process frontend actions from agent tool calls
                if (response.frontend_actions && response.frontend_actions.length > 0) {
                    response.frontend_actions.forEach(action => {
                        if (action.type === 'highlight_points') {
                            console.log('Chat: Agent triggered highlighting');
                            this.$emit('highlighting-response', action.data);
                        } else if (action.type === 'update_distance_correlation') {
                            console.log('Chat: Agent triggered distance correlation update');
                            this.$emit('agent-dcorr-update', action.data);
                        } else if (action.type === 'update_rule_mining') {
                            console.log('Chat: Agent triggered rule mining update');
                            this.$emit('agent-rule-mining-update', action.data);
                        }
                    });
                }

                this.loading = false;
                await nextTick();
                this.scrollToBottom();
            }
        },
        
        renderMessageWithLinks(text) {
            // Convert text to HTML with clickable links and basic markdown
            if (!text) return '';
            
            let html = text;
            
            // Convert markdown bold (**text**) to HTML bold
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // Convert bullet points (•) to HTML list items
            html = html.replace(/^•\s*(.*)$/gm, '<li>$1</li>');
            
            // Wrap consecutive list items in <ul> tags
            html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
            
            // Regular expression to match URLs (both absolute and relative)
            const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|\/media\/[^\s]+)/g;
            
            html = html.replace(urlRegex, (url) => {
                // Handle different URL types
                if (url.startsWith('http')) {
                    // Absolute URL
                    return `<a href="${url}" target="_blank" class="chat-link">${url}</a>`;
                } else if (url.startsWith('/media/')) {
                    // Media URL for downloads
                    const fullUrl = `${window.location.origin}${url}`;
                    return `<a href="${fullUrl}" download class="chat-link">${url}</a>`;
                } else if (url.startsWith('www.')) {
                    // www URL
                    const fullUrl = `http://${url}`;
                    return `<a href="${fullUrl}" target="_blank" class="chat-link">${url}</a>`;
                } else {
                    // Other relative URLs
                    const fullUrl = `${window.location.origin}${url}`;
                    return `<a href="${fullUrl}" class="chat-link">${url}</a>`;
                }
            });
            
            // Convert line breaks to <br> tags
            html = html.replace(/\n/g, '<br>');
            
            return html;
        },
        scrollToBottom() {
            if (this.messagesContainer) {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }
        },
        dropdownSelectOption(option) {
            if (option === "Clear") {
                this.messages = [];
                clearChat()
                    .then(() => {
                        console.log("Chat cleared on the backend.");
                    })
                    .catch((error) => {
                        console.error("Error clearing chat on the backend:", error);
                    });
            }
            this.showOptions = false;
        },
        // --- Markdown/anchor rendering for rich messages ---
        renderRichMessage(content) {
            // Simple markdown to anchor conversion for [Download Summary](url)
            return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="download-link">$1</a>')
                .replace(/\n/g, '<br>');
        },
        // --- Add a method to programmatically add a rich chat message ---
        addRichChatMessage(message, linkUrl, linkText = "View Report") {
            this.messages.push({
                sender: "chat",
                rich: true,
                content: `${message}\n\n👉 <a href="${linkUrl}" target="_blank" class="download-link">${linkText}</a>`
            });
            this.scrollToBottom();
        },
        // --- Fallback for missing summary ---
        addComparativeFallback() {
            this.messages.push({
                sender: "chat",
                rich: true,
                content: "Comparative run completed. Summary is not available."
            });
            this.scrollToBottom();
        },
        // --- Add a method to programmatically add a message ---
        addMessage(message, sender = "user") {
            this.messages.push({ text: message, sender: sender });
            this.scrollToBottom();
            
            // If it's a user message, automatically send it to get AI response
            if (sender === "user") {
                this.sendMessageToAI(message);
            }
        },
        // --- Send message to AI without user input ---
        async sendMessageToAI(message) {
            this.loading = true;
            
            try {
                // Send message to backend
                const response = await sendChat({
                    role: "user",
                    content: message
                });

                // If backend returns a 'message' field (optimization confirmation), show it immediately
                if (response.message) {
                    this.messages.push({ text: response.message, sender: "chat" });
                    if (response.run_started) {
                        try {
                            const latest = await axios.get('/api/get-latest-run-directory/');
                            if (latest.data && latest.data.status === 'success' && latest.data.run_directory) {
                                this.$emit('run-id-updated', latest.data.run_directory);
                            }
                        } catch (e) {
                            console.warn('Failed to get latest run directory after chat start:', e?.message || e);
                        }
                    }
                } else if (response.response) {
                    // Show LLM response
                    this.messages.push({ text: response.response, sender: "chat", citations: response.citations || [] });
                }

                // Process frontend actions from agent tool calls
                if (response.frontend_actions && response.frontend_actions.length > 0) {
                    response.frontend_actions.forEach(action => {
                        if (action.type === 'highlight_points') {
                            this.$emit('highlighting-response', action.data);
                        } else if (action.type === 'update_distance_correlation') {
                            this.$emit('agent-dcorr-update', action.data);
                        } else if (action.type === 'update_rule_mining') {
                            this.$emit('agent-rule-mining-update', action.data);
                        }
                    });
                }
            } catch (error) {
                console.error("Error sending message to AI:", error);
                this.messages.push({ text: "Sorry, I encountered an error. Please try again.", sender: "chat" });
            } finally {
                this.loading = false;
                await nextTick();
                this.scrollToBottom();
            }
        },
        // --- Send backend prompt without showing it in chat (for design analysis) ---
        async sendBackendPrompt(prompt) {
            this.loading = true;
            
            try {
                // Send prompt to backend without adding to chat history
                const response = await sendChat({
                    role: "user",
                    content: prompt
                });

                // Only show the AI response, not the prompt
                if (response.message) {
                    this.messages.push({ text: response.message, sender: "chat" });
                } else if (response.response) {
                    this.messages.push({ text: response.response, sender: "chat", citations: response.citations || [] });
                }
            } catch (error) {
                console.error("Error sending backend prompt:", error);
                this.messages.push({ text: "Sorry, I encountered an error analyzing the design. Please try again.", sender: "chat" });
            } finally {
                this.loading = false;
                await nextTick();
                this.scrollToBottom();
            }
        }
    },
};
</script>

<style scoped>
/* Chat Sidebar */
#chat-column {
    font-family: var(--primary-font);
    width: 100%;
    min-width: 200px;
    max-width: 320px;
    background: var(--background-color);
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    z-index: 1001;
}

/* Chat Links */
.chat-link {
    color: #337aff;
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.2s;
}

.chat-link:hover {
    color: #2356b8;
    text-decoration: none;
}

.chat-link:active {
    color: #1a4a9e;
}

/* Chat Header */
#chat-header {
    background: var(--primary-color);
    color: white;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 56px;
}

#chat-header button {
    display: none;
}

/* Chat Body */
#chat-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    padding: 15px;
    overflow: hidden;
}

#chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    scroll-behavior: smooth;
}

.chat-message {
    padding: 8px 12px;
    margin: 5px 0;
    border-radius: 10px;
    max-width: 70%;
    font-size: 14px;
    word-wrap: break-word;
    text-align: center; /* ✅ center the text */
    align-self: center; /* ✅ center the bubble in the container */
}

/* User messages (align right) */
.chat-message.user {
    background: var(--primary-color);
    color: white;
    align-self: flex-end;
    text-align: left;
}

/* Chat responses (align left) */
.chat-message.chat {
    background: #f1f1f1;
    color: black;
    align-self: flex-start;
    text-align: left;
}

/* Rich message styling */
.rich-message {
    background: #eaf1ff;
    border: 1.5px solid #337aff;
    color: #2356b8;
    padding: 14px 16px;
    margin: 12px 0;
    font-size: 15px;
    font-weight: 500;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.06);
    position: relative;
}
.gpt-badge {
    background: #337aff;
    color: #fff;
    font-size: 0.85em;
    font-weight: 700;
    border-radius: 6px;
    padding: 2px 8px;
    margin-right: 8px;
    vertical-align: middle;
}
.download-link {
    color: #337aff;
    font-weight: 600;
    text-decoration: underline;
    margin-left: 6px;
}

#chat-input {
    padding: 10px;
    border-top: 1px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: center;
}

#chat-input-buttons {
    width: 100%;
    border-top: 1px;
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
}

#chat-input-buttons button {
    width: 100%;
    margin-top: 0px;
    padding: 10px;
    background: var(--primary-color);
    color: white;
    border-radius: 5px;
    border: none;
    cursor: pointer;
}

.dropdown-wrapper {
    position: relative;
    display: inline-block;
}

.dropdown-options {
    position: absolute;
    bottom: 100%;
    right: 0;
    margin-bottom: 10px;
    padding: 5px;
    list-style: none;
    background: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

.dropdown-options li {
    padding: 5px 10px;
    cursor: pointer;
    align-items: center;
}

.dropdown-options li:hover {
    background-color: #f0f0f0;
    border-radius: 5px;
}

textarea {
    width: 100%;
    height: 100px;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #ccc;
    resize: none;
}

button {
    width: 30%;
    margin-top: 0px;
    padding: 10px;
    background: var(--primary-color);
    color: white;
    border-radius: 5px;
    border: none;
    cursor: pointer;
}

/* Thinking animation */
.thinking-bubble {
    display: flex !important;
    align-items: center;
    gap: 0.5rem;
    background: #eaf1ff !important;
    border: 1px solid #d1e7ff;
    animation: fadeIn 0.3s ease;
}

.thinking-dots {
    display: flex;
    gap: 3px;
}

.thinking-dots .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #337aff;
    animation: bounce 1.4s infinite ease-in-out both;
}

.thinking-dots .dot:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots .dot:nth-child(2) { animation-delay: -0.16s; }
.thinking-dots .dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
    0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.thinking-text {
    font-size: 0.85rem;
    color: #337aff;
    font-weight: 500;
}
</style>