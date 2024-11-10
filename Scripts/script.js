const sendButton = document.querySelector('.send-button');
const messageInput = document.querySelector('.message-input');
const chatMessages = document.querySelector('.chat-messages');

sendButton.addEventListener('click', sendMessage);

function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'sent');
        messageElement.innerText = messageText;
        
        chatMessages.appendChild(messageElement);
        messageInput.value = '';
        
        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
