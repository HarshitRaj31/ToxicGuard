# 🛡️ ToxicGuard — Toxic Speech Detection System

**Detect toxic speech. Promote safer conversations.**

ToxicGuard is a web-based toxic speech detection system that analyzes user-submitted text and identifies potentially harmful language using a Python AI service, a Node.js backend, and MongoDB.

## 🌐 Live Demo

- **Frontend:** https://toxic-guard-iota.vercel.app/
- **Backend API:** https://toxicguard-api-k87a.onrender.com/
- **AI Service:** https://toxicguard-ai-5u8m.onrender.com/

## ✨ Features

- AI-assisted toxic speech detection
- Text classification with confidence scores and detected labels
- Custom banned-word detection
- User authentication
- Per-user analysis history
- Activity logging
- WebAuthn/passkey support
- Responsive web interface

*Feature availability depends on the current implementation and deployment status.*

## 🧰 Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI service | Python |
| HTTP client | Axios |
| Authentication | JWT, WebAuthn |
| Frontend hosting | Vercel |
| Backend and AI hosting | Render |

## 🏗️ Architecture

```text
User / Browser
      |
      v
React + Vite Frontend (Vercel)
      |
      v
Node.js + Express API (Render)
      |                     |
      v                     v
MongoDB Database      Python AI Service (Render)
```

### Analysis Flow

1. A user submits text through the frontend.
2. The frontend sends the request to the Node.js API.
3. The backend checks configured custom banned-word rules.
4. If no custom word matches, the backend forwards the text to the Python AI service.
5. The AI service returns its classification, confidence score, and detected labels.
6. The backend saves a successful analysis to MongoDB.
7. The frontend displays the result and can retrieve the user's analysis history.

## 📁 Project Structure

The exact folder names may vary in your repository. A typical layout is:

```text
ToxicGuard/
├── client/                 # React + Vite frontend
├── server/                 # Node.js + Express backend
│   ├── models/              # Mongoose models
│   ├── routes/              # API routes
│   ├── middleware/          # Authentication and middleware
│   ├── app.js
│   └── server.js
├── ai-service/              # Python AI service
├── README.md
└── .gitignore
```

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- Python and pip
- MongoDB or MongoDB Atlas
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/HarshitRaj31/ToxicGuard.git
cd ToxicGuard
```

### 2. Frontend Setup

From your frontend directory:

```bash
npm install
```

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the development server:

```bash
npm run dev
```

### 3. Node.js Backend Setup

From the backend directory:

```bash
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://127.0.0.1:8000
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173
```

Replace placeholder values with your own configuration. Use the AI service's actual local port and the startup command defined by your project.

Start the backend using the command configured in `package.json`, for example:

```bash
npm start
```

### 4. Python AI Service Setup

Navigate to the Python AI service directory. If the project includes a `requirements.txt`, install dependencies with:

```bash
pip install -r requirements.txt
```

Start the service using the command configured in your Python project. The backend expects a `/predict` endpoint that accepts text and returns a compatible JSON response.

## 🔐 Environment Variables

Configure production variables in the appropriate hosting dashboards. Do not commit secrets to GitHub.

### Frontend — Vercel

| Variable | Purpose | Production value |
|---|---|---|
| `VITE_API_URL` | Base URL of the Node API | `https://toxicguard-api-k87a.onrender.com/api` |

### Backend — Render

| Variable | Purpose | Production value |
|---|---|---|
| `PORT` | Server port; Render supplies this | Usually supplied by Render |
| `MONGO_URI` | MongoDB connection string | Your private connection string |
| `JWT_SECRET` | JWT signing secret | Your private secret |
| `CLIENT_URL` | Frontend origin allowed by CORS | `https://toxic-guard-iota.vercel.app` |
| `AI_SERVICE_URL` | Base URL of the Python AI service | `https://toxicguard-ai-5u8m.onrender.com` |
| `WEBAUTHN_RP_ID` | WebAuthn relying-party domain | `toxic-guard-iota.vercel.app` |
| `WEBAUTHN_ORIGIN` | Expected frontend origin for WebAuthn | `https://toxic-guard-iota.vercel.app` |

For local development, set `VITE_API_URL` to `http://localhost:5000/api` and configure the backend variables for your local MongoDB and AI service.

## 🔌 API Route Overview

The backend includes these route prefixes:

| Route | Purpose |
|---|---|
| `/api/auth` | Authentication |
| `/api/analysis` | Text analysis and analysis history |
| `/api/custom-words` | Custom word management |
| `/api/users` | User-related operations |
| `/api/activity` | Activity records |
| `/api/face` | Face-related functionality |
| `/api/passkeys` | Passkey/WebAuthn functionality |

Exact methods, request formats, and access permissions are defined by the implementation in each route.

### Example Analysis Request

```http
POST /api/analysis
Content-Type: application/json
Authorization: Bearer <your-token>
```

```json
{
  "comment": "Text to analyze"
}
```

The analysis endpoint requires authentication. A successful response includes the saved analysis record, with fields such as `comment`, `result`, `category`, `confidence`, `detectedLabels`, and timestamps.

## 🚀 Deployment

### Frontend

1. Import the repository into Vercel.
2. Configure the correct frontend root directory.
3. Add `VITE_API_URL` to the required deployment environments.
4. Deploy the frontend.

### Node.js Backend

1. Create a Node.js web service on Render.
2. Configure the backend root directory and start command.
3. Add the required environment variables.
4. Confirm the backend connects to MongoDB.
5. Test the deployed API.

### Python AI Service

1. Create a Python web service on Render.
2. Configure dependencies and the startup command.
3. Confirm the service exposes `/predict`.
4. Set `AI_SERVICE_URL` in the Node.js service to the AI service's base URL.

## 🧪 Troubleshooting

### Analysis returns HTTP 500

Check the Node.js service logs for the actual exception. The failure may occur during the AI request, database save, or another backend operation.

### AI service returns HTTP 502 or 503

Check the Python service status, deployment events, logs, and `/predict` endpoint. If the AI request fails before the database save, that request will not create an analysis record.

### Analysis history is empty

Verify that the analysis was saved successfully, that the authenticated user's ID matches the record's `user` field, and that the frontend calls the correct history endpoint.

### CORS errors

Check that `CLIENT_URL` matches the deployed frontend origin and that the backend CORS configuration permits it.

### Passkeys fail

Confirm that `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` match the domain and origin used to access the site.

## 🔒 Security

- Never commit `.env` files, database credentials, JWT secrets, or private keys.
- Add `.env` to `.gitignore`.
- Store production secrets in Vercel and Render environment settings.
- Require authentication for protected API routes.
- Validate and limit incoming text.
- Use HTTPS for deployed services.
- Avoid logging sensitive user information.

## 🛣️ Possible Future Improvements

- Add automated tests for API endpoints.
- Improve AI classification evaluation.
- Add AI service health checks and monitoring.
- Improve analysis-history pagination and filtering.
- Add clearer error reporting and optimize inference latency.

## 👨‍💻 Author

**Harshit Raj**

- GitHub: [@HarshitRaj31](https://github.com/HarshitRaj31)
- Repository: [ToxicGuard](https://github.com/HarshitRaj31/ToxicGuard)

## 📄 License

Add the license used by this repository. If the project uses the MIT License, include the corresponding `LICENSE` file.

---

*Built to support safer digital conversations through AI-assisted toxic speech detection.*
