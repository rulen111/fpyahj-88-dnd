// StateManager - handles LocalStorage and state management
class StateManager {
    constructor() {
        this.state = {
            columns: {
                todo: [],
                'in-progress': [],
                done: []
            }
        };
        this.loadState();
    }

    loadState() {
        const savedState = localStorage.getItem('trello-state');
        if (savedState) {
            try {
                this.state = JSON.parse(savedState);
            } catch (e) {
                console.error('Failed to parse saved state:', e);
                alert('Ошибка загрузки сохраненных данных. Начинаем с пустой доски.');
            }
        }
    }

    saveState() {
        localStorage.setItem('trello-state', JSON.stringify(this.state));
    }

    addCard(columnId, card) {
        this.state.columns[columnId].push(card);
        this.saveState();
    }

    deleteCard(columnId, index) {
        this.state.columns[columnId].splice(index, 1);
        this.saveState();
    }

    moveCard(fromColumn, fromIndex, toColumn, toIndex) {
        if (fromColumn === toColumn && fromIndex === toIndex) return;

        const card = this.state.columns[fromColumn].splice(fromIndex, 1)[0];
        
        // Adjust target index if moving within same column
        if (fromColumn === toColumn && fromIndex < toIndex) {
            toIndex--;
        }
        
        // Insert card at target
        this.state.columns[toColumn].splice(toIndex, 0, card);
        this.saveState();
    }

    getState() {
        return this.state;
    }
}

// DragDropManager - handles drag and drop functionality
class DragDropManager {
    constructor(stateManager, cardManager) {
        this.stateManager = stateManager;
        this.cardManager = cardManager;
        this.draggedCard = null;
        this.dragOffset = { x: 0, y: 0 };
    }

    bindDragEvents() {
        document.addEventListener("mousemove", (e) => this.handleDrag(e));
        document.addEventListener("mouseup", (e) => this.endDrag(e));
    }

    startDrag(e, cardElement, columnId, index) {
        // Don't start drag if clicking on delete button
        if (e.target.classList.contains('delete-btn')) {
            return;
        }
        
        e.preventDefault();
        
        // Calculate offset from mouse to card position
        const rect = cardElement.getBoundingClientRect();
        
        this.draggedCard = {
            element: cardElement,
            columnId: columnId,
            index: index,
            originalText: this.stateManager.getState().columns[columnId][index].text,
            originalHeight: rect.height
        };
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        // Add dragging class and set cursor
        cardElement.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        
        cardElement.style.position = 'fixed';
        cardElement.style.left = (e.clientX - this.dragOffset.x) + 'px';
        cardElement.style.top = (e.clientY - this.dragOffset.y) + 'px';
        cardElement.style.width = rect.width + 'px';
        cardElement.style.pointerEvents = 'none';
        cardElement.style.zIndex = '1000';

        // Hide original card
        const originalCard = document.querySelector(`[data-column="${columnId}"][data-index="${index}"]`);
        if (originalCard && originalCard !== cardElement) {
            originalCard.style.opacity = '0';
        }
    }

    handleDrag(e) {
        if (!this.draggedCard) return;

        const cardElement = this.draggedCard.element;
        
        // Update card position
        cardElement.style.left = (e.clientX - this.dragOffset.x) + 'px';
        cardElement.style.top = (e.clientY - this.dragOffset.y) + 'px';

        // Find drop target
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        if (elementBelow) {
            this.updateDropIndicator(elementBelow, e.clientY);
        }
    }

    updateDropIndicator(elementBelow, mouseY) {
        // Remove existing indicators
        document.querySelectorAll('.drop-indicator').forEach(indicator => {
            indicator.remove();
        });

        // Find the appropriate drop target
        let targetColumn = null;
        let targetIndex = null;

        // Check if we're over a card
        if (elementBelow.classList.contains('card')) {
            const columnId = elementBelow.dataset.column;
            const index = parseInt(elementBelow.dataset.index);
            
            const rect = elementBelow.getBoundingClientRect();
            const shouldInsertAfter = mouseY > rect.top + rect.height / 2;
            
            targetColumn = columnId;
            targetIndex = shouldInsertAfter ? index + 1 : index;
        }
        // Check if we're over a cards container
        else if (elementBelow.classList.contains('cards-container')) {
            targetColumn = elementBelow.dataset.column;
            targetIndex = this.stateManager.getState().columns[targetColumn].length;
        }

        if (targetColumn && targetIndex !== null) {
            this.showDropIndicator(targetColumn, targetIndex);
        }
    }

    showDropIndicator(columnId, index) {
        const container = document.querySelector(`[data-column="${columnId}"] .cards-container`);
        const cards = container.querySelectorAll('.card');
        
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator active';
        
        // Set height based on the stored original height
        if (this.draggedCard && this.draggedCard.originalHeight) {
            indicator.style.height = this.draggedCard.originalHeight + 'px';
        }

        if (index >= cards.length) {
            container.append(indicator);
        } else {
            container.insertBefore(indicator, cards[index]);
        }
    }

    endDrag(e) {
        if (!this.draggedCard) return;

        const cardElement = this.draggedCard.element;
        
        // Remove dragging class and reset styles
        cardElement.classList.remove('dragging');
        document.body.style.cursor = '';
        cardElement.style.position = '';
        cardElement.style.left = '';
        cardElement.style.top = '';
        cardElement.style.width = '';
        cardElement.style.pointerEvents = '';
        cardElement.style.zIndex = '';
        cardElement.style.opacity = '';

        // Find drop target
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        let targetColumn = null;
        let targetIndex = null;

        if (elementBelow) {
            if (elementBelow.classList.contains('card')) {
                const columnId = elementBelow.dataset.column;
                const index = parseInt(elementBelow.dataset.index);
                const rect = elementBelow.getBoundingClientRect();
                const shouldInsertAfter = e.clientY > rect.top + rect.height / 2;
                
                targetColumn = columnId;
                targetIndex = shouldInsertAfter ? index + 1 : index;
            } else if (elementBelow.classList.contains('cards-container')) {
                targetColumn = elementBelow.dataset.column;
                targetIndex = this.stateManager.getState().columns[targetColumn].length;
            }
        }

        // Move card if we have a valid target
        if (targetColumn !== null && targetIndex !== null) {
            this.stateManager.moveCard(this.draggedCard.columnId, this.draggedCard.index, targetColumn, targetIndex);
            this.cardManager.render();
        }

        // Clean up
        document.querySelectorAll('.drop-indicator').forEach(indicator => {
            indicator.remove();
        });

        this.draggedCard = null;
        this.dragOffset = { x: 0, y: 0 };
    }

    attachDragToCard(cardElement, columnId, index) {
        cardElement.addEventListener('mousedown', (e) => this.startDrag(e, cardElement, columnId, index));
    }
}

// TrelloBoardWidget - main component using binding pattern
export class TrelloBoardWidget {
    constructor(parentEl) {
        this.parentEl = parentEl;
        this.stateManager = new StateManager();
        this.dragDropManager = new DragDropManager(this.stateManager, this);
        this.currentColumn = null;
        
        this.onAddCardClick = this.onAddCardClick.bind(this);
        this.onAddCardConfirm = this.onAddCardConfirm.bind(this);
        this.onAddCardCancel = this.onAddCardCancel.bind(this);
        this.onCardKeydown = this.onCardKeydown.bind(this);
    }

    static get markup() {
        return `
            <div class="board">
                <div class="column" data-column="todo">
                    <h2 class="column-title">To Do</h2>
                    <div class="cards-container" data-column="todo"></div>
                    <div class="add-card-section" data-column="todo">
                        <button class="add-card-btn" data-column="todo">+ Add another card</button>
                        <div class="card-input-area hidden">
                            <textarea class="card-text-input" placeholder="Enter card text..."></textarea>
                            <div class="card-input-buttons">
                                <button class="add-card-confirm">Add Card</button>
                                <button class="add-card-cancel">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="column" data-column="in-progress">
                    <h2 class="column-title">In Progress</h2>
                    <div class="cards-container" data-column="in-progress"></div>
                    <div class="add-card-section" data-column="in-progress">
                        <button class="add-card-btn" data-column="in-progress">+ Add another card</button>
                        <div class="card-input-area hidden">
                            <textarea class="card-text-input" placeholder="Enter card text..."></textarea>
                            <div class="card-input-buttons">
                                <button class="add-card-confirm">Add Card</button>
                                <button class="add-card-cancel">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="column" data-column="done">
                    <h2 class="column-title">Done</h2>
                    <div class="cards-container" data-column="done"></div>
                    <div class="add-card-section" data-column="done">
                        <button class="add-card-btn" data-column="done">+ Add another card</button>
                        <div class="card-input-area hidden">
                            <textarea class="card-text-input" placeholder="Enter card text..."></textarea>
                            <div class="card-input-buttons">
                                <button class="add-card-confirm">Add Card</button>
                                <button class="add-card-cancel">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static get selector() {
        return '.board';
    }

    static get addCardBtnSelector() {
        return '.add-card-btn';
    }

    static get cardInputAreaSelector() {
        return '.card-input-area';
    }

    static get cardTextInputSelector() {
        return '.card-text-input';
    }

    static get addCardConfirmSelector() {
        return '.add-card-confirm';
    }

    static get addCardCancelSelector() {
        return '.add-card-cancel';
    }

    bindToDOM() {
        this.parentEl.innerHTML = TrelloBoardWidget.markup;
        
        this.element = this.parentEl.querySelector(TrelloBoardWidget.selector);
        
        // Bind event listeners
        this.bindEvents();
        
        // Initialize drag and drop
        this.dragDropManager.bindDragEvents();
        
        // Render initial state
        this.render();
    }

    bindEvents() {
        this.element.querySelectorAll(TrelloBoardWidget.addCardBtnSelector).forEach((btn) => {
            btn.addEventListener("click", this.onAddCardClick);
        });
    }

    onAddCardClick(e) {
        const columnId = e.target.dataset.column;
        this.showAddCardInput(columnId);
    }

    showAddCardInput(columnId) {
        this.currentColumn = columnId;
        const section = this.element.querySelector(`[data-column="${columnId}"] .add-card-section`);
        const btn = section.querySelector(TrelloBoardWidget.addCardBtnSelector);
        const inputArea = section.querySelector(TrelloBoardWidget.cardInputAreaSelector);
        const input = inputArea.querySelector(TrelloBoardWidget.cardTextInputSelector);
        
        btn.classList.add('hidden');
        inputArea.classList.remove('hidden');
        input.value = '';
        input.focus();
        
        const confirmBtn = inputArea.querySelector(TrelloBoardWidget.addCardConfirmSelector);
        const cancelBtn = inputArea.querySelector(TrelloBoardWidget.addCardCancelSelector);
        
        // Remove existing listeners to avoid duplicates
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        // Add new listeners
        inputArea.querySelector(TrelloBoardWidget.addCardConfirmSelector).addEventListener('click', this.onAddCardConfirm);
        inputArea.querySelector(TrelloBoardWidget.addCardCancelSelector).addEventListener('click', this.onAddCardCancel);
        
        // Handle keyboard events
        input.addEventListener('keydown', this.onCardKeydown);
    }

    hideAddCardInput(columnId) {
        if (!columnId) return;
        
        const section = this.element.querySelector(`[data-column="${columnId}"] .add-card-section`);
        if (!section) return;
        
        const btn = section.querySelector(TrelloBoardWidget.addCardBtnSelector);
        const inputArea = section.querySelector(TrelloBoardWidget.cardInputAreaSelector);
        
        if (btn) btn.classList.remove('hidden');
        if (inputArea) inputArea.classList.add('hidden');
        this.currentColumn = null;
    }

    onAddCardConfirm() {
        this.addCard();
        this.hideAddCardInput(this.currentColumn);
    }

    onAddCardCancel() {
        this.hideAddCardInput(this.currentColumn);
    }

    onCardKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.onAddCardConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.onAddCardCancel();
        }
    }

    addCard() {
        if (!this.currentColumn) return;
        
        const section = this.element.querySelector(`[data-column="${this.currentColumn}"] .add-card-section`);
        if (!section) return;
        
        const input = section.querySelector(TrelloBoardWidget.cardTextInputSelector);
        if (!input) return;
        
        const text = input.value.trim();

        if (text) {
            const newCard = {
                id: Date.now().toString(),
                text: text,
            };

            this.stateManager.addCard(this.currentColumn, newCard);
            this.render();
        }
    }

    render() {
        const state = this.stateManager.getState();
        Object.keys(state.columns).forEach(columnId => {
            const container = this.element.querySelector(`[data-column="${columnId}"] .cards-container`);
            container.innerHTML = '';
            
            state.columns[columnId].forEach((card, index) => {
                const cardElement = this.createCardElement(card, columnId, index);
                container.append(cardElement);
            });
        });
    }

    createCardElement(card, columnId, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.draggable = false;
        cardDiv.dataset.column = columnId;
        cardDiv.dataset.index = index;
        cardDiv.textContent = card.text;
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.stateManager.deleteCard(columnId, index);
            this.render();
        });
        deleteBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        cardDiv.append(deleteBtn);
        
        // Attach drag events
        this.dragDropManager.attachDragToCard(cardDiv, columnId, index);
        
        return cardDiv;
    }
}
