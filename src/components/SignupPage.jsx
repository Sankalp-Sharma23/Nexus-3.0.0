import { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, Brain, AlertCircle } from 'lucide-react';
import { FaGoogle, FaLinkedin, FaGithub } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import AuthShell from './AuthShell';
import '../styles/Auth.css';

export default function SignupPage() {
    const { login, register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [name, setName]         = useState('');
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender]     = useState('');
    const [focus, setFocus]       = useState('');
    const [focusOther, setFocusOther] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    // Auto-redirect already logged-in users
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !email || !password || !gender || !focus) { setError('Please fill in all fields.'); return; }
        if (focus === 'other' && !focusOther.trim()) { setError('Please describe your focus area.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setLoading(true);

        const resolvedFocus = focus === 'other' ? focusOther.trim().toLowerCase().replace(/\s+/g, '_') : focus;

        const result = await register({
            name: name.trim(),
            email,
            password,
            gender,
            focus: resolvedFocus,
            focusLabel: focus === 'other' ? focusOther.trim() : null,
        });

        if (result.success) {
            toast.success('Account created! Welcome to Nexus.');
            navigate('/dashboard', { replace: true });
        } else {
            if (result.error?.includes('Failed to fetch') || result.error?.includes('NetworkError')) {
                const userData = { id: Date.now().toString(), name: name.trim(), email, gender, focus: resolvedFocus, focusLabel: focus === 'other' ? focusOther.trim() : null };
                login(userData);
                navigate('/dashboard', { replace: true });
            } else {
                setError(result.error || 'Registration failed. Please try again.');
                setLoading(false);
            }
        }
    };

    const formPanel = (
        <div className="auth-signup-form-panel">
            <div className="auth-logo-wrap">
                <div className="auth-logo-icon auth-logo-icon--signup">N</div>
            </div>
            <div className="auth-header">
                <h1 className="auth-title">Join <span className="auth-nexus-highlight auth-nexus-highlight--signup">NEXUS</span></h1>
                <p className="auth-subtitle">Build your integrated career ecosystem</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-fields">
                    <div className="auth-field auth-field--signup">
                        <span className="auth-field-icon"><User size={18} /></span>
                        <input type="text" className="auth-input auth-input--signup" placeholder="Developer Name"
                            value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
                        <div className="auth-underline" />
                    </div>
                    <div className="auth-field auth-field--signup">
                        <span className="auth-field-icon"><Mail size={18} /></span>
                        <input type="email" className="auth-input auth-input--signup" placeholder="developer@nexus.io"
                            value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                        <div className="auth-underline" />
                    </div>
                    <div className="auth-field auth-field--signup">
                        <span className="auth-field-icon"><Lock size={18} /></span>
                        <input type="password" className="auth-input auth-input--signup" placeholder="Secure Password"
                            value={password} onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
                            required autoComplete="new-password" />
                        <div className="auth-underline" />
                    </div>
                    <div className="auth-field auth-field--signup">
                        <span className="auth-field-icon"><User size={18} /></span>
                        <select className="auth-input auth-input--signup auth-select" value={gender} onChange={e => setGender(e.target.value)} required>
                            <option value="" disabled>Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Prefer not to say</option>
                        </select>
                        <div className="auth-underline" />
                    </div>
                    <div className="auth-field auth-field--signup">
                        <span className="auth-field-icon"><Brain size={18} /></span>
                        <select className="auth-input auth-input--signup auth-select" value={focus} onChange={e => setFocus(e.target.value)} required>
                            <option value="" disabled>Focus Area</option>
                            <option value="swe">Software Engineering</option>
                            <option value="ml">Machine Learning / AI</option>
                            <option value="data">Data Science</option>
                            <option value="devops">DevOps / Cloud</option>
                            <option value="mobile">Mobile Development</option>
                            <option value="other">Other…</option>
                        </select>
                        <div className="auth-underline" />
                    </div>
                    {focus === 'other' && (
                        <div className="auth-field auth-field--signup auth-field-reveal">
                            <span className="auth-field-icon"><Brain size={18} /></span>
                            <input type="text" className="auth-input auth-input--signup"
                                placeholder="e.g. Embedded Systems, Game Dev…"
                                value={focusOther} onChange={e => setFocusOther(e.target.value)} autoFocus />
                            <div className="auth-underline" />
                        </div>
                    )}
                </div>
                {error && (
                    <div className="auth-error"><AlertCircle size={16} /><span>{error}</span></div>
                )}
                <div className="auth-submit-wrap">
                    <button type="submit" className="auth-submit" disabled={loading}>
                        <div className="auth-submit-bg auth-submit-bg--signup" />
                        <span className="auth-submit-content">
                            <span>{loading ? 'Creating profile…' : 'Create Portfolio'}</span>
                            {!loading && <ArrowRight size={20} className="auth-submit-arrow" />}
                        </span>
                    </button>
                </div>
                <div className="auth-divider">
                    <div className="auth-divider-line" />
                    <span className="auth-divider-text">OR CONTINUE WITH</span>
                    <div className="auth-divider-line" />
                </div>
                <div className="auth-oauth">
                    <button type="button" className="auth-oauth-btn" title="Google"><FaGoogle /></button>
                    <button type="button" className="auth-oauth-btn auth-oauth-btn--linkedin" title="LinkedIn"><FaLinkedin /></button>
                    <button type="button" className="auth-oauth-btn" title="GitHub"><FaGithub /></button>
                </div>
            </form>
            <p className="auth-signup-link">
                Already have an account?{' '}
                <a href="/login" data-auth-nav className="auth-footer-link auth-footer-link--signup">Log In</a>
            </p>
        </div>
    );

    return <AuthShell mode="signup" formPanel={formPanel} />;
}
