import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl  from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
//import {updateClients} from '@microsoft/kiota'

export default defineConfig({
	plugins: [
		basicSsl(),
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler']
			}
		}),
		tailwindcss(),
		/*
		{
			buildStart: ()=>{
				updateClients({
					cleanOutput: true,
					clearCache: true,
					workspacePath: "."
				});
			},
			name: "kiota"
		}
		*/
	],
})
