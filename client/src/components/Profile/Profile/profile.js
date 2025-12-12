import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { TextField, Button, Avatar, Dialog, DialogTitle, DialogContentText, DialogActions, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, DialogContent, Badge } from '@mui/material';
import { ThumbsUp, MessageCircle, Contact, Cake, Mars, Venus, Send } from 'lucide-react';
import { useFetchWithAuth } from "../../../utils/fetchWithAuth.js";
import "./profile.css";
import { useQueries, useQueryClient } from '@tanstack/react-query';
import OnlineBadge from '../../onlineBadge.js';
import { usePresence } from '../../../context/PresenceContext.js';


function Profile() {
    const fetchWithAuth = useFetchWithAuth();
    const { isLoggedIn, accessToken: token, refreshAccessToken, userId: me } = useContext(AuthContext);
    const { userId: profileId } = useParams();
    const { isOnline } = usePresence();
    const navigate = useNavigate();
    const [openFriends, setOpenFriends] = useState(false);
    const [openMessage, setOpenMessage] = useState(false);
    const [message, setMessage] = useState("");


    const handleOpenFriends = () => setOpenFriends(true);
    const handleCloseFriends = () => setOpenFriends(false);

    const handleOpenMessage = () => setOpenMessage(true);
    const handleCloseMessage = () => setOpenMessage(false);
    const queryClient = useQueryClient();


    // Requêtes parallèles avec useQueries
    const [userQuery, postsQuery, friendsQuery] = useQueries({
        queries: [
        {
            queryKey: ['user', profileId],
            queryFn: () => fetchWithAuth('GET', `/api/users/${profileId}`).then(r => r.data),
            enabled: isLoggedIn
        },
        {
            queryKey: ['userPosts', profileId],
            queryFn: () => fetchWithAuth('GET', `/api/posts/user/${profileId}`).then(r => r.data),
            enabled: isLoggedIn
        },
        {
            queryKey: ['userFriends', profileId],
            queryFn: () => fetchWithAuth('GET', `/api/users/${profileId}/friends`).then(r => r.data.friends),
            enabled: isLoggedIn
        }
        ]
    });

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, navigate]);
    
    const userData = userQuery.data;
    const userPostsData = postsQuery.data;
    const userFriends = friendsQuery.data;

    useEffect(() => {
        if (userPostsData && userPostsData.length > 0) {
            const pos = sessionStorage.getItem("scrollPos");
            if (pos) {
                window.scrollTo({ top: parseInt(pos), behavior: 'auto' });
                sessionStorage.removeItem("scrollPos");
            }
        }
    }, [userPostsData]);
    
    const handleLike = async (postId) => {
        // Optimistic update
        queryClient.setQueryData(['userPosts', profileId], old =>
        old.map(post =>
            post._id === postId
            ? {
                ...post,
                likes: post.likes.some(like => like.author === me)
                    ? post.likes.filter(l => l.author !== me)
                    : [...post.likes, { author: me }]
                }
            : post
        )
        );

        try {
            await fetchWithAuth("PATCH", `/api/posts/${postId}/like`, null, true);
        } catch (err) {
            console.error("Erreur like :", err);
            queryClient.invalidateQueries(['userPosts', profileId]);
        }
    };



    const handlePostClick = postId => {
        sessionStorage.setItem("scrollPos", window.scrollY);
        navigate(`/post/${postId}`)
    }

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        const intervals = {
            an: 31536000,
            mois: 2592000,
            semaine: 604800,
            jour: 86400,
            heure: 3600,
            minute: 60
        };

        for (let key in intervals) {
            const value = Math.floor(seconds / intervals[key]);
            if (value >= 1) return `il y a ${value} ${key}${value > 1 ? "s" : ""}`;
        }
        return "à l'instant";
    };
    
    const handleSendMessage = async(e) => {
        try {
            const res = await fetchWithAuth("GET", `/api/conversations/between/${profileId}/${me}`);
            console.log(res);
            if (res.data.exists) {
                navigate(`/conversations/${res.data.conversation._id}`)
            } else {
                handleOpenMessage();
            }
        } catch(err) {
            console.error("Erreur vérification existence conversation:", err);
        }
    }

    const handleCreateConversation = async(e) => {
        e.preventDefault();
        try {
           const response = await fetch(`${process.env.REACT_APP_API_URL}/api/conversations`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ participants: [profileId, me], lastMessageText: message })
            });

            const data = await response.json();

            if (response.ok) {

                console.log("✅ Conversation crée avec succès !", data.conversation);
                handleCloseMessage();
                navigate(`/conversations/${data.conversation._id}`);
            } else {
                console.error("Erreur serveur :", data);
            }
        } catch(err) {
            console.error("Erreur réseau :", err);
        }
    }


    if (!isLoggedIn) return null;
    

    if ([userQuery, postsQuery, friendsQuery].some(q => q.isLoading)) return <p>Chargement...</p>;
    if ([userQuery, postsQuery, friendsQuery].some(q => q.error)) return <p>Erreur de chargement</p>;

    return (
        <div className='profile'>
            {userData ? (
                <>
                    <div className='profile-data'>
                            <OnlineBadge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                variant="dot"
                                invisible={!isOnline(profileId)}
                                badgeSize={24}
                            >
                            <Avatar
                                sx={{ width: 200, height: 200, fontSize: 60 }}
                                src={`${process.env.REACT_APP_API_URL}${userData.profilePicture}`}
                                alt={`${userData.firstName[0].toUpperCase()}${userData.lastName[0].toUpperCase()}`}
                            />    
                            </OnlineBadge>     
                        <div className='profile-informations'>
                            <h1 className="profile-name">{userData.firstName} {userData.lastName}</h1>
                            <p>{userData.gender === "male" ? (<Mars size={20} color='darkblue' />) : (<Venus size={20} color='#FF00BF' />)}</p>
                            <p><Cake size={20} color='brown' />{new Date(userData.birthday).toLocaleDateString("fr-FR")}</p>
                            <button onClick={handleOpenFriends} className='friends-button'><Contact size={20} color='green' />Amis : {userFriends.length}</button>
                            <Dialog onClose={handleCloseFriends} open={openFriends}>
                                <DialogTitle>Amis</DialogTitle>
                                <List sx={{ pt: 0 }}>
                                    {userFriends.map((friend) => (
                                    <ListItem disablePadding key={friend._id}>
                                        <ListItemButton 
                                        onClick={() => {
                                            handleCloseFriends();
                                            navigate(`/profile/${friend.user._id}`)
                                        }}>
                                            <ListItemAvatar>
                                                <OnlineBadge
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                    variant="dot"
                                                    invisible={!isOnline(friend.user._id)}
                                                    badgeSize={12}
                                                >
                                                    <Avatar alt={`${friend.user.firstName} ${friend.user.lastName}`} src={`${process.env.REACT_APP_API_URL}${friend.user.profilePicture}`} sx={{marginRight: '5px'}}/>
                                                </OnlineBadge>
                                            </ListItemAvatar>
                                            <ListItemText primary={`${friend.user.firstName} ${friend.user.lastName}`} />
                                        </ListItemButton>
                                    </ListItem>
                                    ))}
                                </List>
                            </Dialog>
                            {profileId !== me && (<Button 
                                variant="contained" 
                                sx={{
                                    backgroundColor: "var(--secondaryColor)",
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: "5px",
                                    marginTop: "20px",
                                }}
                                onClick={handleSendMessage}
                            >
                                Envoyer un message<Send size={20} />
                            </Button>)}
                            <Dialog onClose={handleCloseMessage} open={openMessage}>
                                <DialogTitle>Nouveau message</DialogTitle>
                                <DialogContent>
                                    <DialogContentText>
                                        Quel message voulez-vous envoyer à {`${userData.firstName} ${userData.lastName}`}
                                    </DialogContentText>
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
                                    <Button onClick={handleCloseMessage}>Annuler</Button>
                                    <Button onClick={handleCreateConversation} disabled={!message.trim()}>
                                            Envoyer un message
                                    </Button>
                                </DialogActions>
                            </Dialog>
                        </div>
                        
                    </div>
                    <div className="separator"></div>
                    <div className="posts">
                        {userPostsData ? (
                            userPostsData.map((post) => {
                                const hasLiked = post.likes.some(like => like.author.toString() === me);
                                return (
                                    <div key={post._id} className="post" onClick={() => handlePostClick(post._id)}>
                                        <p className="post-time">{timeAgo(post.createdAt)}</p>
                                        <h2 className="post-author">{post.author?.firstName} {post.author?.lastName}</h2>
                                        <h3 className="post-content">{post.title}</h3>
                                        <p className="post-content">{post.content}</p>
                                        {post.imageUrl && (
                                        <img
                                            src={`${process.env.REACT_APP_API_URL}/${post.imageUrl}`}
                                            alt={post.title}
                                            loading="lazy"
                                            className="image-post"
                                        />
                                        )}
                                        <div className="post-buttons">
                                        <Button
                                            className="button-post"
                                            variant="contained"
                                            sx={{ 
                                            gap: 0.5,
                                            width: "125px",
                                            backgroundColor: hasLiked ? 'darkblue' : 'default'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLike(post._id)
                                            }}
                                        >
                                            <ThumbsUp size={20} /> {post.likes.length}
                                        </Button>

                                        <Button
                                            className="button-post"
                                            variant="contained"
                                            sx={{ 
                                            gap: 0.5,
                                            width: "125px"
                                            }}
                                            onClick={(e) => {
                                            e.stopPropagation();
                                            handlePostClick(post._id)
                                            }}
                                        >
                                            <MessageCircle size={20} /> {post.comments.length}
                                        </Button>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                                <p>Pas de posts</p>
                        )}
                    </div>  
                </> 
            ) : (
                <p>Chargement du profil...</p>
            )}
        </div>

    );
}

export default Profile;