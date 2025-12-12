import { useNavigate } from "react-router-dom";
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Button} from '@mui/material';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import axios from 'axios';
import NewPost from "../Post/NewPost/newPost.js";
import "./newsFeed.css";
import { useFetchWithAuth } from "../../utils/fetchWithAuth.js";
import { usePosts } from '../../hooks/usePosts';
import { useInView } from 'react-intersection-observer';
import { queryClient } from '../../utils/queryClient';


function NewsFeed() {
    const { userId } = useContext(AuthContext);
    const fetchWithAuth = useFetchWithAuth();
    const { ref: loadMoreRef, inView } = useInView();
    const navigate = useNavigate();

    const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      error
    } = usePosts();

  // Charger automatiquement quand on atteint le bas
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
  

    


  const handleLike = async (postId) => {
    // Optimistic update avec React Query
    queryClient.setQueryData(['posts', 'friends'], (old) => {
      if (!old) return old;
      
      return {
        ...old,
        pages: old.pages.map(page => 
          page.map(post => {
            if (post._id !== postId) return post;
            
            const hasLiked = post.likes.some(l => l.author._id === userId);
            return {
              ...post,
              likes: hasLiked
                ? post.likes.filter(l => l.author._id !== userId)
                : [...post.likes, { author: { _id: userId } }]
            };
          })
        )
      };
    });

    try {
      await fetchWithAuth("PATCH", `/api/posts/${postId}/like`, null, true);
    } catch (err) {
      // Rollback en cas d'erreur
      queryClient.invalidateQueries(['posts', 'friends']);
    }
  };

  

  const allPosts = data?.pages.flatMap(page => page) || [];
  
  useEffect(() => {
    if (allPosts.length > 0) {
      const pos = sessionStorage.getItem("scrollPos");
      if (pos) {
        window.scrollTo({ top: parseInt(pos), behavior: 'auto' });
        sessionStorage.removeItem("scrollPos");
      }
    }
  }, [allPosts]);

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

  if (isLoading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error.message}</p>;


  return (
    <div className="news-feed">
      <h2>Fil d’actualités</h2>
      <NewPost onPostCreated={() => queryClient.invalidateQueries(['posts', 'friends'])} />
      <div className="posts">
        {allPosts.length > 0 ? (
          <>
            {allPosts.map((post) => {
              const hasLiked = post.likes.some(like => like.author.toString() === userId);
              return (
              <div key={post._id} className="post" onClick={() => handlePostClick(post._id)}>
                <p className="post-time">{timeAgo(post.createdAt)}</p>
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
            );
            })}
            <div ref={loadMoreRef} style={{ height: '20px' }}>
              {isFetchingNextPage && <p>Chargement...</p>}
            </div>
            {!hasNextPage && <p>Plus de posts disponibles</p>}
          </>
        ) : (
          <p>Aucun post disponible.</p>
        )}
      </div>
    </div>
  );

}

export default NewsFeed;