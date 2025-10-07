# Trello-like Task Manager

[![CI](https://github.com/rulen111/fpyahj-88-dnd/actions/workflows/web.yml/badge.svg)](https://github.com/rulen111/fpyahj-88-dnd/actions/workflows/web.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://rulen111.github.io/fpyahj-88-dnd/)

## Описание

Trello-подобная система управления задачами с функциональностью перетаскивания карточек между колонками.

## Функциональность

- **3 фиксированные колонки**: To Do, In Progress, Done
- **Добавление карточек**: кнопка "Add another card" в каждой колонке
- **Удаление карточек**: кнопка "×" появляется при наведении на карточку
- **Перетаскивание карточек**: между колонками и внутри колонок
- **Сохранение состояния**: все изменения сохраняются в LocalStorage
- **Визуальная обратная связь**: индикаторы места вставки при перетаскивании

## Запуск

```bash
yarn install
yarn start
```

## Сборка

```bash
yarn build
```
