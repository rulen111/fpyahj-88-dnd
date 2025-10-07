console.log("Trello-like Task Manager loaded");

class TaskManager {
  constructor() {
    this.state = {
      columns: {
        todo: [],
        "in-progress": [],
        done: [],
      },
    };

    this.draggedCard = null;
    this.dragOffset = { x: 0, y: 0 };
    this.currentColumn = null;

    this.init();
  }

  init() {
    this.loadState();
    this.render();
    this.bindEvents();
  }

  loadState() {
    const savedState = localStorage.getItem("trello-state");
    if (savedState) {
      try {
        this.state = JSON.parse(savedState);
      } catch (e) {
        console.error("Failed to parse saved state:", e);
      }
    }
  }

  saveState() {
    localStorage.setItem("trello-state", JSON.stringify(this.state));
  }

  render() {
    Object.keys(this.state.columns).forEach((columnId) => {
      const container = document.querySelector(
        `[data-column="${columnId}"] .cards-container`,
      );
      container.innerHTML = "";

      this.state.columns[columnId].forEach((card, index) => {
        const cardElement = this.createCardElement(card, columnId, index);
        container.appendChild(cardElement);
      });
    });
  }

  createCardElement(card, columnId, index) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.draggable = false;
    cardDiv.dataset.column = columnId;
    cardDiv.dataset.index = index;
    cardDiv.textContent = card.text;

    // Add delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteCard(columnId, index);
    });
    deleteBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    cardDiv.appendChild(deleteBtn);

    // Add drag event listeners
    cardDiv.addEventListener("mousedown", (e) =>
      this.startDrag(e, cardDiv, columnId, index),
    );

    return cardDiv;
  }

  bindEvents() {
    // Add card buttons
    document.querySelectorAll(".add-card-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const columnId = e.target.dataset.column;
        this.showAddCardModal(columnId);
      });
    });

    // Modal events
    document
      .querySelector(".add-card-confirm")
      .addEventListener("click", () => {
        this.addCard();
      });

    document.querySelector(".add-card-cancel").addEventListener("click", () => {
      this.hideAddCardModal();
    });

    // Close modal on background click
    document
      .querySelector(".card-input-modal")
      .addEventListener("click", (e) => {
        if (e.target.classList.contains("card-input-modal")) {
          this.hideAddCardModal();
        }
      });

    // Global mouse events for drag and drop
    document.addEventListener("mousemove", (e) => this.handleDrag(e));
    document.addEventListener("mouseup", (e) => this.endDrag(e));
  }

  showAddCardModal(columnId) {
    this.currentColumn = columnId;
    const modal = document.querySelector(".card-input-modal");
    const input = document.querySelector(".card-text-input");

    modal.classList.remove("hidden");
    input.value = "";
    input.focus();
  }

  hideAddCardModal() {
    document.querySelector(".card-input-modal").classList.add("hidden");
    this.currentColumn = null;
  }

  addCard() {
    const input = document.querySelector(".card-text-input");
    const text = input.value.trim();

    if (text && this.currentColumn) {
      const newCard = {
        id: Date.now().toString(),
        text: text,
      };

      this.state.columns[this.currentColumn].push(newCard);
      this.saveState();
      this.render();
      this.hideAddCardModal();
    }
  }

  deleteCard(columnId, index) {
    this.state.columns[columnId].splice(index, 1);
    this.saveState();
    this.render();
  }

  startDrag(e, cardElement, columnId, index) {
    // Don't start drag if clicking on delete button
    if (e.target.classList.contains("delete-btn")) {
      return;
    }

    e.preventDefault();

    this.draggedCard = {
      element: cardElement,
      columnId: columnId,
      index: index,
      originalText: this.state.columns[columnId][index].text,
    };

    // Calculate offset from mouse to card position
    const rect = cardElement.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;

    // Add dragging class and set cursor
    cardElement.classList.add("dragging");
    document.body.style.cursor = "grabbing";

    // Position card at mouse cursor
    cardElement.style.position = "fixed";
    cardElement.style.left = e.clientX - this.dragOffset.x + "px";
    cardElement.style.top = e.clientY - this.dragOffset.y + "px";
    cardElement.style.width = rect.width + "px";
    cardElement.style.pointerEvents = "none";
    cardElement.style.zIndex = "1000";

    // Hide original card
    const originalCard = document.querySelector(
      `[data-column="${columnId}"][data-index="${index}"]`,
    );
    if (originalCard && originalCard !== cardElement) {
      originalCard.style.opacity = "0";
    }
  }

  handleDrag(e) {
    if (!this.draggedCard) return;

    const cardElement = this.draggedCard.element;

    // Update card position
    cardElement.style.left = e.clientX - this.dragOffset.x + "px";
    cardElement.style.top = e.clientY - this.dragOffset.y + "px";

    // Find drop target
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    if (elementBelow) {
      this.updateDropIndicator(elementBelow, e.clientY);
    }
  }

  updateDropIndicator(elementBelow, mouseY) {
    // Remove existing indicators
    document.querySelectorAll(".drop-indicator").forEach((indicator) => {
      indicator.remove();
    });

    // Find the appropriate drop target
    let targetColumn = null;
    let targetIndex = null;

    // Check if we're over a card
    if (elementBelow.classList.contains("card")) {
      const columnId = elementBelow.dataset.column;
      const index = parseInt(elementBelow.dataset.index);

      const rect = elementBelow.getBoundingClientRect();
      const shouldInsertAfter = mouseY > rect.top + rect.height / 2;

      targetColumn = columnId;
      targetIndex = shouldInsertAfter ? index + 1 : index;
    }
    // Check if we're over a cards container
    else if (elementBelow.classList.contains("cards-container")) {
      targetColumn = elementBelow.dataset.column;
      targetIndex = this.state.columns[targetColumn].length;
    }

    if (targetColumn && targetIndex !== null) {
      this.showDropIndicator(targetColumn, targetIndex);
    }
  }

  showDropIndicator(columnId, index) {
    const container = document.querySelector(
      `[data-column="${columnId}"] .cards-container`,
    );
    const cards = container.querySelectorAll(".card");

    const indicator = document.createElement("div");
    indicator.className = "drop-indicator active";

    if (index >= cards.length) {
      container.appendChild(indicator);
    } else {
      container.insertBefore(indicator, cards[index]);
    }
  }

  endDrag(e) {
    if (!this.draggedCard) return;

    const cardElement = this.draggedCard.element;

    cardElement.classList.remove("dragging");
    document.body.style.cursor = "";
    cardElement.style.position = "";
    cardElement.style.left = "";
    cardElement.style.top = "";
    cardElement.style.width = "";
    cardElement.style.pointerEvents = "";
    cardElement.style.zIndex = "";
    cardElement.style.opacity = "";

    // Find drop target
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    let targetColumn = null;
    let targetIndex = null;

    if (elementBelow) {
      if (elementBelow.classList.contains("card")) {
        const columnId = elementBelow.dataset.column;
        const index = parseInt(elementBelow.dataset.index);
        const rect = elementBelow.getBoundingClientRect();
        const shouldInsertAfter = e.clientY > rect.top + rect.height / 2;

        targetColumn = columnId;
        targetIndex = shouldInsertAfter ? index + 1 : index;
      } else if (elementBelow.classList.contains("cards-container")) {
        targetColumn = elementBelow.dataset.column;
        targetIndex = this.state.columns[targetColumn].length;
      }
    }

    if (targetColumn !== null && targetIndex !== null) {
      this.moveCard(
        this.draggedCard.columnId,
        this.draggedCard.index,
        targetColumn,
        targetIndex,
      );
    }

    document.querySelectorAll(".drop-indicator").forEach((indicator) => {
      indicator.remove();
    });

    this.draggedCard = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  moveCard(fromColumn, fromIndex, toColumn, toIndex) {
    if (fromColumn === toColumn && fromIndex === toIndex) return;

    // Remove card from source
    const card = this.state.columns[fromColumn].splice(fromIndex, 1)[0];

    if (fromColumn === toColumn && fromIndex < toIndex) {
      toIndex--;
    }

    // Insert card at target
    this.state.columns[toColumn].splice(toIndex, 0, card);

    this.saveState();
    this.render();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new TaskManager();
});
