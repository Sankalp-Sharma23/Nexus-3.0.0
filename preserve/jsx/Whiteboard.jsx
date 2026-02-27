import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Plus, Users, LogIn, Copy, Check, Pencil, Sparkles } from 'lucide-react';
import '../styles/Whiteboard.css';

const Whiteboard = () => {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [generatedRoomId, setGeneratedRoomId] = useState('');
  const [copied, setCopied] = useState(false);

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 10).toUpperCase();
    setGeneratedRoomId(id);
    return id;
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    console.log('Creating room with ID:', newRoomId);
    // Add logic to create and navigate to whiteboard
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      console.log('Joining room:', roomId);
      // Add logic to join whiteboard room
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(generatedRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="whiteboard-page">
      <Navbar theme="dark" />
      
      <main className="whiteboard-main">
        <div className="whiteboard-container">
          {/* Hero Section */}
          <div className="whiteboard-hero">
            <div className="hero-badge">
              <Sparkles size={16} />
              <span>Real-Time Collaboration</span>
            </div>
            
            <h1 className="whiteboard-title">
              Nexus <span className="gradient-text">Whiteboard</span>
            </h1>
            
            <p className="whiteboard-subtitle">
              Brainstorm ideas, sketch system designs, or solve DSA problems with your team in real-time. 
              Create a shared canvas where creativity meets collaboration.
            </p>
          </div>

          {/* Action Hub */}
          <div className="action-hub">
            {/* Create Room Card */}
            <div className="action-card create-card">
              <div className="card-glow"></div>
              <div className="card-content">
                <div className="card-icon">
                  <Plus size={48} strokeWidth={2.5} />
                </div>
                
                <h3 className="card-title">Start a New Session</h3>
                <p className="card-description">
                  Generate a unique room ID to share with your team and start collaborating instantly.
                </p>

                <button className="action-button create-button" onClick={handleCreateRoom}>
                  <Plus size={20} />
                  <span>Create Room</span>
                </button>

                {generatedRoomId && (
                  <div className="room-id-display">
                    <div className="room-id-label">Your Room ID:</div>
                    <div className="room-id-box">
                      <span className="room-id-text">{generatedRoomId}</span>
                      <button className="copy-button" onClick={copyRoomId}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Join Room Card */}
            <div className="action-card join-card">
              <div className="card-glow"></div>
              <div className="card-content">
                <div className="card-icon">
                  <Users size={48} strokeWidth={2} />
                </div>
                
                <h3 className="card-title">Join Existing Room</h3>
                <p className="card-description">
                  Enter a room code to collaborate with others on their whiteboard canvas.
                </p>

                {!showJoinInput ? (
                  <button 
                    className="action-button join-button" 
                    onClick={() => setShowJoinInput(true)}
                  >
                    <LogIn size={20} />
                    <span>Join Room</span>
                  </button>
                ) : (
                  <div className="join-input-section">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        className="room-input"
                        maxLength={8}
                      />
                    </div>
                    <div className="button-group">
                      <button 
                        className="action-button join-button" 
                        onClick={handleJoinRoom}
                        disabled={!roomId.trim()}
                      >
                        <LogIn size={20} />
                        <span>Join Now</span>
                      </button>
                      <button 
                        className="cancel-button" 
                        onClick={() => {
                          setShowJoinInput(false);
                          setRoomId('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="features-showcase">
            <div className="features-header">
              <h2 className="features-title">What You Can Do</h2>
              <p className="features-subtitle">Powerful tools for seamless collaboration</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-card-inner">
                  <div className="feature-icon-wrapper">
                    <div className="feature-icon purple">
                      <Pencil size={28} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="feature-content">
                    <h4 className="feature-title">Free Drawing</h4>
                    <p className="feature-description">Sketch ideas and diagrams with intuitive drawing tools. Perfect for brainstorming and visual thinking.</p>
                  </div>
                  <div className="feature-badge">Drawing</div>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-inner">
                  <div className="feature-icon-wrapper">
                    <div className="feature-icon blue">
                      <Users size={28} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="feature-content">
                    <h4 className="feature-title">Real-Time Sync</h4>
                    <p className="feature-description">See changes instantly as your team collaborates together. No lag, no delay, just pure synchronization.</p>
                  </div>
                  <div className="feature-badge">Collaboration</div>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-inner">
                  <div className="feature-icon-wrapper">
                    <div className="feature-icon green">
                      <Sparkles size={28} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="feature-content">
                    <h4 className="feature-title">Smart Tools</h4>
                    <p className="feature-description">Access shapes, text, sticky notes, and more. Everything you need for effective visual communication.</p>
                  </div>
                  <div className="feature-badge">Tools</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Whiteboard;
