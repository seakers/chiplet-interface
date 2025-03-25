import axios from "axios";

export default {
    getItems() {
        return axios.get(API_URL);
    },
    createItem(itemData) {
        return axios.post(API_URL, itemData);
    },
};