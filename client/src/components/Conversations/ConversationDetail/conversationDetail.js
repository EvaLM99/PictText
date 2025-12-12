import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { Button, TextField, Avatar, Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText, AvatarGroup, Tooltip, List, ListItem, ListItemButton, ListItemAvatar, ListItemText } from "@mui/material";
import "./conversationDetail.css";
import { useFetchWithAuth } from "../../../utils/fetchWithAuth.js";
import { SendHorizontal, Pencil, Users, Image, Check, X } from 'lucide-react';
import MessageItem from "../MessageItem/messageItem.js";
import { useSocket } from "../../../context/SocketContext";
import OnlineBadge from "../../onlineBadge.js";
import { usePresence } from "../../../context/PresenceContext.js";


function ConversationDetail() {
    const { isLoggedIn, accessToken: token, refreshAccessToken, userId } = useContext(AuthContext);
    const { id: conversationId } = useParams();
    const fetchWithAuth = useFetchWithAuth();
    const navigate = useNavigate();
    const socket = useSocket();
    const {isOnline} = usePresence();

    const [messages, setMessages]=useState([]);
    const [conversation, setConversation] = useState(null);
    const [newMessage, setNewMessage]=useState("");
    const [oldestMessageDate, setOldestMessageDate] = useState(null);
    const [messageEdited, setMessageEdited] = useState("");
    const [idMessageEdited, setIdMessageEdited] = useState("");
    const [isEditingMessage, setIsEditingMessage] = useState(false);
    const [bubbleColor, setBubbleColor] = useState("#FF0000");
    const [isOpenDialogNameGroup, setIsOpenDialogNameGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [groupPictureFile, setGroupPictureFile] = useState(null);
    const [groupPictureFileName, setGroupPictureFileName] = useState("");

    const [messagegroupPictureFile, setMessagegroupPictureFile] = useState(null);

    const [imageTimestamp, setImageTimestamp] = useState(Date.now());

    const [openParticipantsDialog, setOpenParticipantsDialog] = useState(false);

    const messagesRef = useRef();

    const otherParticipant = conversation?.participants?.find(p => p._id !== userId);
    const displayConversationName = conversation?.name 
        ? conversation.name 
        : otherParticipant 
            ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
            : "";
    
    const [searchParams, setSearchParams] = useSearchParams();
    const messageId = searchParams.get('messageId');
    

    useEffect(() => {
        if (!isLoggedIn) return;
        fetchConversation();
        fetchMessages();
    }, [conversationId, isLoggedIn]);

    useEffect(() => {
        if (messageId && messages.length > 0) {
            // Attendre que le DOM soit mis à jour
            const timer = setTimeout(() => {
                const messageElement = document.getElementById(`message-${messageId}`);
                if (messageElement) {
                    messageElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    
                    // Effet de surbrillance temporaire
                    messageElement.classList.add('highlighted-message');
                    setTimeout(() => {
                        messageElement.classList.remove('highlighted-message');
                        setSearchParams({}); // Nettoyer l'URL
                    }, 2000);
                }
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [messageId, messages, setSearchParams]);

    useEffect(() => {
        if (!socket || !conversationId) return;

        // Rejoindre la conversation
        socket.emit("join_conversation", {conversationId, userId});

        // Écouter les nouveaux messages
        const handleNewMessage = (newMsg) => {
            setMessages(prev => [newMsg, ...prev]);
        };

        // Écouter les messages vus
        const handleMessageSeen = (updatedMessage) => {
            setMessages(prev =>
                prev.map(m => m._id === updatedMessage._id ? updatedMessage : m)
            );
        };

        //Écouter les messages mis à jour
        const handleMessageUpdated = (updatedMessage) => {
            setMessages(prev => prev.map(m => m._id === updatedMessage._id ? updatedMessage : m));
        };

        //Ecouter les messages supprimés
        const handleMessageDeleted = ({ messageId, deleteType, uid }) => {
            setMessages(prev => prev.map(m => {
                if (m._id !== messageId) return m;
                if (deleteType === "forMe") {
                    if (uid === userId) {
                        return { ...m, deletedFor: [...(m.deletedFor || []), uid] };
                    } 
                    return { ...m, deletedFor: [...(m.deletedFor || []), uid] };
                }
                if (deleteType === "forAllParticipants") {
                    return { ...m, deletedForEveryone: true };
                }
                return m;
            }));
        };

        // Écouter les mises à jour du nom de conversation
        const handleConversationNameUpdated = ({ conversationId: updatedId, name, conversation: updatedConv }) => {
            if (updatedId === conversationId) {
                setConversation(updatedConv);
            }
        };

        // Écouter les mises à jour de la couleur de conversation
        const handleConversationColorUpdated = ({ conversationId: updatedId, color, conversation: updatedConv }) => {
            if (updatedId === conversationId) {
                setBubbleColor(color);
                setConversation(updatedConv);
            }
        };

        // Écouter les mises à jour du nom de groupe de la conversation
        const handleConversationGroupPictureUpdated = ({ conversationId: updatedId, groupPicture, conversation: updatedConv }) => {
            if (updatedId === conversationId) {
                setConversation(updatedConv);
                setImageTimestamp(Date.now());
            }
        };

        socket.on("new_message", handleNewMessage);
        socket.on("message_seen", handleMessageSeen);
        socket.on("message_updated", handleMessageUpdated);
        socket.on("message_deleted", handleMessageDeleted);
        socket.on("conversation_name_updated", handleConversationNameUpdated);
        socket.on("conversation_color_updated", handleConversationColorUpdated);
        socket.on("conversation_groupPicture_updated", handleConversationGroupPictureUpdated);

        // Nettoyage
        return () => {
            socket.off("new_message", handleNewMessage);
            socket.off("message_seen", handleMessageSeen);
            socket.off("message_updated", handleMessageUpdated);
            socket.off("message_deleted", handleMessageDeleted);
            socket.off("conversation_name_updated", handleConversationNameUpdated);
            socket.off("conversation_color_updated", handleConversationColorUpdated);
            socket.off("conversation_groupPicture_updated", handleConversationGroupPictureUpdated);
        };
    }, [socket, conversationId, userId]);


    const handleSeenMessage = (messageId) => {
        // Envoyer au serveur via socket
        socket.emit("seen_message", { messageId, userId });
    };



    const fetchMessages = async (before = null) => {
        try {
            let endpoint = `/api/messages/${conversationId}?limit=100`;
            if (before) endpoint += `&before=${before}`;

            const res = await fetchWithAuth("GET", endpoint);
            const fetchedMessages = res.data.map(m => ({
                ...m,
                deletedFor: m.deletedFor || [],
                deletedForEveryone: m.deletedForEveryone || false
            }));

            setMessages(prev => {
                const newMessages = fetchedMessages.filter(
                    m => !prev.some(pm => pm._id === m._id)
                );
                return before ? [...newMessages, ...prev] : newMessages;
            });


            if (fetchedMessages.length > 0) {
                setOldestMessageDate(fetchedMessages[0].createdAt);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchConversation = async () => {
        try {
            const res = await fetchWithAuth("GET", `/api/conversations/${conversationId}`);
            setConversation(res.data);
            setBubbleColor(res.data.color);
        } catch (err) {
            console.error("Erreur récupération conversation :", err);
        }
    };


    const handleScroll = () => {
        if (messagesRef.current.scrollTop === 0 && oldestMessageDate) {
            fetchMessages(oldestMessageDate);
        }
    };


    const handleSubmitMessage = async(e) => {
        e.preventDefault();
        if (!newMessage.trim() && !messagegroupPictureFile) return;
        try {
            const formData = new FormData();
            formData.append("conversationId", conversationId);
            formData.append("text", newMessage)
            if (messagegroupPictureFile) formData.append("image", messagegroupPictureFile);
            const res = await fetch(`${process.env.REACT_APP_API_URL}/api/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setNewMessage("");
                setMessagegroupPictureFile(null);
            } else console.error("Erreur serveur :", data);
        } catch (error) {
            console.error("Erreur réseau :", error);
        }
    };


    const handleEditMessage = (messageId, currentText = "") => {
        const isClosing = idMessageEdited === messageId;
        setIdMessageEdited(isClosing ? "" : messageId);
        setIsEditingMessage(!isClosing);
        setMessageEdited(isClosing ? "" : currentText);
    };

    const handleUpdateMessage = async(messageId) => {
        try{
            const res = await fetchWithAuth("PATCH", `/api/messages/${messageId}`, {text: messageEdited}, true);
            if (res.data.success){
                const updated = res.data.message;
                
                setIdMessageEdited("");
                setIsEditingMessage(false);
                setMessageEdited("");
            } else console.error("Erreur serveur ");
        } catch(err) {
            console.error("Erreur modification commentaire :", err);
        }
    };


    const handleDeleteMessage = async(messageId, deleteType="forMe") => {
        try {
            const res = await fetchWithAuth("PATCH", `/api/messages/${messageId}/delete`, {deleteType}, true);
            setMessages(prev => prev.map(m => {
                if (m._id !== messageId) return m;
                if (deleteType === "forMe") {
                    return { ...m, deletedFor: [...(m.deletedFor || []), userId] };
                }
                if (deleteType === "forAllParticipants") {
                return { ...m, deletedForEveryone: true };
            }
            return m;
        }));

        } catch (err) {
            console.error("Erreur suppression commentaire :", err);
        }
    };

    const handleEditColor = async(e) => {
        try {
            const res = await fetchWithAuth("PATCH", `/api/conversations/${conversationId}/color`, {color: bubbleColor})
            if (!res.data.success) console.error("Erreur serveur :", res.data);
        } catch (err) { console.error("Erreur réseau :", err); }
    };
   
   
 
    function getContrastYIQ(hexcolor){
        hexcolor = hexcolor.replace("#", "");
        const r = parseInt(hexcolor.substr(0,2),16);
        const g = parseInt(hexcolor.substr(2,2),16);
        const b = parseInt(hexcolor.substr(4,2),16);
        const yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    };


    const handleOpenDialogNameGroup = () => {
        setNewGroupName(conversation?.name || "");
        setIsOpenDialogNameGroup(true);
    };

    const handleCloseDialogNameGroup = () => {
        setIsOpenDialogNameGroup(false);
        setNewGroupName("");
    };

    const handleUpdateGroupName = async(e) => {
        try {
            const res = await fetchWithAuth("PATCH", `/api/conversations/${conversationId}/name`, {name: newGroupName})

            if (res.data.success) {
                setConversation(res.data.conversation);
                handleCloseDialogNameGroup();
            }
        } catch (error) {
            console.error("Erreur réseau :", error);
        }
    };

    const handleGroupPictureFileChange = (e) => {
        if (e.target.files.length > 0) {
            setGroupPictureFile(e.target.files[0]);
            setGroupPictureFileName(e.target.files[0].name);
        } else {
            setGroupPictureFile(null);
            setGroupPictureFileName("");
        }
    };


    const handleMessageImageChange = (e) => {
        if (e.target.files.length > 0) {
            setMessagegroupPictureFile(e.target.files[0]);
        } else {
            setMessagegroupPictureFile(null);
        }
    };


    const handleConversationPictureCancel = (e) => {
        setGroupPictureFile(null);
        setGroupPictureFileName("");
    }

    const handleConversationPictureSubmit = async(e) => {
        try {
            const formData = new FormData();
            formData.append("groupPicture", groupPictureFile);
            const res = await fetch(`/api/conversations/${conversationId}/groupPicture`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData
            });

            const data = await res.json(); 

            if (!data.success) console.error("Erreur serveur :", data)
            else {
                setGroupPictureFile(null);
                setGroupPictureFileName("");

        };
        } catch (err) { console.error("Erreur réseau :", err); }
        
    }

    const handleLabelKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
        document.getElementById("picture-post").click();
        }
    };

    const lastSeenByUser = useMemo(() => {
        const map = {};
        messages.forEach(msg => {
            msg.seenBy?.forEach(s => {
                const uid = s.user._id;

                // On garde seulement le dernier message vu par chaque utilisateur
                if (!map[uid] || new Date(msg.createdAt) > new Date(map[uid].messageDate)) {
                    map[uid] = { ...s, messageId: msg._id, messageDate: msg.createdAt, senderId: msg.sender._id };
                }
            });
        });
        return map;
    }, [messages]);

    const lastSentByUser = useMemo(() => {
        const map = {};

        if (!conversation?.participants) return map;

        conversation.participants.forEach(participant => {
            const sentMessages = messages
                .filter(m => m.sender._id === participant._id)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (sentMessages.length > 0) {
                map[participant._id] = {
                    messageId: sentMessages[0]._id,
                    createdAt: sentMessages[0].createdAt
                };
            }
        });

        return map;
    }, [messages, conversation]);

    
    // trouve le message où afficher la bulle "vu"

    const messagesToShowSeenBubbles = useMemo(() => {


        if (!conversation?.participants) return {};

        const map = {};
        // 1. Partir des messages vus
        Object.values(lastSeenByUser).forEach(seen => {
            if (seen.user._id === userId) return; // pas moi

            const userIdSeen = seen.user._id;
            const seenDate = new Date(seen.seenAt);
            const lastSent = lastSentByUser[userIdSeen];

            // 2. Comparer avec le dernier message envoyé par cet utilisateur
            if (lastSent) {
                const sentDate = new Date(lastSent.createdAt);

                // si dernier message envoyé est plus récent que dernier message vu → on remplace
                if (sentDate > seenDate) {
                    map[userIdSeen] = {
                        user: seen.user,
                        type: 'sent',
                        messageId: lastSent.messageId,
                        date: lastSent.createdAt
                    };
                    return;
                }
            }

            // sinon on garde le dernier message vu
            map[userIdSeen] = {
                user: seen.user,
                type: 'seen',
                messageId: seen.messageId,
                date: seen.seenAt
            };
        });

        Object.keys(lastSentByUser).forEach(uid => {
            if (uid === userId) return;

            if (!map[uid]) {
                const lastSent = lastSentByUser[uid];
                if (!lastSent) return;

                const userObj = conversation.participants.find(p => p._id === uid);

                if (userObj) {
                    map[uid] = {
                        user: userObj,
                        type: 'sent',
                        messageId: lastSent.messageId,
                        date: lastSent.createdAt
                    };
                }
            }
        })
        return map;
   }, [lastSeenByUser, lastSentByUser, userId]);

    return (
        <div className="conversation-detail-container">
            <div className="conversation-spacer"></div>
            <div className="conversation-container">
                <div className="conversation-description">
                    {conversation?.groupPicture ? (
                        <Avatar src={`${process.env.REACT_APP_API_URL}${conversation.groupPicture}?t=${imageTimestamp}`} sx={{ width: 70, height: 70, fontSize: 21 }} />
                    ) : (
                        <AvatarGroup max={4}>
                            {conversation?.participants.map((participant)=>{
                                if (participant._id === userId) return null;
                                return(
                                    <Tooltip 
                                        key={participant._id} 
                                        title={`${participant.firstName} ${participant.lastName}`} 
                                        arrow
                                    >
                                        <OnlineBadge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            variant="dot"
                                            invisible={!isOnline(participant._id)}
                                            badgeSize={20}
                                        >
                                            <Avatar 
                                                alt={`${participant.firstName} ${participant.lastName}`} 
                                                src={`${process.env.REACT_APP_API_URL}${participant.profilePicture}`} 
                                                id={participant._id} 
                                                sx={{ width: 70, height: 70, fontSize: 21 }}
                                                onClick={() => { navigate(`/profile/${participant._id}`)}} 
                                            />
                                        </OnlineBadge>
                                    </Tooltip>
                                )
                            })}
                            
                        </AvatarGroup>
                    )}
                    <h2>{displayConversationName}</h2>
                </div>
                <div className="messages" ref={messagesRef} onScroll={handleScroll}>
                    {messages && messages.map((message, index) => (
                        <div 
                            key={message._id} 
                            id={`message-${message._id}`}
                            className={`message-wrapper${message._id === messageId ? ' selectedMessage' : ''}`}
                        >
                            <MessageItem
                                key={message._id}
                                message={message}
                                isMe={message.sender._id === userId}
                                userId={userId}
                                bubbleColor={bubbleColor}
                                isEditingMessage={isEditingMessage}
                                idMessageEdited={idMessageEdited}
                                messageEdited={messageEdited}
                                setMessageEdited={setMessageEdited}
                                handleUpdateMessage={handleUpdateMessage}
                                handleEditMessage={handleEditMessage}
                                handleDeleteMessage={handleDeleteMessage}
                                handleSeenMessage={handleSeenMessage}
                                getContrastYIQ={getContrastYIQ}
                                messagesToShowSeenBubbles={messagesToShowSeenBubbles}
                            />
                        </div>
                    ))}
                </div>

                <div className="message-new">
                    <form className="message-new-form" onSubmit={handleSubmitMessage}>
                        <TextField
                            id="content"
                            label="Ecrire un message ..."
                            variant="standard"
                            multiline
                            sx={{width: '400px'}}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <input
                            type="file"
                            id="message-image-input"
                            className="message-image-input"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleMessageImageChange}
                            style={{ display: 'none' }} 
                        />
                        <label
                            htmlFor="message-image-input"
                            className="message-image-input-trigger"
                            tabIndex="0"
                            onKeyDown={handleLabelKeyDown}
                        >
                            <Image size={30} />
                        </label>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={!newMessage.trim() && !messagegroupPictureFile} 
                            sx={{backgroundColor: `${bubbleColor}`, color: `${getContrastYIQ(bubbleColor)}`}}
                        >
                            <SendHorizontal />
                        </Button>
                    </form>
                </div>
            </div>
            <div className="conversation-setting-container">
                <h4>Paramètres de la conversation</h4>
                {conversation?.participants.length > 2 && (
                    <div className="conversation-setting-group">
                        <button className = "group-name" onClick={handleOpenDialogNameGroup}>
                        Modifier le nom du groupe <Pencil size={16} />
                        </button>


                        <div className="conversation-picture">
                            <input
                                type="file"
                                id="conversation-picture-input"
                                className="conversation-picture-input"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={handleGroupPictureFileChange}
                                style={{ display: 'none' }} 
                            />
                            <label
                                htmlFor="conversation-picture-input"
                                className="conversation-picture-input-trigger"
                                tabIndex="0"
                                onKeyDown={handleLabelKeyDown}
                            >
                                Modifier la photo du groupe<Image size={16}/>
                            </label>
                            {groupPictureFile && groupPictureFileName && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start'
                                    }}
                                >
                                    <p 
                                        style={{ 
                                            fontStyle: 'italic', 
                                            fontSize: '13px',
                                            maxWidth: '300px',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis' 
                                        }}
                                    >
                                        {groupPictureFileName}
                                    </p>
                                    <Button
                                        className="conversation-picture-submit"
                                        variant="contained"
                                        onClick={handleConversationPictureSubmit}
                                    >
                                        <Check size={16} color="green" />
                                    </Button>
                                    <Button
                                        className="conversation-picture-cancel"
                                        variant="contained"
                                        onClick={handleConversationPictureCancel}
                                    >
                                        <X size={16} color="red" />
                                    </Button>
                            </div>
                        )}
                        </div>
                    </div>
                )}

                <Dialog 
                    open={isOpenDialogNameGroup}
                    onClose={handleCloseDialogNameGroup}
                    slotProps={{
                        paper: {
                            sx: {
                                width: "450px",
                                borderRadius: "12px",
                                padding: "15px"
                            }
                        }
                    }}
                >
                    <DialogTitle>Modifier le nom du groupe</DialogTitle>

                    <DialogContent>
                        <DialogContentText>
                            Choisissez un nouveau nom pour ce groupe.
                        </DialogContentText>

                        <TextField
                            fullWidth
                            label="Nom du groupe"
                            variant="standard"
                            sx={{ marginTop: "25px" }}
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                        />
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={handleCloseDialogNameGroup}>Annuler</Button>
                        <Button 
                            onClick={handleUpdateGroupName}
                            disabled={newGroupName.trim().length < 3 || newGroupName === conversation.name}
                        >
                            Enregistrer
                        </Button>
                    </DialogActions>
                </Dialog>

                
                <div className="color-picker">
                    <label>Couleur des messages :</label>
                    <input
                        type="color"
                        value={bubbleColor}
                        onChange={(e) => setBubbleColor(e.target.value)}
                        onBlur={handleEditColor}
                    />
                </div>
                <button className="participants" onClick={() => setOpenParticipantsDialog(true)}>Participants <Users size={16} /></button>
                <Dialog open={openParticipantsDialog} onClose={() => setOpenParticipantsDialog(false)}>
                    <DialogTitle>Participants</DialogTitle>
                    <List sx={{ pt: 0 }}>
                        {conversation?.participants.map(p => (
                            <ListItem disablePadding key={p._id}>
                                <ListItemButton onClick={() => { navigate(`/profile/${p._id}`); setOpenParticipantsDialog(false); }}>
                                    <ListItemAvatar>
                                        <OnlineBadge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            variant="dot"
                                            invisible={!isOnline(p._id)}
                                            badgeSize={12}
                                        >
                                            <Avatar src={`${process.env.REACT_APP_API_URL}${p.profilePicture}`} />
                                        </OnlineBadge>
                                    </ListItemAvatar>
                                    <ListItemText primary={`${p.firstName} ${p.lastName}`} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Dialog>
            </div>
        </div>
    );
}

export default ConversationDetail;
