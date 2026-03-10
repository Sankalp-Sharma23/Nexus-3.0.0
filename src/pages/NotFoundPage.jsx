import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

export default function NotFoundPage() {
  return (
    <div className="notfound-root">
      <div className="notfound-grid" />
      <div className="notfound-content">
        <h1 className="notfound-code">
          <span className="notfound-four">4</span>
          <span className="notfound-zero">0</span>
          <span className="notfound-four">4</span>
        </h1>
        <p className="notfound-message">
          This route doesn't exist in the Nexus network.
        </p>
        <div className="notfound-actions">
          <Link to="/" className="notfound-btn notfound-btn--home">
            Return Home
          </Link>
          <Link to="/dashboard" className="notfound-btn notfound-btn--dash">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
