# DomTreeView

DomTreeView is a small React + Vite learning tool that lets you paste HTML and inspect the DOM tree created by the browser.

## Features

- Paste or edit HTML in a live playground
- Toggle auto-update, text nodes, and comment nodes
- Explore a collapsible DOM tree inspired by browser DevTools
- Inspect node details like path, type, category, and attributes
- See the rendered HTML next to the parsed tree
- Use built-in sample snippets for practice

## Run locally

Install dependencies:

npm install

Start the development server:

npm run dev

Create a production build:

npm run build

## Learning ideas

- Remove or rearrange tags and see how the browser repairs the DOM
- Toggle text nodes on and off to understand whitespace and inline content
- Add HTML comments and inspect where they appear in the tree
- Compare semantic tags like `header`, `main`, and `section` with generic `div` layouts
