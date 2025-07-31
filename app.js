// Elements
const fileInput = document.getElementById("attachment");
const confirmBtn = document.getElementById("confirm-file");
const fileList = document.getElementById("confirmed-files");
const form = document.getElementById("todo-form");
const todoContainer = document.getElementById("todo-list-container");
const submitBtn = document.getElementById("submit-btn");

// State
let selectedFiles = [];
let editingIndex = null;
const todos = [];

// Load todos from localStorage on start
function loadTodosFromLocalStorage() {
  const storedTodos = localStorage.getItem("todos");
  if (storedTodos) {
    try {
      const parsed = JSON.parse(storedTodos);
      if (Array.isArray(parsed)) {
        todos.push(...parsed);
      }
    } catch (e) {
      console.error("Failed to parse todos from localStorage", e);
    }
  }
}

// Save todos to localStorage
function saveTodosToLocalStorage() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

// Confirm File Button Click
confirmBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
  if (exists) {
    alert("This file is already added.");
    fileInput.value = "";
    return;
  }

  selectedFiles.push(file);
  updateFileListUI();
  fileInput.value = "";
});

// Render File List UI
function updateFileListUI() {
  fileList.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";

    const fileName = document.createElement("span");
    fileName.textContent = file.name;

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm btn-outline-danger";
    removeBtn.textContent = "✕";
    removeBtn.onclick = () => {
      selectedFiles.splice(index, 1);
      updateFileListUI();
    };

    li.appendChild(fileName);
    li.appendChild(removeBtn);
    fileList.appendChild(li);
  });
}

// Validate and Submit Todo
function validateAndSubmitTodo() {
  const titleInput = document.getElementById("title");
  const dueDateInput = document.getElementById("due-date");

  const title = titleInput.value.trim();
  const description = document.getElementById("description").value.trim();
  const dueDate = dueDateInput.value;
  const assignee = document.getElementById("assignee").value;
  const createdDate = new Date().toISOString().split("T")[0];

  // Validation: required fields
  if (!title || !dueDate) {
    if (!title) titleInput.classList.add("is-invalid");
    else titleInput.classList.remove("is-invalid");

    if (!dueDate) dueDateInput.classList.add("is-invalid");
    else dueDateInput.classList.remove("is-invalid");
    return;
  }

  // Clear validation for presence
  titleInput.classList.remove("is-invalid");
  dueDateInput.classList.remove("is-invalid");

  // Validate dueDate is today or future
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDueDate = new Date(dueDate);
  if (selectedDueDate < today) {
    dueDateInput.classList.add("is-invalid");
    alert("Due date cannot be in the past. Please select today or a future date.");
    return;
  }
  dueDateInput.classList.remove("is-invalid");

  const newTodo = {
    title,
    description,
    dueDate,
    assignee,
    createdDate,
    attachments: [...selectedFiles],
    done: false,
  };

  if (editingIndex === null) {
    todos.push(newTodo);
  } else {
    todos[editingIndex] = newTodo;
    editingIndex = null;
  }

  saveTodosToLocalStorage();
  submitBtn.textContent = "+ Add Task";
  renderTodoTable();
  resetTodoForm();
}

// Render Todos to UI
function renderTodoTable() {
  todoContainer.innerHTML = "";

  todos.forEach((todo, index) => {
    const card = document.createElement("div");
    card.className = "border rounded p-3 mb-3";

    // Attachment rendering
    const attachmentsHTML =
      todo.attachments.length === 1
        ? `<div>
            <i class="bi bi-paperclip"></i>
            <a href="${URL.createObjectURL(todo.attachments[0])}" target="_blank" class="text-decoration-none ms-1">
              ${todo.attachments[0].name}
            </a>
          </div>`
        : todo.attachments.length > 1
        ? `<div class="dropdown d-inline">
             <span class="badge bg-secondary dropdown-toggle" data-bs-toggle="dropdown" role="button">
               <i class="bi bi-paperclip"></i> ${todo.attachments.length} attachments
             </span>
             <ul class="dropdown-menu">
               ${todo.attachments
                 .map(
                   (file) =>
                     `<li><a class="dropdown-item" href="${URL.createObjectURL(file)}" target="_blank">${file.name}</a></li>`
                 )
                 .join("")}
             </ul>
           </div>`
        : "";

    card.innerHTML = `
      <div class="d-flex justify-content-between">
        <div>
          <h5 class="mb-1 ${todo.done ? 'text-decoration-line-through text-muted' : ''}">${todo.title}</h5>
          <p class="mb-2">${todo.description || ""}</p>
          <div class="d-flex flex-wrap gap-2">
            <div><i class="bi bi-calendar-event"></i> <small class="text-muted">Due: ${todo.dueDate}</small></div>
            ${
              todo.assignee
                ? `<span class="badge bg-info text-white"><i class="bi bi-person"></i> ${todo.assignee}</span>`
                : ""
            }
            ${attachmentsHTML}
          </div>
        </div>
        <div class="text-end">
          <small class="text-muted">Created: ${todo.createdDate}</small><br>
          <button class="btn btn-sm btn-outline-success me-1" onclick="toggleDone(${index})" title="Mark done">
            <i class="bi ${todo.done ? 'bi-check-circle-fill' : 'bi-check-circle'}"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editTodo(${index})" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTodo(${index})" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    todoContainer.appendChild(card);
  });
}

// Edit Todo
function editTodo(index) {
  const todo = todos[index];
  editingIndex = index;

  document.getElementById("title").value = todo.title;
  document.getElementById("description").value = todo.description;
  document.getElementById("due-date").value = todo.dueDate;
  document.getElementById("assignee").value = todo.assignee;

  selectedFiles = [...todo.attachments];
  updateFileListUI();

  submitBtn.textContent = "Update Task";
}

// Toggle Done
function toggleDone(index) {
  todos[index].done = !todos[index].done;
  saveTodosToLocalStorage();
  renderTodoTable();
}

// Delete Todo
function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodosToLocalStorage();
  renderTodoTable();
}

// Reset Form
function resetTodoForm() {
  form.reset();
  selectedFiles = [];
  updateFileListUI();
  editingIndex = null;
  submitBtn.textContent = "+ Add Task";
}

// Set minimum due date to today on page load, with localstorage
document.addEventListener("DOMContentLoaded", () => {
  const dueDateInput = document.getElementById("due-date");
  const todayStr = new Date().toISOString().split("T")[0];
  dueDateInput.setAttribute("min", todayStr);

  loadTodosFromLocalStorage();
  renderTodoTable();
});

// Handle form submit
form.addEventListener("submit", function (e) {
  e.preventDefault();
  validateAndSubmitTodo();
});
