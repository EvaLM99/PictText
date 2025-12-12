import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Avatar, CircularProgress } from '@mui/material';
import { Search, MessageSquare, Users } from 'lucide-react';
import { useFetchWithAuth } from '../../utils/fetchWithAuth';
import './globalSearch.css';

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ conversations: [], messages: [] });
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const fetchWithAuth = useFetchWithAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  // Fermer les résultats si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce de la recherche
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setResults({ conversations: [], messages: [] });
      setShowResults(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth('GET', `/api/search?query=${encodeURIComponent(query)}`);
        setResults(res.data);
        setShowResults(true);
      } catch (err) {
        console.error('Erreur recherche:', err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms de délai

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, fetchWithAuth]);

  const handleConversationClick = (conversationId) => {
    navigate(`/conversations/${conversationId}`);
    setShowResults(false);
    setQuery('');
  };

  const handleMessageClick = (conversationId, messageId) => {
    // Naviguer vers la conversation avec le messageId en paramètre
    navigate(`/conversations/${conversationId}?messageId=${messageId}`);
    setShowResults(false);
    setQuery('');
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const hasResults = results.conversations.length > 0 || results.messages.length > 0;

  return (
    <div className="global-search-container" ref={searchRef}>
      <div className="search-input-wrapper">
        <Search size={20} className="search-icon" />
        <TextField
          placeholder="Rechercher des conversations ou des messages..."
          variant="outlined"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              paddingLeft: '40px',
            }
          }}
        />
        {loading && <CircularProgress size={20} className="search-loading" />}
      </div>

      {showResults && query.trim() && (
        <div className="search-results-dropdown">
          {!loading && !hasResults && (
            <div className="no-results">
              Aucun résultat pour "{query}"
            </div>
          )}

          {/* CONVERSATIONS */}
          {results.conversations.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <Users size={16} />
                <span>Conversations ({results.conversations.length})</span>
              </div>
              {results.conversations.map((conv) => (
                <div
                  key={conv._id}
                  className="search-result-item"
                  onClick={() => handleConversationClick(conv._id)}
                >
                  <Avatar
                    src={`${process.env.REACT_APP_API_URL}${conv.picture}`}
                    alt={conv.name}
                    sx={{ width: 40, height: 40 }}
                  />
                  <div className="search-result-info">
                    <div className="search-result-name">{conv.name}</div>
                    <div className="search-result-meta">
                      {conv.participants.length} participant{conv.participants.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MESSAGES */}
          {results.messages.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <MessageSquare size={16} />
                <span>Messages ({results.messages.length})</span>
              </div>
              {results.messages.map((msg) => (
                <div
                  key={msg._id}
                  className="search-result-item"
                  onClick={() => handleMessageClick(msg.conversationId, msg._id)}
                >
                  <Avatar
                    src={`${process.env.REACT_APP_API_URL}${msg.conversationPicture}`}
                    alt={msg.conversationName}
                    sx={{ width: 40, height: 40 }}
                  />
                  <div className="search-result-info">
                    <div className="search-result-name">{msg.conversationName}</div>
                    <div className="search-result-message">
                      <span className="message-sender">
                        {msg.sender.firstName}:
                      </span>
                      {' '}
                      {msg.highlightedText}
                    </div>
                    <div className="search-result-meta">
                      {formatDate(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;