# 🎓 PeerToLearn - Intelligent Academic Assistant

A powerful, AI-driven study platform designed for Nigerian university students. **PeerToLearn** solves the chaos of scattered study materials by organizing department resources, providing offline capabilities, and enhancing learning with AI tools like text-to-speech, auto-generated quizzes, and study streaks.

![License](https://img.shields.io/badge/license-MIT-blue)
![Tech](https://img.shields.io/badge/stack-NestJS%20%7C%20React%20%7C%20PostgreSQL-green)
![PWA](https://img.shields.io/badge/platform-Web%20%7C%20PWA%20%7C%20Mobile-orange)

## ✨ Features

### 📚 Smart Library

- **Organized Archive**: Materials automatically sorted by Faculty, Department, and Course Level.
- **Smart Search**: Find specific concepts across hundreds of PDFs instantly.
- **OCR Technology**: Search and read text even from scanned image-based PDFs (parallel processed for speed).
- **Format Support**: PDF, DOCX, and text files supported.

### 🧠 AI Learning Tools

- **Quiz Engine**: Generate instant practice tests from any uploading material.
- **Text-to-Speech (TTS)**: Listen to your handouts on the go. Features **Nigerian voices** (Idera, Emeka, etc.) via YarnGPT.
- **Flashcards**: Create and review flashcards using Spaced Repetition algorithms.
- **AI Summary**: Get key takeaways from complex documents in seconds.
- **Study Partner**: AI Chatbot that answers questions based _only_ on your course context.

### 📱 Built for Nigeria (Offline First)

- **Progressive Web App (PWA)**: Installable on Android/iOS.
- **Offline Mode**: Study downloaded materials without internet.
- **Reading Tracker**: Tracks study time even when offline and syncs when connection restores.
- **Mobile Optimized**: Designed for mobile-first experience.

### 🎮 Gamified Learning

- **Study Streaks**: Daily tracking to build consistency.
- **Badges & Reputation**: Earn ranks (Novice → Grandmaster) for activity.
- **Leaderboards**: Compete with peers in your department.

### 🔐 Security & Auth

- **Department Verification**: Connects students with their actual peers.
- **Secure Handling**: JWT authentication and role-based access.

## 🚀 Tech Stack

### Frontend

- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **State/Data**: React Query + Context API
- **PWA**: Service Workers for offline capabilities

### Backend

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL (via TypeORM)
- **Queue System**: BullMQ (Redis) for background jobs like OCR and TTS
- **Storage**: Cloudinary / R2
- **APIs**: OpenAI (Intelligence), YarnGPT (Voices)

## 📦 Installation

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (for background queues)

### 1. Clone & Install

```bash
git clone https://github.com/rahmandeprof/peer-scholar.git
cd peer-scholar
npm install
```

### 2. Backend Setup

```bash
# Configure environment
cp .env.example .env
# Update .env with your credentials (DB, OpenAI, etc.)

# Run migrations
npm run typeorm migration:run

# Start server
npm run start:dev
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

## 🧪 Deployment

Automated CI/CD is configured for:

- **Frontend**: Vercel (Auto-deploys on push to main)
- **Backend**: Render (likely configuration)

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👤 Author

**Abdulsalam AbdulRahman**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
