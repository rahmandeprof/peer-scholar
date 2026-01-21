import './App.css'
import {
  BookOpen,
  Users,
  Brain,
  Mic,
  FileText,
  Search,
  MessageSquare,
  Smartphone,
  ArrowRight,
  X,
  Sparkles,
  Timer
} from 'lucide-react'

const APP_URL = 'https://peerscholar.onrender.com'

function App() {
  return (
    <div className="app">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          <a href="#" className="logo">
            <div className="logo-icon">📚</div>
            PeerToLearn
          </a>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <a href={APP_URL} className="nav-cta">Open App</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>
                Study materials,<br />
                <span>finally organized</span>
              </h1>
              <p>
                One shared library for your department. No more chasing PDFs through WhatsApp.
                Access notes, past questions, and slides — organized and searchable.
              </p>
              <div className="hero-buttons">
                <a href={APP_URL} className="btn-primary">
                  Start Studying
                  <ArrowRight size={20} />
                </a>
                <a href="#features" className="btn-secondary">
                  See Features
                </a>
              </div>
            </div>
            <div className="hero-visual">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&h=400&fit=crop"
                alt="Students studying together"
                className="hero-mockup"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <h3>500<span>+</span></h3>
              <p>Materials Uploaded</p>
            </div>
            <div className="stat-item">
              <h3>1,000<span>+</span></h3>
              <p>Active Students</p>
            </div>
            <div className="stat-item">
              <h3>10<span>+</span></h3>
              <p>Departments</p>
            </div>
            <div className="stat-item">
              <h3>24/7</h3>
              <p>Always Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem" id="about">
        <div className="container">
          <div className="section-header">
            <h2>The Problem We're Solving</h2>
            <p>Every semester, the same frustrations play out across campuses</p>
          </div>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="icon"><X size={24} /></div>
              <h3>Buried in WhatsApp</h3>
              <p>Materials get shared in group chats, then buried under hundreds of messages. Good luck finding that PDF from week 3.</p>
            </div>
            <div className="problem-card">
              <div className="icon"><X size={24} /></div>
              <h3>Forwarded to Oblivion</h3>
              <p>The same notes get forwarded over and over, losing quality each time. Everyone has a different version.</p>
            </div>
            <div className="problem-card">
              <div className="icon"><X size={24} /></div>
              <h3>Gatekept Access</h3>
              <p>Joined the course late? Missed the post? Good luck getting materials from coursemates you don't know.</p>
            </div>
            <div className="problem-card">
              <div className="icon"><X size={24} /></div>
              <h3>Exam Season Panic</h3>
              <p>When exams approach, everyone scrambles. "Does anyone have the note for chapter 5?" becomes the group anthem.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <h2>Everything You Need to Study Smarter</h2>
            <p>AI-powered tools designed for Nigerian students</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="icon"><BookOpen size={28} /></div>
              <h3>Shared Library</h3>
              <p>All your department's materials in one place. Organized by course, topic, and type. No more hunting.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><Brain size={28} /></div>
              <h3>AI Quizzes & Flashcards</h3>
              <p>Generate quizzes from any material. Test yourself before exams. Smart flashcards that adapt to you.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><Mic size={28} /></div>
              <h3>Text-to-Speech</h3>
              <p>Listen to your notes on the go. Perfect for commuting or when your eyes need a break. Nigerian voices included.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><MessageSquare size={28} /></div>
              <h3>Annotations</h3>
              <p>Highlight text and add notes. Share explanations with classmates. Mark past questions for easy reference.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><Users size={28} /></div>
              <h3>Study Partners</h3>
              <p>Find accountability partners. Track study streaks together. Stay motivated with friendly competition.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><Smartphone size={28} /></div>
              <h3>Works Offline</h3>
              <p>Download materials when you have data. Study anywhere, anytime — even without internet.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><Search size={28} /></div>
              <h3>Smart Search</h3>
              <p>Find any concept across all your materials instantly. Search by course code, topic, or keyword.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><Timer size={28} /></div>
              <h3>Study Timer</h3>
              <p>Track how long you spend on each material. Build a reading streak. Compete on leaderboards.</p>
            </div>
            <div className="feature-card">
              <div className="icon"><FileText size={28} /></div>
              <h3>AI Summaries</h3>
              <p>Get key points from any document. Understand complex topics faster with AI-generated explanations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <h2>Ready to Study Smarter?</h2>
          <p>Join thousands of students who've upgraded their study game. It's free.</p>
          <a href={APP_URL} className="btn-primary">
            <Sparkles size={20} />
            Get Started Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <a href="#" className="logo">
                <div className="logo-icon">📚</div>
                PeerToLearn
              </a>
              <p>Study materials, finally organized. Built for Nigerian university students.</p>
            </div>
            <div className="footer-links">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href={APP_URL}>Open App</a></li>
                <li><a href={`${APP_URL}/how-to-use`}>How to Use</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Support</h4>
              <ul>
                <li><a href="mailto:support@peertolearn.com">Email Support</a></li>
                <li><a href="https://twitter.com/peertolearn">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 PeerToLearn. Made with ❤️ for Nigerian students.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
