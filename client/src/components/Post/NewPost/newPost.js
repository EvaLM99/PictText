import React, { useState, useRef, useContext } from 'react';
import { Image } from 'lucide-react';
import { Button, TextField} from '@mui/material';
import { AuthContext } from '../../../context/AuthContext';
import './newPost.css';

function NewPost({ onPostCreated }) {
    const [fileName, setFileName] = useState("Aucune photo sélectionnée");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const { accessToken } = useContext(AuthContext);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setImageFile(e.target.files[0]);
            setFileName(e.target.files[0].name);
            
        } else {
            setImageFile(null);
            setFileName("Aucune photo sélectionnée");
        }
    };

    const handleLabelKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
        document.getElementById("picture-post").click();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);
            if (imageFile) formData.append("image", imageFile);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/posts`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                console.log("✅ Post ajouté avec succès !", data);
                if (onPostCreated) onPostCreated(data);
                // reset form
                setTitle("");
                setContent("");
                setImageFile(null);
                setFileName("Aucune photo sélectionnée");
            } else {
                console.error("Erreur serveur :", data);
            }
            } catch (error) {
            console.error("Erreur réseau :", error);
            }
        };


    return (
        <form id="newPostForm" onSubmit={handleSubmit} className="post-container">
            <TextField
                id="title"
                label="Titre"
                variant="standard"
                multiline
                sx={{width: '500px'}}
                onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
                id="content"
                label="Ajouter un texte ..."
                variant="standard"
                multiline
                sx={{width: '500px'}}
                onChange={(e) => setContent(e.target.value)}
            />
            <input
                type="file"
                id="picture-post"
                className="input-picture-post"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
                style={{ display: 'none' }} 
            />
            <label
                htmlFor="picture-post"
                className="input-picture-post-trigger"
                tabIndex="0"
                onKeyDown={handleLabelKeyDown}
            >
                <Image /> Photo
            </label>
            <p className="file-return" aria-live="polite" aria-atomic="true">
                {fileName}
            </p>
            <Button
                className="button-post"
                variant="contained"
                type="submit"
                disabled = {!title}
            >
                Publier
            </Button>
        </form>
    );
}

export default NewPost;
