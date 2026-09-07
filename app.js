document.documentElement.classList.add("js");

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const tabs = [...document.querySelectorAll("[data-tab]")];
const freePanel = document.querySelector("#free-panel");
const aiPanel = document.querySelector("#ai-panel");
let timerStarted = false;
let remaining = 300;

function selectQuoteTab(name) {
  tabs.forEach((tab) => {
    const selected = tab.dataset.tab === name;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  freePanel.hidden = name !== "free";
  aiPanel.hidden = name !== "ai";
  if (name === "ai" && !timerStarted) startTimer();
}
tabs.forEach((tab) => tab.addEventListener("click", () => selectQuoteTab(tab.dataset.tab)));

const packageSelect = document.querySelector("#package-select");
document.querySelectorAll(".package-start").forEach((button) => {
  button.addEventListener("click", () => {
    packageSelect.value = button.dataset.package;
    selectQuoteTab("free");
  });
});

const quoteForm = document.querySelector("#quote-form");
const success = document.querySelector("#ticket-success");
const draftKey = "ibq-html-prototype-draft";
try {
  const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
  if (draft) Object.entries(draft).forEach(([name, value]) => {
    const field = quoteForm.elements.namedItem(name);
    if (field) field.value = value;
  });
} catch { localStorage.removeItem(draftKey); }

quoteForm.addEventListener("input", () => {
  localStorage.setItem(draftKey, JSON.stringify(Object.fromEntries(new FormData(quoteForm).entries())));
});
quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!quoteForm.reportValidity()) return;
  localStorage.removeItem(draftKey);
  quoteForm.hidden = true;
  success.hidden = false;
  success.scrollIntoView({ behavior: "smooth", block: "center" });
});

const prompts = [
  ["Business name", "Let’s name the idea.", "Start with the business you want people to find."],
  ["Owner name", "Who is behind it?", "Add the person IBQ should work with."],
  ["Phone, email, or Instagram", "How should people reach you?", "Use the public contact point that belongs on the site."],
  ["Address or service area", "Where do you work?", "Add a location or describe the area you serve."],
  ["Pages", "What pages do you need?", "Try Home, Services, Gallery, Contact, and Booking if needed."],
  ["Services", "What do you offer?", "Include names, prices, and durations when you know them."],
  ["Photos", "What visuals are ready?", "Think hero image, work shots, logo, and optional team photos."],
  ["Booking, Stripe, or custom scope", "Anything beyond the basics?", "Add booking needs, payments, AI tools, agents, or feeds."],
];
let promptIndex = 0;
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatLabel = document.querySelector("#chat-label");
const chatBody = document.querySelector("#chat-body");
const ticketTitle = document.querySelector("#ticket-title");
const ticketFields = document.querySelector("#ticket-fields");

function startTimer() {
  timerStarted = true;
  const timer = window.setInterval(() => {
    remaining -= 1;
    document.querySelector("#timer").textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    if (remaining <= 0) {
      clearInterval(timer);
      chatInput.disabled = true;
      chatForm.querySelector("button").disabled = true;
      chatForm.querySelector("button").textContent = "Chat ended";
    }
  }, 1000);
}

function showNextPrompt() {
  if (promptIndex >= prompts.length) {
    chatForm.hidden = true;
    const finish = document.createElement("div");
    finish.className = "bot-message";
    finish.innerHTML = "<small>IBQ AI</small><h3>Your ticket is ready.</h3><p>The working app lets you confirm it and continue to the deposit.</p>";
    chatBody.append(finish);
    return;
  }
  const [, title, copy] = prompts[promptIndex];
  const message = document.createElement("div");
  message.className = "bot-message";
  const small = document.createElement("small"); small.textContent = "IBQ AI";
  const heading = document.createElement("h3"); heading.textContent = title;
  const paragraph = document.createElement("p"); paragraph.textContent = copy;
  message.append(small, heading, paragraph);
  chatBody.append(message);
  chatLabel.textContent = prompts[promptIndex][0];
  chatInput.value = "";
  chatInput.focus();
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const answer = chatInput.value.trim();
  if (!answer || remaining <= 0) return;
  const label = prompts[promptIndex][0];
  const bubble = document.createElement("div");
  bubble.className = "user-message";
  bubble.textContent = answer;
  chatBody.append(bubble);
  if (promptIndex === 0) ticketTitle.textContent = answer;
  if (ticketFields.querySelector(":scope > p")) ticketFields.textContent = "";
  const field = document.createElement("div"); field.className = "ticket-field";
  const fieldLabel = document.createElement("small"); fieldLabel.textContent = label;
  const fieldValue = document.createElement("p"); fieldValue.textContent = answer;
  field.append(fieldLabel, fieldValue); ticketFields.append(field);
  promptIndex += 1;
  showNextPrompt();
  chatBody.scrollTop = chatBody.scrollHeight;
});

document.querySelectorAll(".faq-list details").forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    document.querySelectorAll(".faq-list details").forEach((other) => { if (other !== detail) other.open = false; });
  });
});

document.querySelector("#upload-demo").addEventListener("click", () => {
  document.querySelector("#upload-message").textContent = "Prototype action complete — reference slot added.";
});
