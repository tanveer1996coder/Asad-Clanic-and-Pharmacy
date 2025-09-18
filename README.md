Asad Clanic and Pharmacy

Medical Store Audit frontend (React)

Overview

This workspace contains a React frontend for a small medical store sales/audit app. The frontend lives in the `frontend/` folder and uses Supabase as the backend.

Quick start

1. Install dependencies

   npm install

2. Run locally (dev server)

   npm start

3. Build for production

   npm run build

Environment

- The app expects Supabase credentials (URL and ANON key) configured in `frontend/.env.local` or via environment variables used by `frontend/src/supabaseClient.js`.

Repository layout

- frontend/ — React app (CRA)

Helpful commands (PowerShell)

# from repository root

cd "c:\Users\user\Desktop\Medical Store Audit\frontend"

# install

npm install

# run

npm start

# build

npm run build

How to push to GitHub

1. Create a new repo on GitHub (do not initialize with README).
2. From repository root run:

   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main

Replace the remote URL with your new GitHub repo URL.

License

Add a LICENSE file as needed.
