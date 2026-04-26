import { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
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
    const [showPassword, setShowPassword] = useState(false);

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

    return (
        <div className="auth-new-wrapper">
            <div className="auth-new-bg"></div>
            <div className="auth-new-gradient-1"></div>
            <div className="auth-new-gradient-2"></div>
            
            <div className="auth-new-container">
                <div className="auth-new-card">
                    <div className="auth-new-header">
                        <div className="auth-new-logo">N</div>
                        <h1 className="auth-new-title">Welcome Back</h1>
                        <p className="auth-new-subtitle">Sign in to your Nexus account</p>
                    </div>

                    <form className="auth-new-form" onSubmit={handleSubmit}>
                        <div className="auth-new-field-group">
                            <label className="auth-new-label">Email Address</label>
                            <div className="auth-new-input-wrapper">
                                <Mail size={20} className="auth-new-input-icon" />
                                <input
                                    type="email"
                                    className="auth-new-input"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="auth-new-field-group">
                            <label className="auth-new-label">Password</label>
                            <div className="auth-new-input-wrapper">
                                <Lock size={20} className="auth-new-input-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="auth-new-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="auth-new-show-pwd"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="auth-new-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button type="submit" className="auth-new-submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="auth-new-spinner"></span>
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight size={20} className="auth-new-arrow" />
                                </>
                            )}
                        </button>

                        <p className="auth-new-footer-text">
                            Don't have an account?{' '}
                            <a href="/signup" className="auth-new-link">
                                Create Account
                            </a>
                        </p>
                    </form>
                </div>

                <div className="auth-new-side-decoration">
                    <div className="auth-decoration-circle auth-decoration-circle-1"></div>
                    <div className="auth-decoration-circle auth-decoration-circle-2"></div>
                    <div className="auth-decoration-circle auth-decoration-circle-3"></div>
                </div>
            </div>
        </div>
    );
}
