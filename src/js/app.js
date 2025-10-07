import '../css/style.css';
import { TrelloBoardWidget } from './widget.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    if (container) {
        const widget = new TrelloBoardWidget(container);
        widget.bindToDOM();
    }
});