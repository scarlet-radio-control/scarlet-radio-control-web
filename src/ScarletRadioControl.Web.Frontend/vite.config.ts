import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl  from '@vitejs/plugin-basic-ssl'
import tailcindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		basicSsl(),
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler']
			}
		}),
		tailcindcss(),
	],
})
