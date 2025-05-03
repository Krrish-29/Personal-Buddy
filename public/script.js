const input = document.getElementById("queryInput");
const chatBox = document.getElementById("chatBox");
const submitBtn = document.getElementById("submitBtn");
const mainScroll = document.getElementById("mainScroll");

function scrollToBottom() {
  mainScroll.scrollTop = mainScroll.scrollHeight;
}
const openBtn = document.getElementById("openUploadModal");
const closeBtn = document.getElementById("closeModal");
const modal = document.getElementById("uploadModal");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");

// Open modal
openBtn.addEventListener("click", () => {
  modal.style.display = "flex";
});

// Close modal
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Optional: Close modal by clicking outside content
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Upload logic
uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "#000";
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.borderColor = "#ccc";
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) uploadFile(file);
});

function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  fetch("http://localhost:5000/upload", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "File uploaded and processed.");
      modal.style.display = "none";
    })
    .catch(() => {
      alert("❌ Upload failed. Make sure backend is running.");
    });
}

function handleSubmit() {
  const userInput = input.value.trim();
  if (!userInput) {
    submitBtn.disabled = false;
    return;
  }

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
    botMessage.innerHTML = `<strong>AI:</strong> ${data?.response || 'No response from server.'}`;
    chatBox.appendChild(botMessage);
    scrollToBottom();
  })
  .catch(err => {
    const errorMessage = document.createElement("div");
    errorMessage.className = "bot-message message";
    errorMessage.innerHTML = `<strong>AI:</strong> Error communicating with server.`;
    chatBox.appendChild(errorMessage);
    scrollToBottom();
  })
  .finally(() => {
    submitBtn.disabled = false;
  });
}

submitBtn.addEventListener("click", handleSubmit);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSubmit();
});

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

// On load
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
}
