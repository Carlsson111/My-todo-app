// === IndexedDB Todo App with File Attachments and Simple Done Filter === //

// Elements
const fileInput = document.getElementById("attachment");
const confirmBtn = document.getElementById("confirm-file");
const fileList = document.getElementById("confirmed-files");
const form = document.getElementById("todo-form");
const todoContainer = document.getElementById("todo-list-container");
const submitBtn = document.getElementById("submit-btn");
const toggleDoneBtn = document.getElementById("toggle-done-btn");
const clearDoneBtn = document.getElementById("clear-done-btn");

// State
let selectedFiles = [];
let editingId = null;
let todos = [];
let db;
let showOnlyDone = false;

// === IndexedDB Setup === //
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TodoDB", 1);

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains("todos")) {
        db.createObjectStore("todos", { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

function saveTodoToDB(todo) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("todos", "readwrite");
    const store = tx.objectStore("todos");
    store.put(todo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadTodosFromDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("todos", "readonly");
    const store = tx.objectStore("todos");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteTodoFromDB(id) {
  const tx = db.transaction("todos", "readwrite");
  const store = tx.objectStore("todos");
  store.delete(id);
}

// === File Confirmation === //
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

// === Todo Submission === //
async function validateAndSubmitTodo() {
  const titleInput = document.getElementById("title");
  const dueDateInput = document.getElementById("due-date");

  const title = titleInput.value.trim();
  const description = document.getElementById("description").value.trim();
  const dueDate = dueDateInput.value;
  const assignee = document.getElementById("assignee").value;
  const createdDate = new Date().toISOString().split("T")[0];

  if (!title || !dueDate) {
    if (!title) titleInput.classList.add("is-invalid");
    else titleInput.classList.remove("is-invalid");

    if (!dueDate) dueDateInput.classList.add("is-invalid");
    else dueDateInput.classList.remove("is-invalid");
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDueDate = new Date(dueDate);
  if (selectedDueDate < today) {
    dueDateInput.classList.add("is-invalid");
    alert("Due date cannot be in the past.");
    return;
  }

  const id = editingId || Date.now();
  const newTodo = {
    id,
    title,
    description,
    dueDate,
    assignee,
    createdDate,
    attachments: [...selectedFiles],
    done: false,
  };

  if (!editingId) todos.push(newTodo);
  else todos = todos.map(t => (t.id === id ? newTodo : t));

  await saveTodoToDB(newTodo);

  editingId = null;
  submitBtn.textContent = "+ Add Task";
  renderTodoTable();
  resetTodoForm();
}

// === Render Todos === //
function renderTodoTable() {
  todoContainer.innerHTML = "";

  let filteredTodos = showOnlyDone ? todos.filter(t => t.done) : todos;

  filteredTodos.forEach((todo) => {
    const card = document.createElement("div");
    card.className = "border rounded p-3 mb-3";

    const attachmentsHTML = todo.attachments?.length
      ? `<div class="dropdown d-inline">
           <span class="badge bg-secondary dropdown-toggle" data-bs-toggle="dropdown" role="button">
             <i class="bi bi-paperclip"></i> ${todo.attachments.length} attachment(s)
           </span>
           <ul class="dropdown-menu">
             ${todo.attachments
               .map(file => `<li><a class="dropdown-item" href="${URL.createObjectURL(file)}" target="_blank">${file.name}</a></li>`)
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
            ${todo.assignee ? `<span class="badge bg-info text-white"><i class="bi bi-person"></i> ${todo.assignee}</span>` : ""}
            ${attachmentsHTML}
          </div>
        </div>
        <div class="text-end">
          <small class="text-muted">Created: ${todo.createdDate}</small><br>
          <button class="btn btn-sm btn-outline-success me-1" onclick="toggleDone(${todo.id})" title="Mark done">
            <i class="bi ${todo.done ? 'bi-check-circle-fill' : 'bi-check-circle'}"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editTodo(${todo.id})" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTodo(${todo.id})" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    todoContainer.appendChild(card);
  });
}

// === Edit, Delete, Toggle === //
function editTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  editingId = id;

  document.getElementById("title").value = todo.title;
  document.getElementById("description").value = todo.description;
  document.getElementById("due-date").value = todo.dueDate;
  document.getElementById("assignee").value = todo.assignee;

  selectedFiles = [...todo.attachments];
  updateFileListUI();
  submitBtn.textContent = "Update Task";
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  deleteTodoFromDB(id);
  renderTodoTable();
}

function toggleDone(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  saveTodoToDB(todo);
  renderTodoTable();
}

function clearDoneTasks() {
  const doneTasks = todos.filter(t => t.done);
  doneTasks.forEach(task => deleteTodoFromDB(task.id));
  todos = todos.filter(t => !t.done);
  renderTodoTable();
}

// === Form Reset === //
function resetTodoForm() {
  form.reset();
  selectedFiles = [];
  updateFileListUI();
  editingId = null;
  submitBtn.textContent = "+ Add Task";
}

// === Init === //
document.addEventListener("DOMContentLoaded", async () => {
  const todayStr = new Date().toISOString().split("T")[0];
  document.getElementById("due-date").setAttribute("min", todayStr);

  await openDB();
  todos = await loadTodosFromDB();
  renderTodoTable();

  toggleDoneBtn.addEventListener("click", () => {
    showOnlyDone = !showOnlyDone;
    toggleDoneBtn.textContent = showOnlyDone ? "Show All" : "Show Done";
    renderTodoTable();
  });

  clearDoneBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all done tasks?")) {
      clearDoneTasks();
    }
  });
});

form.addEventListener("submit", function (e) {
  e.preventDefault();
  validateAndSubmitTodo();
});
