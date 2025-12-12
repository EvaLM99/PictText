import { Avatar, Tooltip, TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, RadioGroup, Radio, Button, FormControlLabel } from "@mui/material";
import { Check, X, Pencil, MessageSquare, Cpu } from "lucide-react";
import { useState } from "react";
import { useRef, useEffect } from "react";
import { useInView } from "react-intersection-observer";

function MessageItem({ 
    message, 
    isMe, 
    userId,
    bubbleColor, 
    handleSeenMessage, 
    isEditingMessage, 
    messageEdited, 
    setMessageEdited, 
    idMessageEdited, 
    handleUpdateMessage, 
    handleEditMessage, 
    handleDeleteMessage,
    getContrastYIQ,
    messagesToShowSeenBubbles
}) {
    const hasBeenSeen = useRef(false);
    const [deleteType, setDeleteType] = useState("forMe");
    const [isOpenDialogDeleteMessage, setIsOpenDialogDeleteMessage] = useState(false);

    const { ref: inViewRef } = useInView({
        threshold: 0.5,
        triggerOnce: true, // Se déclenche une seule fois
        onChange: (inView) => {
            if (
                inView && 
                !isMe && 
                !hasBeenSeen.current &&
                !message.seenBy?.some(s => s.user?._id === userId || s.user === userId)
            ) {
                hasBeenSeen.current = true;
                handleSeenMessage(message._id);
            }
        }
    });

    const handleOpenDialogDeleteMessage = () => {
        setIsOpenDialogDeleteMessage(true);
    };

    const handleCloseDialogDeleteMessage = () => {
        setIsOpenDialogDeleteMessage(false);
        setDeleteType("forMe");
    };

    const isMessageDeleted = message?.deletedFor?.includes(userId);
    const isMessageDisplayed = isMessageDeleted 
                                ? "hide"
                                : message.deletedForEveryone
                                    ? "deletedMessage"
                                    : "display";

    const formatSeenDate = (date, dateType) => {
        const d = new Date(date);
        const now = new Date();
        
        const diffMs = now - d;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const type = ( dateType === "sent" ? "Envoyé" : "Vu");

        if (diffHours < 24) {
            // Moins de 24h → HH:mm
            const isToday = now.getHours() * 60 + now.getMinutes() > d.getHours() * 60 + d.getMinutes(); 
            return `${type} ${isToday ? "" : "hier"} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
        }

        if (diffDays < 7) {
            // Moins de 7 jours → jour de la semaine
            return `${type} ${d.toLocaleDateString("fr-FR", { weekday: "long" })}`;
        }

        // Plus de 7 jours → dd/mm/yyyy
        return `${type} le ${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    };


    useEffect(() => {
        if (isEditingMessage && idMessageEdited === message._id) {
            setMessageEdited(message.text);
        }
    }, [isEditingMessage, idMessageEdited, message._id]);


    const avatarsToDisplay = Object.values(messagesToShowSeenBubbles)
    .filter(s => s.messageId === message._id);
    
    return (
        <div 
            className={`message${isMe ? " right" : " left"} ${message.editedAt && message.createdAt !== message.editedAt ? " updated" : ""}`}
            ref={inViewRef}
        >
            { isMessageDisplayed !== "hide" && ( 
                <>
                    <div className={`message-detail${isMe ? " right" : " left"}`}>
                        <Avatar src={`${process.env.REACT_APP_API_URL}${message.sender.profilePicture}`} alt={`${message.sender.firstName} ${message.sender.lastName}`} sx={{ width: 40, height: 40, fontSize: 12 }} />
                        
                        {message.editedAt && message.createdAt !== message.editedAt && (
                                <p className="message-text-updated-flag">Modifié</p>
                        )}
                        <div 
                            className={`message-text-container${isMe ? " me" : " other"}`}
                            style={{
                                backgroundColor: isMe ? bubbleColor : "#eee",
                                color: isMe ? getContrastYIQ(bubbleColor) : "black"
                            }}
                        >
                            {isEditingMessage && idMessageEdited === message._id ? (
                                <TextField
                                    value={messageEdited}
                                    onChange={(e) => setMessageEdited(e.target.value)}
                                    variant="standard"
                                    fullWidth
                                    multiline
                                />
                            ) : isMessageDisplayed === "display" ? (
                                <Tooltip title={`${message.sender.firstName} ${message.sender.lastName} - ${formatSeenDate(message.createdAt,"sent")}`} arrow>
                                    {message.image && (
                                        <img src={`${process.env.REACT_APP_API_URL}/${message.image}`} alt="Photo" className="message-image" />
                                    )}
                                    {message.text &&
                                        (<p className="message-text">{message.text}</p>
                                    
                                    )}
                                </Tooltip>
                            ) : (
                                <p className="message-text" style={{fontStyle: 'italic'}}>Ce message a été supprimé.</p>
                            )
                        }
                        </div>
                        <div className="message-buttons">
                            {!isMe ? (
                                <button className="message-remove" onClick={() => handleDeleteMessage(message._id)}><X color='red' /></button>
                            ) : (
                                isEditingMessage ? (
                                    <>
                                        <button className="message-edit-validate" onClick={() => handleUpdateMessage(message._id)}><Check /></button>
                                        <button className="message-edit-back" onClick={() => handleEditMessage(message._id, message.text)}><X color='red' /></button>
                                    </>
                                ) : isMessageDisplayed !== "display" ? (
                                    <>
                                        <button className="message-remove" onClick={() => handleDeleteMessage(message._id)}><X color='red' /></button>
                                    </>
                                ) : (
                                    <>
                                        <button className="message-edit" onClick={() => handleEditMessage(message._id, message.text)}><Pencil /></button>
                                        <button className="message-remove" onClick={handleOpenDialogDeleteMessage}><X color='red' /></button>
                                        <Dialog 
                                            open={isOpenDialogDeleteMessage}
                                            onClose={handleCloseDialogDeleteMessage}
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
                                            <DialogTitle>Pour qui voulez-vous supprimer ce message ?</DialogTitle>
                        
                                            <DialogContent>
                                                    
                                                <RadioGroup
                                                    aria-labelledby="radio-button-delete"
                                                    name="radio-button-delete"
                                                    value={deleteType}
                                                    onChange={(e) => setDeleteType(e.target.value)}
                                                >
                                                    <FormControlLabel value="forMe" control={<Radio />} label="Pour moi" />
                                                    <FormControlLabel value="forAllParticipants" control={<Radio />} label="Pour tout le monde" />
                                                </RadioGroup>
                                            </DialogContent>
                        
                                            <DialogActions>
                                                <Button onClick={handleCloseDialogDeleteMessage}>Annuler</Button>
                                                <Button 
                                                    onClick={() => {
                                                        handleDeleteMessage(message._id, deleteType);
                                                        handleCloseDialogDeleteMessage();
                                                    }}
                                                >
                                                    Valider
                                                </Button>
                                            </DialogActions>
                                        </Dialog>
                                    </>
                                )
                            
                            )}
                        </div>
                    </div>

                    {avatarsToDisplay.length > 0 && (
                        <div className="seen-by">
                            {avatarsToDisplay.map(s => (
                                <Tooltip key={s.user._id} title={`${formatSeenDate(s.date,`${s.type}`)} par ${s.user.firstName} ${s.user.lastName}`}>
                                    <Avatar
                                        alt={`${s.user.firstName} ${s.user.lastName}`}
                                        src={`${process.env.REACT_APP_API_URL}${s.user.profilePicture}`}
                                        sx={{ width: 20, height: 20, fontSize: 6 }}
                                    />
                                </Tooltip>
                            ))}
                        </div>
                    )}
                </>               
            )}
        </div>
    );
}

export default MessageItem;