import { Book, Users, Upload, Search, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
            {/* Header */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/wordmark-black.png" alt="PeerToLearn" className="h-8 dark:hidden" />
                        <img src="/wordmark-blue.png" alt="PeerToLearn" className="h-8 hidden dark:block" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/how-to-use" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                            How to Use
                        </Link>
                        <Link
                            to="/"
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-5xl mx-auto px-4 py-12 md:py-20">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Study materials,<br />
                        <span className="text-primary-600">finally organized.</span>
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                        PeerToLearn is a shared digital library built for Nigerian university students.
                        Access your department's materials anytime, from any device.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Start Studying <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Problem Section */}
            <section className="bg-gray-50 dark:bg-gray-800/50 py-12 md:py-16">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
                        The Problem We're Solving
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto mb-10">
                        Every semester, the same story plays out across Nigerian campuses.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                        {[
                            'Materials shared in group chats, buried under hundreds of messages',
                            'Students forward the same PDFs over and over, losing quality each time',
                            'Some students never get access because they joined late',
                            'When exams approach, everyone scrambles looking for notes',
                        ].map((problem, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                            >
                                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-red-600 text-sm">✕</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">{problem}</p>
                            </div>
                        ))}
                    </div>

                    <p className="text-center mt-8 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                        This isn't a lack of materials. It's a lack of <strong>access</strong>. Good notes exist.
                        They're just scattered across phones and chat histories.
                    </p>
                </div>
            </section>

            {/* Solution Section */}
            <section className="py-12 md:py-16">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
                        How PeerToLearn Fixes This
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto mb-10">
                        One shared space for every department.
                    </p>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {[
                            {
                                icon: Upload,
                                title: 'Upload Once',
                                desc: 'Course reps share materials once. Everyone gets access.',
                                color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
                            },
                            {
                                icon: Search,
                                title: 'Find Instantly',
                                desc: 'Materials organized by course and topic. Searchable anytime.',
                                color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
                            },
                            {
                                icon: Users,
                                title: 'Learn Together',
                                desc: 'Add annotations and share explanations with classmates.',
                                color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="text-center p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700"
                            >
                                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-4`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Who It's For */}
            <section className="bg-primary-600 py-12 md:py-16">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
                        Who Is PeerToLearn For?
                    </h2>

                    <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {[
                            { title: 'Students', desc: 'Access materials without chasing anyone' },
                            { title: 'Course Reps', desc: 'Upload once instead of forwarding to multiple groups' },
                            { title: 'Faculty Reps', desc: 'Build a resource hub for your entire faculty' },
                            { title: 'Study Groups', desc: 'Share notes with your reading partners' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                                <p className="text-sm text-primary-100">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Vision */}
            <section className="py-12 md:py-16">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <Shield className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Our Vision
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                        Every student deserves access to quality study materials — regardless of which group they joined,
                        which course rep they know, or when they got admitted.
                    </p>
                    <p className="text-gray-500 dark:text-gray-500">
                        No gatekeeping. No repeated requests. Just study.
                    </p>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-gray-900 dark:bg-gray-800 py-12 md:py-16">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        Ready to start studying smarter?
                    </h2>
                    <p className="text-gray-400 mb-8">
                        Join thousands of Nigerian students already using PeerToLearn.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-lg transition-colors"
                    >
                        Get Started Free <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-950 py-8">
                <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Book className="w-5 h-5 text-primary-500" />
                        <span className="text-gray-400">PeerToLearn</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                        <Link to="/about" className="hover:text-gray-300">About</Link>
                        <Link to="/how-to-use" className="hover:text-gray-300">How to Use</Link>
                    </div>
                    <p className="text-sm text-gray-600">© 2026 PeerToLearn</p>
                </div>
            </footer>
        </div>
    );
}

export default AboutPage;
