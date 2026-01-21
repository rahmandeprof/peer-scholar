import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
    const { user, isLoading } = useAuth();
    const isAuthenticated = !!user;

    // Show nothing while checking auth
    if (isLoading) return null;

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav-content">
                    <Link to="/" className="landing-logo">
                        <div className="landing-logo-icon">📚</div>
                        PeerToLearn
                    </Link>
                    <ul className="landing-nav-links">
                        <li><a href="#features">Features</a></li>
                        <li><a href="#about">About</a></li>
                    </ul>
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="landing-nav-cta">Go to Dashboard</Link>
                    ) : (
                        <Link to="/login" className="landing-nav-cta">Get Started</Link>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-container">
                    <div className="landing-hero-content">
                        <div className="landing-hero-text">
                            <h1>
                                Study materials,<br />
                                <span>finally organized</span>
                            </h1>
                            <p>
                                One shared library for your department. No more chasing PDFs through WhatsApp.
                                Access notes, past questions, and slides — organized and searchable.
                            </p>
                            <div className="landing-hero-buttons">
                                {isAuthenticated ? (
                                    <Link to="/dashboard" className="landing-btn-primary">
                                        Go to Dashboard
                                        <ArrowRight size={20} />
                                    </Link>
                                ) : (
                                    <Link to="/signup" className="landing-btn-primary">
                                        Start Studying
                                        <ArrowRight size={20} />
                                    </Link>
                                )}
                                <a href="#features" className="landing-btn-secondary">
                                    See Features
                                </a>
                            </div>
                        </div>
                        <div className="landing-hero-visual">
                            <img
                                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&h=400&fit=crop"
                                alt="Students studying together"
                                className="landing-hero-mockup"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="landing-stats">
                <div className="landing-container">
                    <div className="landing-stats-grid">
                        <div className="landing-stat-item">
                            <h3>500<span>+</span></h3>
                            <p>Materials Uploaded</p>
                        </div>
                        <div className="landing-stat-item">
                            <h3>1,000<span>+</span></h3>
                            <p>Active Students</p>
                        </div>
                        <div className="landing-stat-item">
                            <h3>10<span>+</span></h3>
                            <p>Departments</p>
                        </div>
                        <div className="landing-stat-item">
                            <h3>24/7</h3>
                            <p>Always Available</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="landing-problem" id="about">
                <div className="landing-container">
                    <div className="landing-section-header">
                        <h2>The Problem We're Solving</h2>
                        <p>Every semester, the same frustrations play out across campuses</p>
                    </div>
                    <div className="landing-problem-grid">
                        <div className="landing-problem-card">
                            <div className="landing-icon"><X size={24} /></div>
                            <h3>Buried in WhatsApp</h3>
                            <p>Materials get shared in group chats, then buried under hundreds of messages.</p>
                        </div>
                        <div className="landing-problem-card">
                            <div className="landing-icon"><X size={24} /></div>
                            <h3>Forwarded to Oblivion</h3>
                            <p>The same notes get forwarded over and over, losing quality each time.</p>
                        </div>
                        <div className="landing-problem-card">
                            <div className="landing-icon"><X size={24} /></div>
                            <h3>Gatekept Access</h3>
                            <p>Joined the course late? Missed the post? Good luck getting materials.</p>
                        </div>
                        <div className="landing-problem-card">
                            <div className="landing-icon"><X size={24} /></div>
                            <h3>Exam Season Panic</h3>
                            <p>"Does anyone have the note for chapter 5?" becomes the group anthem.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="landing-features" id="features">
                <div className="landing-container">
                    <div className="landing-section-header">
                        <h2>Everything You Need to Study Smarter</h2>
                        <p>AI-powered tools designed for Nigerian students</p>
                    </div>
                    <div className="landing-features-grid">
                        <div className="landing-feature-card">
                            <div className="landing-icon"><BookOpen size={28} /></div>
                            <h3>Shared Library</h3>
                            <p>All your department's materials in one place. Organized by course, topic, and type.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><Brain size={28} /></div>
                            <h3>AI Quizzes & Flashcards</h3>
                            <p>Generate quizzes from any material. Test yourself before exams.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><Mic size={28} /></div>
                            <h3>Text-to-Speech</h3>
                            <p>Listen to your notes on the go. Nigerian voices included.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><MessageSquare size={28} /></div>
                            <h3>Annotations</h3>
                            <p>Highlight text and add notes. Share explanations with classmates.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><Users size={28} /></div>
                            <h3>Study Partners</h3>
                            <p>Find accountability partners. Track study streaks together.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><Smartphone size={28} /></div>
                            <h3>Works Offline</h3>
                            <p>Download materials when you have data. Study anywhere, anytime.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><Search size={28} /></div>
                            <h3>Smart Search</h3>
                            <p>Find any concept across all your materials instantly.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><Timer size={28} /></div>
                            <h3>Study Timer</h3>
                            <p>Track reading time. Build streaks. Compete on leaderboards.</p>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-icon"><FileText size={28} /></div>
                            <h3>AI Summaries</h3>
                            <p>Get key points from any document. Understand complex topics faster.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta">
                <div className="landing-container">
                    <h2>{isAuthenticated ? 'Welcome Back!' : 'Ready to Study Smarter?'}</h2>
                    <p>{isAuthenticated ? 'Continue where you left off.' : "Join thousands of students who've upgraded their study game. It's free."}</p>
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="landing-btn-primary">
                            <Sparkles size={20} />
                            Go to Dashboard
                        </Link>
                    ) : (
                        <Link to="/signup" className="landing-btn-primary">
                            <Sparkles size={20} />
                            Get Started Free
                        </Link>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="landing-footer-content">
                        <div className="landing-footer-brand">
                            <Link to="/" className="landing-logo">
                                <div className="landing-logo-icon">📚</div>
                                PeerToLearn
                            </Link>
                            <p>Study materials, finally organized. Built for Nigerian university students.</p>
                        </div>
                        <div className="landing-footer-links">
                            <h4>Product</h4>
                            <ul>
                                <li><a href="#features">Features</a></li>
                                <li><Link to="/login">Open App</Link></li>
                                <li><Link to="/how-to-use">How to Use</Link></li>
                            </ul>
                        </div>
                        <div className="landing-footer-links">
                            <h4>Company</h4>
                            <ul>
                                <li><a href="#about">About</a></li>
                                <li><Link to="/about">About PeerToLearn</Link></li>
                            </ul>
                        </div>
                        <div className="landing-footer-links">
                            <h4>Support</h4>
                            <ul>
                                <li><a href="mailto:support@peertolearn.com">Email Support</a></li>
                                <li><a href="https://twitter.com/peertolearn">Twitter</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="landing-footer-bottom">
                        <p>&copy; 2026 PeerToLearn.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
