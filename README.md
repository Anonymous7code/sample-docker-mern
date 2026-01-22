# Full Stack TypeScript Application

A simple full-stack application with Node.js/Express backend and Vite/React frontend.

## Project Structure

```
project-root/
├── server/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── client/
    ├── src/
    │   ├── App.tsx
    │   ├── App.css
    │   └── main.tsx
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `client/src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

4. Create `client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Full Stack TypeScript App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

5. Create `client/src/index.css`:
```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

6. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

1. Make sure both backend and frontend servers are running
2. Open `http://localhost:5173` in your browser
3. Click the "Call Hello API" button
4. See the response from the backend displayed on the page

## API Endpoints

- `GET /api/hello` - Returns a hello message with timestamp
- `GET /health` - Health check endpoint

## Technologies Used

### Backend
- Node.js
- Express
- TypeScript
- CORS

### Frontend
- React
- TypeScript
- Vite
- CSS

## Docker Deployment

### Project Structure
```
project-root/
├── deployment/
│   ├── docker/
│   │   ├── server.Dockerfile
│   │   ├── client.Dockerfile
│   │   └── nginx.conf
│   ├── docker-compose.yml
│   ├── build.sh
│   └── Makefile
├── server/
│   └── .dockerignore
└── client/
    └── .dockerignore
```

### Building Docker Images

#### Option 1: Using build script
```bash
cd deployment
chmod +x build.sh
./build.sh
```

#### Option 2: Using Makefile
```bash
cd deployment
make build-all
```

#### Option 3: Manual build
```bash
# Build server
docker build -f deployment/docker/server.Dockerfile -t fullstack-app-server:latest .

# Build client
docker build -f deployment/docker/client.Dockerfile -t fullstack-app-client:latest .
```

### Running with Docker Compose
```bash
cd deployment
docker-compose up -d
```

Access the application:
- Frontend: http://localhost:8080
- Backend: http://localhost:3001

### Other Commands
```bash
# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# Clean up
make clean
```

## Production Features

### Server Dockerfile
- Multi-stage build for optimal image size
- Non-root user for security
- Production dependencies only
- Health checks included
- Alpine-based for minimal footprint

### Client Dockerfile
- Multi-stage build with Nginx
- Optimized static asset serving
- Gzip compression enabled
- Security headers configured
- Non-root user
- Health checks included

### Security Features
- No-new-privileges security option
- Read-only root filesystem
- Resource limits (CPU/Memory)
- Network isolation
- Hidden Nginx version
- Proper file permissions