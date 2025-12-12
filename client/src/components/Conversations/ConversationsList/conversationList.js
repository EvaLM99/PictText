import { useNavigate, Link } from "react-router-dom";
import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { Button, TextField, Avatar, Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText } from "@mui/material";
import "./conversationList.css";
import { useFetchWithAuth } from "../../../utils/fetchWithAuth.js";
import { Check, X } from "lucide-react";
import { useSocket } from "../../../context/SocketContext";
import OnlineBadge from "../../onlineBadge.js";
import { usePresence } from '../../../context/PresenceContext';
import GlobalSearch from "../../GlobalSearch/globalSearch.js";


function ConversationList() {
    const { isLoggedIn, accessToken, userId } = useContext(AuthContext);
    const [queryResearch, setQueryResearch]=useState("");
    const [users, setUsers]=useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [errorUsers, setErrorUsers] = useState(null);
    const fetchWithAuth = useFetchWithAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [conversationUsers, setConversationUsers] = useState([]);
    const [userConversations, setUserConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState("");
    const socket = useSocket();
    const {isOnline} = usePresence();

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await fetchWithAuth("GET", "/api/conversations");
                setUserConversations(res.data);
            } catch (err) {
                console.error(err);
                setError("Impossible de récupérer les données");
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();

    }, [fetchWithAuth]);

    useEffect(() => {
        if (!socket || !userId) return;

        // Rejoindre sa room
        socket.emit("join_user", userId);

        // Écouter les nouvelles conversations
        const handleNewConversation = (conversation) => {
            setUserConversations(prev => {
                // Évite les doublons
                if (prev.some(c => c._id === conversation._id)) return prev;
                return [conversation, ...prev];
            });
        };

        // Écouter les mises à jour du lastMessage
        const handleLastMessageUpdated = ({ conversationId, conversation }) => {
            setUserConversations(prev => 
                prev.map(c => c._id === conversationId ? conversation : c)
                   .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            );
        };

        // Écouter les mises à jour du nom de conversation
        const handleConversationNameUpdated = ({ conversationId, name, conversation }) => {
            setUserConversations(prev =>
                prev.map(c => c._id === conversationId ? conversation : c)
            );
        };

        socket.on("new_conversation", handleNewConversation);
        socket.on("last_message_updated", handleLastMessageUpdated);
        socket.on("conversation_name_updated", handleConversationNameUpdated);

        return () => {
            socket.off("new_conversation", handleNewConversation);
            socket.off("last_message_updated", handleLastMessageUpdated);
            socket.off("conversation_name_updated", handleConversationNameUpdated);
        };
    }, [socket, userId]);


    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setConversationUsers([]);
        setMessage("");
        setQueryResearch("");
        setUsers([]);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        handleClose();
    };


    const fetchUsers = async (query) => {
        setLoadingUsers(true);
        setErrorUsers(null);
        try {
            const res = await fetchWithAuth("GET", `/api/users/search?query=${encodeURIComponent(query)}`);
            // depending on your fetchWithAuth response shape you might need res.data
            setUsers(res.data ?? res);
        } catch (err) {
            console.error("Erreur récupération des utilisateurs :", err);
            setErrorUsers("Impossible de récupérer les utilisateurs");
        } finally {
            setLoadingUsers(false);
        }
    };
    
    const handleResearch = async (e) => {
        const value = e.target.value;
        setQueryResearch(value);
        
        if (!value.trim()) {
            setUsers([]);
            return;
        }
        
        fetchUsers(value);
    };

    const addUser = user => {
        setConversationUsers(prev => prev.some(u => u._id === user._id) ? prev : [...prev, user]);
    }

    const removeUser = user => {
        setConversationUsers(prev => prev.filter(u => u._id !== user._id));
    }

    const handleCreateConversation = async(e) => {
        e.preventDefault();
        try{
            const participantIds = conversationUsers.map(user => user._id);
            if (!participantIds.includes(userId)) {
                participantIds.push(userId);
            }

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/conversations`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ participants: participantIds, lastMessageText: message })
            });
            const data = await response.json();

            if (response.ok) {
                console.log("✅ Conversation crée avec succès !", data.conversation);
                setUserConversations(prev => {
                    // On évite les doublons côté frontend
                    const exists = prev.some(c => c._id === data.conversation._id);
                    return exists ? prev : [data.conversation, ...prev];
            });
                handleClose();
                navigate(`/conversations/${data.conversation._id}`);

            } else {
                    console.error("Erreur serveur :", data);
            }
        } catch (error) {
            console.error("Erreur réseau :", error);
        }
    }

    const formatDate = (date) => {
        const d = new Date(date);
        const now = new Date();
        
        const diffMs = now - d;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        // --- Moins de 24h → HH:mm ---
        if (diffHours < 24) {
            return d.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        // --- Moins de 7 jours → jour de la semaine ---
        if (diffDays < 7) {
            return d.toLocaleDateString("fr-FR", {
                weekday: "long"
            });
        }

        // --- Plus de 7 jours → dd/mm/yy ---
        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit"
        });
    };


    const handleDeleteConversation = async(conversationId) => {
        try {
            const res = await fetchWithAuth("PATCH", `/api/conversations/${conversationId}/delete`, {}, true);
            console.log(res);
            if (res.data.success) {
                setUserConversations(prev => prev.filter(c => c._id !== conversationId));
            }
        } catch (err) {
            console.error("Erreur suppression conversation :", err);
        }
    }
  

    return (
        <div className="conversation-list-container">
            <GlobalSearch />
            <div className="create-conversation">
                <Button
                    className="button-create-conversation"
                    variant="contained"
                    sx={{backgroundColor: "var(--primaryColor)"}}
                    onClick={handleClickOpen}
                >
                    Nouvelle conversation
                </Button>
                <Dialog 
                    open={open} 
                    onClose={handleClose}
                    slotProps={{
                        paper: {
                            sx: {
                                width: "500px",
                                maxWidth: "500px",
                                height: "600px",
                                maxHeight: "600px",
                                borderRadius: "12px",
                                padding: "10px"
                            }
                        }
                    }}
                >
                    <DialogTitle>Nouvelle conversation</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Ajoutez les participants
                        </DialogContentText>
                        <TextField
                                id="search"
                                label="Rechercher..."
                                variant="standard"
                                value={queryResearch}
                                onChange={(e) => handleResearch(e)}
                                sx={{width: '400px'}}
                        />
                        <div className="users-conversation">
                            {conversationUsers && conversationUsers.map((selectedUser) => (
                                <div className="user-selected" key={selectedUser._id}>
                                    <Avatar alt={`${selectedUser.firstName} ${selectedUser.lastName}`} src={`${process.env.REACT_APP_API_URL}${selectedUser.profilePicture}`} sx={{marginRight: '5px'}}/>
                                    <p onClick={() => navigate(`/profile/${selectedUser._id}`)} className="view-profile-cursor">{selectedUser.firstName} {selectedUser.lastName}</p>
                                    <button onClick={() => removeUser(selectedUser)}>
                                        <X color='red'/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="separator-conversation-create"></div>
                        <div className="users-research">
                            {users && users.map((user) => {
                                if (conversationUsers.some(u => u._id === user._id)) {
                                    return null;
                                }
                                return (
                                    <div className="user-research" key={user._id}>
                                        <Avatar alt={`${user.firstName} ${user.lastName}`} src={`${process.env.REACT_APP_API_URL}${user.profilePicture}`} sx={{marginRight: '5px'}}/>
                                        <p>{user.firstName} {user.lastName}</p>
                                        <button onClick={() => addUser(user)}>
                                            <Check color='green'/>
                                        </button>
                                    </div>
                                )
                                
                            })}
                        </div>
                        <TextField
                            id="content"
                            label="Ecrire un message ..."
                            variant="standard"
                            multiline
                            sx={{width: '400px'}}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Annuler</Button>
                        <Button onClick={handleCreateConversation} disabled={conversationUsers.length === 0 || !message.trim()}>
                                Créer
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
            <div className="conversation-list">
                {userConversations.map((conversation) => {
                    const participants = conversation.participants ?? [];
                    const others = participants.filter(p => p._id !== userId);
                    const isActive = others.some(p => isOnline(p._id));
                    const displayName =
                        conversation.name
                            || (others.length === 1
                                ? `${others[0].firstName} ${others[0].lastName}`
                                : others.map(p => `${p.firstName} ${p.lastName}`).join(", ")
                            );

                    const displayPicture =
                        conversation.name
                            ? conversation.groupPicture
                            : others[0]?.profilePicture;

                    const lastMessage = conversation.lastMessage;
                    const lastMessageAuthor = lastMessage?.sender?._id === userId 
                        ? "Vous" 
                        : `${lastMessage?.sender?.firstName || ''} ${lastMessage?.sender?.lastName || ''}`;
                    const lastMessageText = lastMessage?.text;

                    let isMessageDisplayed;

                    if (lastMessage.deleted) {
                        // Aucun message dans la conversation
                        isMessageDisplayed = "none";
                    } else {
                        const isMessageDeleted = lastMessage.deletedForEveryone === true;
                        isMessageDisplayed = isMessageDeleted ? "deletedMessage" : "display";
                    }
        


                    return (
                    <div className="conversation" key={conversation._id} onClick={() => navigate(`/conversations/${conversation._id}`)}>
                        <OnlineBadge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            variant="dot"
                            invisible={!isActive}
                            badgeSize={12}
                        >
                            <Avatar
                                src={`${process.env.REACT_APP_API_URL}${displayPicture}`}
                                alt={displayName}
                                sx={{ width: 40, height: 40, fontSize: 12 }}
                            />
                        </OnlineBadge>
                        
                        <div className="conversation-info">
                            <h4 className="conversation-name">{displayName}</h4>
                            <p className="conversation-last-message">{isMessageDisplayed === "display" 
                            ? `${lastMessageAuthor}: ${lastMessageText}`
                            : isMessageDisplayed === "deletedMessage" && `${lastMessageAuthor} ${lastMessageAuthor === "Vous" ? "avez" : `a`} supprimé un message`
                        }</p>
                        </div>
                        <p className="conversation-last-message-time">{formatDate(lastMessage?.createdAt)}</p>
                        <button className="conversation-delete" 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation._id)
                            }}
                        >
                            <X color='red' width="20px" />
                        </button>
                    </div>
                )})}
            </div>
        </div>
    );
}

export default ConversationList;
