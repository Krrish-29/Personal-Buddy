const input = document.getElementById("queryInput");
const chatBox = document.getElementById("chatBox");
const submitBtn = document.getElementById("submitBtn");
const mainScroll = document.getElementById("mainScroll");

function scrollToBottom() {
  mainScroll.scrollTop = mainScroll.scrollHeight;
}

function handleSubmit() {
  const userInput = input.value.trim();
  if (!userInput) return;

  const userMessage = document.createElement("div");
  userMessage.className = "user-message message";
  userMessage.innerHTML = `<strong>You:</strong> ${userInput}`;
  chatBox.appendChild(userMessage);
  scrollToBottom();
  input.value = "";

  fetch("/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: userInput })
  })
  .then(res => res.json())
  .then(data => {
    const botMessage = document.createElement("div");
    botMessage.className = "bot-message message";
    botMessage.innerHTML = `<strong>IPU AI:</strong> ${data?.response || 'No response from server.'}`;
    chatBox.appendChild(botMessage);
    scrollToBottom();
  })
  .catch(err => {
    const errorMessage = document.createElement("div");
    errorMessage.className = "bot-message message";
    errorMessage.innerHTML = `<strong>AI:</strong> Error communicating with server.`;
    chatBox.appendChild(errorMessage);
    scrollToBottom();
  });
}

submitBtn.addEventListener("click", handleSubmit);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSubmit();
});

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
}
