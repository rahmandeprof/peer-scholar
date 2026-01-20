import {
    UserPlus,
    Search,
    Upload,
    MessageSquare,
    BookOpen,
    ArrowRight,
    CheckCircle,
    Smartphone,
    Download,
    Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function HowToUsePage() {
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
                        <Link to="/about" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                            About
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

            {/* Hero */}
            <section className="max-w-5xl mx-auto px-4 py-12 md:py-16 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    How to Use PeerToLearn
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    A simple guide to get you studying in minutes.
                </p>
            </section>

            {/* Steps */}
            <section className="max-w-4xl mx-auto px-4 pb-16">
                <div className="space-y-8">
                    {/* Step 1 */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-primary-600 px-6 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                1
                            </div>
                            <h2 className="text-lg font-semibold text-white">Getting Started</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <UserPlus className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Create Your Account</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        Tap "Sign Up" and enter your email or use Google sign-in. Choose a password and you're in.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Set Up Your Profile</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        Select your faculty, department, and current level. This helps us show you the right materials from day one.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-blue-600 px-6 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                2
                            </div>
                            <h2 className="text-lg font-semibold text-white">Finding Materials</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Browse Your Department Library</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        Once you've set your department, you'll see materials uploaded by your coursemates, course reps, and faculty reps. These are organized by course code and topic.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Search className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Search for Specific Content</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        Looking for a particular topic? Use the search bar. Type a course code like "CHM 101" or a topic like "Organic Chemistry" and find what you need.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-green-600 px-6 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                3
                            </div>
                            <h2 className="text-lg font-semibold text-white">Uploading Materials</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Anyone can contribute. If you have useful notes, slides, or past questions, here's how to share them:
                            </p>
                            <div className="flex items-start gap-4">
                                <Upload className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                <div>
                                    <ol className="text-gray-600 dark:text-gray-400 text-sm space-y-2">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 font-medium">1.</span>
                                            Tap the Upload button
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 font-medium">2.</span>
                                            Select the file from your phone
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 font-medium">3.</span>
                                            Add a title and choose the course or topic it belongs to
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 font-medium">4.</span>
                                            Set visibility — share with your department, faculty, or make it public
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 font-medium">5.</span>
                                            Tap Upload — your material is now accessible to everyone!
                                        </li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-purple-600 px-6 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                4
                            </div>
                            <h2 className="text-lg font-semibold text-white">Annotating & Contributing</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                See a material that could use some explanation? You can help.
                            </p>
                            <div className="flex items-start gap-4">
                                <MessageSquare className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Add Public Notes</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        Highlight text in any document and add a public annotation. Your explanation will be visible to other students viewing the same material.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Lightbulb className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">Attach Helpful Links</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        Found a YouTube video that explains the topic better? Add it as a linked resource so others can benefit too.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-orange-600 px-6 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                5
                            </div>
                            <h2 className="text-lg font-semibold text-white">During Exam Season</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                When exams approach, PeerToLearn becomes especially useful.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <BookOpen className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">Start Early</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Browse materials early so you know what's available.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <Download className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">Download for Offline</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Save materials when you have connectivity. Study offline anytime.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">Use Annotations</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Check what other students have highlighted or explained.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <Lightbulb className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">Contribute Back</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Share your explanations. Help the library grow.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Tips */}
                <div className="mt-12 bg-gray-100 dark:bg-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Smartphone className="w-5 h-5 text-primary-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Quick Tips</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Low on data?</strong> PeerToLearn is built mobile-first and works well on slow connections.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Can't find a material?</strong> Ask in your department group or request it through the app.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Want accountability?</strong> Use Study Partner to connect with coursemates and stay motivated.</span>
                        </li>
                    </ul>
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-lg transition-colors"
                    >
                        Start Studying Now <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-950 py-8">
                <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary-500" />
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

export default HowToUsePage;
