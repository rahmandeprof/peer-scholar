# 🎓 peerStudent - AI-Powered Student Study Assistant

An intelligent study companion that helps students chat with their course materials, manage study sessions, and collaborate with peers.

![License](https://img.shields.io/badge/license-UNLICENSED-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)

## ✨ Features

### 🤖 AI Chatbot

- Chat with your uploaded study materials
- Context-aware responses using OpenAI
- Access to both personal and community materials
- Conversation history and management

### 📚 Material Management

- **Personal Uploads**: Private materials for your eyes only
- **Community Sharing**: Share materials with students in your department/year
- Support for PDF, DOCX, and text files
- Cloudinary-powered file storage

### ⏱️ Study Tools

- Pomodoro-style study timer with modes:
  - Study Mode (25 min)
  - Test Mode (60 min)
  - Rest Mode (5 min)
- Study streak tracking
- Session history

### 👥 Community Features

- Browse materials shared by peers
- Filter by department and year level
- Download and access shared resources

### 🔐 Authentication

- Secure JWT-based authentication
- User profiles with department and year tracking
- Protected routes and API endpoints

### 🎨 Modern UI

- Dark/Light mode toggle
- Responsive design (mobile, tablet, desktop)
- Toast notifications for user feedback
- Error boundaries for graceful error handling

## 🚀 Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API calls

### Backend

- **NestJS** - Progressive Node.js framework
- **TypeORM** - Database ORM
- **PostgreSQL** - Primary database
- **JWT** - Authentication
- **Passport** - Auth middleware

### AI & Services

- **OpenAI GPT-3.5** - Chatbot intelligence
- **Cloudinary** - File storage and delivery
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX text extraction

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key
- Cloudinary account

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/peerstudent.git
   cd peerstudent
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:

   - Database connection
   - JWT secret
   - OpenAI API key
   - Cloudinary credentials

4. **Run migrations**

   ```bash
   npm run migration:run
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```
   Backend runs on `http://localhost:3000`

### Frontend Setup

1. **Navigate to client directory**

   ```bash
   cd client
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Set `VITE_API_URL=http://localhost:3000`

4. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

## 🎯 Usage

### Getting Started

1. **Sign Up**: Create an account with your email, department, and year
2. **Upload Materials**: Add your study materials (personal or share with community)
3. **Chat**: Ask questions about your materials
4. **Study**: Use the timer to track your study sessions
5. **Explore**: Browse community materials from your peers

### API Endpoints

#### Authentication

- `POST /auth/register` - Create new account
- `POST /auth/login` - Login
- `GET /auth/profile` - Get user profile (protected)

#### Chat

- `POST /chat/upload` - Upload material
- `POST /chat/message` - Send message to chatbot
- `GET /chat/history` - Get conversation history
- `GET /chat/materials` - Get accessible materials

#### Study

- `POST /study/session` - Start study session
- `PUT /study/session/:id` - End study session
- `GET /study/streak` - Get current streak

## 🏗️ Project Structure

```
peerstudent/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth, Theme, Toast)
│   │   ├── lib/          # Utilities (API client)
│   │   └── App.tsx       # Main app component
│   └── package.json
├── src/                   # Backend NestJS app
│   ├── app/
│   │   ├── auth/         # Authentication module
│   │   ├── chat/         # Chat & materials module
│   │   ├── study/        # Study sessions module
│   │   ├── users/        # User management
│   │   └── common/       # Shared services (Cloudinary)
│   ├── database/         # Database config & migrations
│   └── main.ts          # App entry point
├── .env.example          # Backend env template
└── package.json
```

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=scholar_app

JWT_SECRET=your_secret_key
OPENAI_API_KEY=sk-your-key
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

PORT=3000
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`client/.env`):

```env
VITE_API_URL=http://localhost:3000
```

## 🧪 Testing

```bash
# Backend tests
npm run test

# Frontend tests
cd client && npm run test

# E2E tests
npm run test:e2e
```

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - How to deploy to production
- [Next Steps](./NEXT_STEPS.md) - Feature roadmap and improvements
- [API Documentation](./docs/API.md) - Detailed API reference (coming soon)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is UNLICENSED - see the LICENSE file for details.

## 👤 Author

**Abdulsalam AbdulRahman**

## 🙏 Acknowledgments

- OpenAI for GPT-3.5 API
- NestJS team for the amazing framework
- React team for the UI library
- All open-source contributors

## 📞 Support

For support, email your-email@example.com or open an issue on GitHub.

---

**Built with ❤️ for students, by students**
