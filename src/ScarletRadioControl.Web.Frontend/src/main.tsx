import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const htmlElement = document.getElementById('root')!;
const root = createRoot(htmlElement)
root.render(
	<StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
  </StrictMode>,
)
