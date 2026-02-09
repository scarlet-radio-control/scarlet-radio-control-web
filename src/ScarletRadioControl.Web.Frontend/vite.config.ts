import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailcindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler']
			}
		}),
		tailcindcss(),
	],
})
