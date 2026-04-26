import { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, Brain, AlertCircle, Phone, Camera, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import '../styles/Auth.css';

export default function SignupPage() {
    const { login, register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [name, setName]         = useState('');
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone]       = useState('');
    const [avatar, setAvatar]     = useState(null);
    const [gender, setGender]     = useState('');
    const [focus, setFocus]       = useState('');
    const [focusOther, setFocusOther] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Convert file to Base64
    const handleAvatarChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be less than 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setAvatar(reader.result);
        reader.readAsDataURL(file);
    };

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
            phone: phone.trim(),
            avatar,
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

    return (
        <div className="auth-new-wrapper auth-new-wrapper--signup">
            <div className="auth-new-bg"></div>
            <div className="auth-new-gradient-1 auth-new-gradient-1--signup"></div>
            <div className="auth-new-gradient-2 auth-new-gradient-2--signup"></div>
            
            <div className="auth-new-container">
                <div className="auth-new-card auth-new-card--signup">
                    <div className="auth-new-header">
                        <div className="auth-new-logo auth-new-logo--signup">N</div>
                        <h1 className="auth-new-title auth-new-title--signup">
                            Join <span className="auth-new-nexus">NEXUS</span>
                        </h1>
                        <p className="auth-new-subtitle auth-new-subtitle--signup">
                            Build your integrated career ecosystem
                        </p>
                    </div>

                    <form className="auth-new-form" onSubmit={handleSubmit}>
                        {/* Avatar Upload */}
                        <div className="auth-new-avatar-section">
                            <label className="auth-new-avatar-upload">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    onChange={handleAvatarChange} 
                                />
                                {avatar ? (
                                    <>
                                        <img src={avatar} alt="Avatar preview" className="auth-new-avatar-preview" />
                                        <div className="auth-new-avatar-overlay">Change Photo</div>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={32} className="auth-new-avatar-icon" />
                                        <span className="auth-new-avatar-text">Add Photo</span>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Main Fields Grid */}
                        <div className="auth-new-fields-grid">
                            <div className="auth-new-field-group">
                                <label className="auth-new-label">Full Name</label>
                                <div className="auth-new-input-wrapper">
                                    <User size={20} className="auth-new-input-icon" />
                                    <input
                                        type="text"
                                        className="auth-new-input"
                                        placeholder="Your full name"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        autoComplete="name"
                                    />
                                </div>
                            </div>

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
                                <label className="auth-new-label">Phone (Optional)</label>
                                <div className="auth-new-input-wrapper">
                                    <Phone size={20} className="auth-new-input-icon" />
                                    <input
                                        type="tel"
                                        className="auth-new-input"
                                        placeholder="+1 (555) 000-0000"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        autoComplete="tel"
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
                                        placeholder="Min. 6 characters"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
                                        required
                                        autoComplete="new-password"
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

                            <div className="auth-new-field-group">
                                <label className="auth-new-label">Gender</label>
                                <div className="auth-new-input-wrapper">
                                    <User size={20} className="auth-new-input-icon" />
                                    <select
                                        className="auth-new-input auth-new-select"
                                        value={gender}
                                        onChange={e => setGender(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>

                            <div className="auth-new-field-group">
                                <label className="auth-new-label">Focus Area</label>
                                <div className="auth-new-input-wrapper">
                                    <Brain size={20} className="auth-new-input-icon" />
                                    <select
                                        className="auth-new-input auth-new-select"
                                        value={focus}
                                        onChange={e => setFocus(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select focus area</option>
                                        <option value="swe">Software Engineering</option>
                                        <option value="ml">Machine Learning / AI</option>
                                        <option value="data">Data Science</option>
                                        <option value="devops">DevOps / Cloud</option>
                                        <option value="mobile">Mobile Development</option>
                                        <option value="other">Other…</option>
                                    </select>
                                </div>
                            </div>

                            {focus === 'other' && (
                                <div className="auth-new-field-group auth-new-field-reveal">
                                    <label className="auth-new-label">Describe Your Focus</label>
                                    <div className="auth-new-input-wrapper">
                                        <Brain size={20} className="auth-new-input-icon" />
                                        <input
                                            type="text"
                                            className="auth-new-input"
                                            placeholder="e.g. Embedded Systems, Game Dev…"
                                            value={focusOther}
                                            onChange={e => setFocusOther(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}
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
                                    <span>Creating profile…</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Portfolio</span>
                                    <ArrowRight size={20} className="auth-new-arrow" />
                                </>
                            )}
                        </button>

                        <p className="auth-new-footer-text">
                            Already have an account?{' '}
                            <a href="/login" className="auth-new-link">
                                Log In
                            </a>
                        </p>
                    </form>
                </div>

                <div className="auth-new-side-decoration auth-new-side-decoration--signup">
                    <div className="auth-decoration-circle auth-decoration-circle-1"></div>
                    <div className="auth-decoration-circle auth-decoration-circle-2"></div>
                    <div className="auth-decoration-circle auth-decoration-circle-3"></div>
                </div>
            </div>
        </div>
    );
}
