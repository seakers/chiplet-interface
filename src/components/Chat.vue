<template>
    <div id="chat-column" v-if="chatOpen">
        <div id="chat-header">
            <h2>Chat (GPT4o-mini)</h2>
            <button @click="toggleChat">×</button>
        </div>
        <div id="chat-body">
            <p>Welcome to the chat! Ask your questions here.</p>

            <div id="chat-messages" ref="messagesContainer">
                <div v-for="(msg, index) in messages" :key="index" :class="['chat-message', msg.sender]">
                    {{ msg.text }}
                </div>
                <!-- Show loading when waiting for a response -->
                <div v-if="loading" class="chat-message chat">Typing...</div>
            </div>

            <div id="chat-input">
                <textarea 
                    v-model="chatMessage" 
                    placeholder="Type your message..."
                    @keydown.enter.exact.prevent="sendMessage" 
                    @keydown.enter.shift="insertNewLine"
                />
                <button @click="sendMessage">Send</button>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, nextTick } from "vue";
import "../assets/styles.css";
import axios from "axios";

export default {
    props: {
        chatOpen: Boolean,
    },
    emits: ["toggle-chat"],
    data() {
        return {
            chatMessage: "",
            messages: [],
            loading: false, // Shows loading while waiting for response
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
        async sendMessage() {
            if (this.chatMessage.trim() !== "") {
                // Add user message
                this.messages.push({ text: this.chatMessage, sender: "user" });

                const userMessage = this.chatMessage;
                this.chatMessage = ""; // Clear input
                this.loading = true; // Indicate loading state

                await nextTick(); // Wait for DOM update
                this.scrollToBottom();

                // Send message to ChatGPT
                // const response = await sendMessageToChatGPT(userMessage);
                const response = await axios.get('http://127.0.0.1:8000/api/chat-response/',
                    {
                        params: {
                            role: "user",
                            content: userMessage
                        }
                    }
                );
                // response = response.data.data;
                this.messages.push({ text: response.data.response, sender: "chat" });

                this.loading = false;
                await nextTick();
                this.scrollToBottom();
            }
        },
        scrollToBottom() {
            if (this.messagesContainer) {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }
        },
    },
};
</script>

<style scoped>
/* Chat Sidebar */
#chat-column {
    font-family: var(--primary-font);
    width: 500px;
    background: var(--background-color);
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
}

/* Chat Header */
#chat-header {
    background: var(--primary-color);
    color: white;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 80px;
}

#chat-header button {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
}

/* Chat Body */
#chat-body {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    padding: 15px;
}

#chat-messages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    max-height: 500px;
    scroll-behavior: smooth;
}

/* General message style */
.chat-message {
    padding: 8px 12px;
    margin: 5px 0;
    border-radius: 10px;
    max-width: 70%;
    word-wrap: break-word;
}

/* User messages (align right) */
.user {
    background: var(--primary-color);
    color: white;
    align-self: flex-end;
}

/* Chat responses (align left) */
.chat {
    background: #f1f1f1;
    color: black;
    align-self: flex-start;
}

.chat-message.chat {
    text-align: left;
    font-style: italic;
    color: gray;
}

textarea {
    width: 80%;
    height: 100px;
    margin-top: 10px;
    margin-bottom: 10px;
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
</style>