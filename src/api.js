import axios from "axios";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"; // OpenAI endpoint
const OPENAI_API_KEY = "your-api-key-here"; // Replace with your API key

export const sendMessageToChatGPT = async (message) => {
    try {
        const response = await axios.post(
            OPENAI_API_URL,
            {
                model: "gpt-4o-mini", // Choose model (e.g., "gpt-3.5-turbo" for cheaper option)
                messages: [{
                    role: "developer",
                    content: "You are a helpful assistant. You respond precisely to user queries, with just a few words."
                },
                {
                    role: "user",
                    content: message
                }],
                temperature: 1.0,
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error communicating with ChatGPT:", error);
        return "Error: Could not get a response.";
    }
};

const API_URL = 'http://localhost:8000/api/items/';

export default {
    getItems() {
        return axios.get(API_URL);
    },
    createItem(itemData) {
        return axios.post(API_URL, itemData);
    },
};