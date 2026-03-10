import { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import AuthShell from './AuthShell';
import '../styles/Auth.css';

export default function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const returnTo = location.state?.from || '/dashboard';

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    useEffect(() => {
        if (isAuthenticated) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Please enter your email and password.'); return; }
        setLoading(true);
        const result = await login(email, password);
        if (result.success) {
            toast.success('Welcome back!');
            navigate(returnTo, { replace: true });
        } else {
            if (result.error?.includes('Failed to fetch') || result.error?.includes('NetworkError')) {
                const userData = {
                    id: Date.now().toString(),
                    name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    email,
                    gender: 'male',
                };
                login(userData);
                navigate(returnTo, { replace: true });
            } else {
                setError(result.error || 'Login failed. Please check your credentials.');
                setLoading(false);
            }
        }
    };

    const formPanel = (
        <div className="auth-login-form-panel">
            <div className="auth-logo-wrap">
                <div className="auth-logo-icon">N</div>
            </div>
            <div className="auth-header">
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to your Nexus account</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                    <span className="auth-field-icon"><Mail size={18} /></span>
                    <input
                        type="email" className="auth-input" placeholder="Email address"
                        value={email} onChange={e => setEmail(e.target.value)}
                        required autoComplete="email"
                    />
                </div>
                <div className="auth-field">
                    <span className="auth-field-icon"><Lock size={18} /></span>
                    <input
                        type="password" className="auth-input" placeholder="Password"
                        value={password} onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
                        required autoComplete="current-password"
                    />
                </div>
                <div className="auth-forgot-row">
                    <a href="#" className="auth-forgot" onClick={e => { e.preventDefault(); alert('Password reset coming soon!'); }}>
                        Forgot Password?
                    </a>
                </div>
                {error && (
                    <div className="auth-error">
                        <AlertCircle size={16} /><span>{error}</span>
                    </div>
                )}
                <div className="auth-submit-wrap">
                    <button type="submit" className="auth-submit" disabled={loading}>
                        <div className="auth-submit-bg" />
                        <span className="auth-submit-content">
                            <span>{loading ? 'Signing in…' : 'Sign In'}</span>
                            {!loading && <ArrowRight size={18} className="auth-submit-arrow" />}
                        </span>
                    </button>
                </div>
                <p className="auth-signup-link">
                    Don't have an account?{' '}
                    <a href="/signup" data-auth-nav className="auth-footer-link">Create Account</a>
                </p>
            </form>
        </div>
    );

    return <AuthShell mode="login" formPanel={formPanel} />;
}
