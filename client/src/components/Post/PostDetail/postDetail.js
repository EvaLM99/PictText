import { useNavigate, useParams } from "react-router-dom";
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext.js';
import { Button, TextField } from '@mui/material';
import { ThumbsUp, MessageCircle, Pencil, X, Check, Delete, ArrowLeftSquare } from 'lucide-react';
import { useFetchWithAuth } from "../../../utils/fetchWithAuth.js";

import axios from 'axios';
import "./postDetail.css";

function PostDetail() {
    const { id } = useParams();
    const [post, setPost] = useState(null);
    const navigate = useNavigate();
    const { accessToken: token, refreshAccessToken, userId } = useContext(AuthContext);
    const [text, setText] = useState("");
    const [editingCommentId, setEditingCommentId] = useState("");
    const [isEditingComment, setIsEditingComment] = useState(false);
    const [editingText, setEditingText] = useState("")
    const fetchWithAuth = useFetchWithAuth();

    const handleIsEditComment = (commentId=null, commentText="") => {
        if(commentId) {
            setEditingCommentId(commentId);
            setIsEditingComment(true);
            setEditingText(commentText);
        } else {
            setEditingCommentId("");
            setIsEditingComment(false);
            setEditingText("");
        }
    };

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await fetchWithAuth("GET", `/api/posts/${id}`);
                setPost(res.data);
            } catch (err) {
                console.error("Erreur récupération post :", err);
            }
        };
        fetchPost();
    }, [id, token]);

    const handleLike = async () => {
        if (!post) return;
        try {
            const res = await fetchWithAuth("PATCH", `/api/posts/${post._id}/like`, null, true);
            setPost(res.data);
        } catch (err) {
            console.error("Erreur like :", err);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        try {
            const res = await fetchWithAuth(
                "POST",
                `/api/posts/${post._id}/comment`,
                { text }
            );
            setPost(res.data);
            setText("");
        } catch (err) {
            console.error("Erreur ajout commentaire :", err);
        }
    };


    const handleEditComment = async () => {
        try {
            const res = await fetchWithAuth("PATCH", `/api/posts/${post._id}/comments/${editingCommentId}`, {text: editingText});
            setPost(res.data);
            handleIsEditComment();
        } catch (err) {
            console.error("Erreur modification commentaire :", err);
        }
    }
    const handleDeleteComment = async(commentId) => {
        try {
            const res = await fetchWithAuth("DELETE", `/api/posts/${post._id}/comments/${commentId}`, {}, true);
            setPost(res.data);
        } catch (err) {
            console.error("Erreur suppression commentaire :", err);
        }
    }

    const handleDeletePost = async() => {
        try {
            const res = await fetchWithAuth("DELETE", `/api/posts/${post._id}`, {}, true);
            setPost(null);
            navigate('/news-feed');
        } catch (err) {
            console.error("Erreur suppression post :", err);
        }
    }

    const handleBack = () => {
        if (document.referrer.includes(window.location.origin)) {
            navigate(-1);
        } else {
            navigate('/news-feed');
        }
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

    if (!post) return <p>Chargement du post...</p>;

    const hasLiked = post.likes.some(like => like.author.toString() === userId);

    return (
        <div className="post-detail-view">
            <button className="post-detail-view-back" onClick={handleBack}><ArrowLeftSquare />Retour</button>
            <div className="post">
                <p className="post-time">{timeAgo(post.createdAt)}</p>
                {post.author._id === userId && (
                    <>
                        <button className="post-delete-button" onClick={handleDeletePost}><X color='red' size={20} /></button>
                    </>
                )}
                <h2 
                    className="post-author view-profile-cursor"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${post.author._id}`)
                    }}
                >
                    {post.author?.firstName} {post.author?.lastName}
                </h2>
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
                        onClick={handleLike}
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
                    >
                        <MessageCircle size={20} /> {post.comments.length}
                    </Button>
                    <div className="comments">
                        {post.comments.map((comment) => (
                            <div className="comment" key={comment._id}>
                                <div className="comment-infos">
                                    <p className="comment-author">{comment.author?.firstName} {comment.author?.lastName}</p>
                                    {editingCommentId === comment._id && isEditingComment ? (
                                        <TextField
                                            variant="standard"
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            multiline
                                            sx={{
                                                width:'478.04px',
                                            }}
                                        />
                                    ) : (
                                        <p className="comment-text">{comment.text}</p>
                                    )}
                                </div>
                                {comment.author._id === userId ? (
                                    <div className="comment-author-buttons">
                                        {editingCommentId === comment._id && isEditingComment ? (
                                            <>
                                                <button className="comment-validate-edit-button" onClick={handleEditComment}><Check color='green' size={20} /></button>
                                                <button className="comment-edit-back-button" onClick={() => handleIsEditComment()}><Delete color='red' size={20} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="comment-edit-button" onClick={() => handleIsEditComment(comment._id, comment.text)}><Pencil color='grey' size={20} /></button>
                                                <button className="comment-delete-button" onClick={() => handleDeleteComment(comment._id)}><X color='red' size={20} /></button>
                                            </>
                                        )
                                        }
                                        
                                    </div>
                                    ) : post.author._id === userId && (
                                    <div className="comment-author-button">
                                        <button className="comment-delete-button" onClick={() => handleDeleteComment(comment._id)}><X color='red' size={20} /></button>
                                    </div>) 
                                } 

                            </div>
                        ))}
                        <form className="comment-form" onSubmit={handleComment}>
                            <TextField
                                id="text"
                                label="Ajouter un commentaire ..."
                                variant="standard"
                                multiline
                                value={text}
                                sx={{
                                    width:'478.04px',
                                }}
                                onChange={(e) => setText(e.target.value)}
                            />
                            <Button
                                className="button-comment"
                                variant="contained"
                                type="submit"
                                disabled = {!text}
                            >
                                Publier
                            </Button>
                        </form>
                    </div>
        
                </div>
            </div>
        </div>
    );
}

export default PostDetail;
