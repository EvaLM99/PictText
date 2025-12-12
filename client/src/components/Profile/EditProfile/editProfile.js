import React, { useEffect, useState, useContext, lazy, Suspense } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import "./editProfile.css";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { useFetchWithAuth } from "../../../utils/fetchWithAuth.js";
import { Button, TextField, FormControlLabel, RadioGroup, FormLabel, FormControl, Radio, Avatar} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'react-phone-input-2/lib/material.css';
import PhoneInput from 'react-phone-input-2';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const Cropper = lazy(() => import('react-easy-crop'));
const getCroppedImage = lazy(() => import('../../../utils/cropUtils').then(module => ({ default: module.getCroppedImage })));

function EditProfile() {
    const fetchWithAuth = useFetchWithAuth();
    const { isLoggedIn, accessToken: token, refreshAccessToken, userId } = useContext(AuthContext);
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newPhone, setNewPhone]=useState("");
    const [newFirstName, setNewFirstName] = useState("");
    const [newGender, setNewGender] = useState("");
    const [newBirthday, setNewBirthday] = useState(null);
    const [newLastName, setNewLastName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newProfilePhoto, setNewProfilePhoto] = useState(null);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [initialCrop, setInitialCrop] = useState({ x: 0, y: 0 });
    const [initialZoom, setInitialZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [originalPhoto, setOriginalPhoto] = useState(null);
    const [initialPhoto, setInitialPhoto] = useState(null);
    const [emailError, setEmailError] = useState('');
    const [emailExists, setEmailExists] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(false);
    const [showCropper, setShowCropper] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPlaceholder(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);


    // ----- Fonctions -----
   

    // ----- useEffect pour récupérer le profil -----
    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        fetchWithAuth("GET", `/api/users/${userId}`)
            .then(res => {
                setUserData(res.data);
                setNewFirstName(res.data.firstName);
                setNewLastName(res.data.lastName);
                setNewEmail(res.data.email);
                setNewPhone(res.data.phone);
                setNewGender(res.data.gender);
                setNewBirthday(res.data.birthday ? dayjs(res.data.birthday) : null);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Impossible de récupérer les données');
                setLoading(false);
            });
    }, [isLoggedIn, navigate, userId, fetchWithAuth]);

    // ----- Vérification email en temps réel -----
    useEffect(() => {
        if (!newEmail) {
            setEmailExists(false);
            return;
        }

        const checkEmail = async () => {
            try {
                const response = await fetch(
                `${process.env.REACT_APP_API_URL}/api/users/check-email?email=${encodeURIComponent(newEmail)}&userId=${userId}`
                );
                const data = await response.json();
                setEmailExists(data.exists);
                setEmailError(data.exists ? "L'adresse mail existe déjà" : '');
            } catch (err) {
                console.error("Erreur vérification e-mail :", err);
            }
        };

        const delay = setTimeout(checkEmail, 500);
        return () => clearTimeout(delay);
    }, [newEmail]);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError("");

        // Vérifier que les champs sont remplis
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("Tous les champs sont obligatoires.");
            return;
        }

        // Vérifier que le nouveau mot de passe est différent de l'ancien
        if (newPassword === currentPassword) {
            setPasswordError("Le nouveau mot de passe doit être différent de l’actuel.");
            return;
        }

        // Vérifier la complexité du mot de passe
        const strongRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!strongRegex.test(newPassword)) {
            setPasswordError("Le mot de passe doit contenir au moins 8 caractères, une majuscule et un caractère spécial.");
            return;
        }

        // Vérifier la confirmation
        if (newPassword !== confirmPassword) {
            setPasswordError("Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            await fetchWithAuth("POST", `/api/users/me/password/`, {
                current_password: currentPassword,
                new_password: newPassword,
            });

            alert("Mot de passe modifié avec succès !");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError("");
        } catch (err) {
            console.error(err);
            setPasswordError("Erreur lors de la modification du mot de passe.");
        }
    };


    const handleSave = async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData();
            formData.append("firstName", newFirstName || userData.firstName);
            formData.append("lastName", newLastName || userData.lastName);
            formData.append("gender", newGender || userData.gender);
            formData.append("birthday", newBirthday || userData.birthday);
            formData.append("phone", newPhone|| userData.phone);
            formData.append("email", newEmail || userData.email);
            if (newProfilePhoto) formData.append("profilePicture", newProfilePhoto);

            const res = await fetch(`${process.env.REACT_APP_API_URL}/api/users/me/profile`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: formData
            });

            setUserData(res.data);
            setEmailError(''); // réinitialise l'erreur
            alert("Profil mis à jour avec succès !");
            setShowCropper(false);
            setPreviewPhoto(null);
            setNewProfilePhoto(null);
        } catch (err) {
            // Si le backend renvoie une erreur sur l'email
            if (err.response?.data?.email) {
                setEmailError(err.response.data.email);
            } else {
                console.error(err);
                alert("Erreur lors de la mise à jour du profil");
            }
        }
    };

    const handleResetCrop = () => {
        setPreviewPhoto(originalPhoto);
        setCrop(initialCrop);
        setZoom(initialZoom);
        setCroppedAreaPixels(null);
    };

    const handleCancelPhoto = () => {
        if (previewPhoto && previewPhoto.startsWith('blob:')) {
            URL.revokeObjectURL(previewPhoto);
        }
        if (originalPhoto && originalPhoto.startsWith('blob:')) {
            URL.revokeObjectURL(originalPhoto);
        }
        
        setPreviewPhoto(null);
        setNewProfilePhoto(null);
        setOriginalPhoto(null);
        setShowCropper(false);
        setCrop(initialCrop);
        setZoom(initialZoom);
        setCroppedAreaPixels(null);
    };

    const onCropComplete = (croppedArea, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    };

    const handleCropSave = async () => {
        if (!previewPhoto || !croppedAreaPixels) return;
        
        try {
            // Import dynamique de la fonction
            const { getCroppedImage } = await import('../../../utils/cropUtils');
            
            const fileName = `${userData._id || 'user'}-avatar.jpg`;
            const croppedFile = await getCroppedImage({
                imageSrc: previewPhoto,
                pixelCrop: croppedAreaPixels,
                fileName,
                outputSize: 400,
                quality: 0.9,
            });

            setNewProfilePhoto(croppedFile);
            
            const newPreview = URL.createObjectURL(croppedFile);
            
            if (previewPhoto && previewPhoto !== originalPhoto && previewPhoto.startsWith('blob:')) {
                URL.revokeObjectURL(previewPhoto);
            }
            
            setPreviewPhoto(newPreview);
        } catch (err) {
            console.error('Erreur crop:', err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        setPreviewPhoto(objectUrl);
        setOriginalPhoto(objectUrl);
        setNewProfilePhoto(file);
        setShowCropper(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    useEffect(() => {
        if (userData?.profilePicture) {
            setInitialPhoto(`${process.env.REACT_APP_API_URL}${userData.profilePicture}`);
        }
    }, [userData]);

    useEffect(() => {
        return () => {
            if (previewPhoto && previewPhoto.startsWith('blob:')) {
                URL.revokeObjectURL(previewPhoto);
            }
            if (originalPhoto && originalPhoto.startsWith('blob:')) {
                URL.revokeObjectURL(originalPhoto);
            }
        };
    }, [previewPhoto, originalPhoto]);

    if (loading) {
        return <div className="profile-container"><p>Chargement...</p></div>;
    }

    if (error) {
        return <div className="profile-container"><p style={{ color: 'red' }}>{error}</p></div>;
    }

    // ----- Render -----
    return (
        <div className="profile-container">
            <h1>Mon profil</h1>
            <div className="update-profil-password">
                <form onSubmit={handleSave}>
                    <div className='update-profile-photo-infos'>
                        {/* Bloc Photo */}
                        <div className='update-profile-photo'>
                            <div className="profile-photo-container">
                                {previewPhoto && showCropper ? (
                                    <Suspense fallback={<div>Chargement du recadreur...</div>}>
                                        <Cropper
                                            image={previewPhoto}
                                            crop={crop}
                                            zoom={zoom}
                                            aspect={1}
                                            onCropChange={setCrop}
                                            onZoomChange={setZoom}
                                            onCropComplete={onCropComplete}
                                        />
                                    </Suspense>
                                ) : userData?.profilePicture ? (
                                    <img className='profile-photo-image' src={`${process.env.REACT_APP_API_URL}${userData.profilePicture}`} alt="Photo de profil" loading="lazy" />
                                ) : showPlaceholder ? (
                                <Avatar
                                    sx={{ width: 400, height: 400, fontSize: 120 }}
                                >
                                {userData.firstName[0].toUpperCase()}{userData.lastName[0].toUpperCase()}
                            </Avatar>
                                ) : (
                                    <p>Chargement de la photo...</p>
                                )}

                                {previewPhoto && showCropper && (
                                    <div className="cropper-buttons-container">
                                        <Button className="cropper-buttons" onClick={handleCropSave} variant="outlined">
                                            Appliquer le recadrage
                                        </Button>
                                        <Button className="cropper-buttons" onClick={handleResetCrop} variant="outlined">
                                            Reset recadrage
                                        </Button>
                                        <Button className="cropper-buttons" onClick={handleCancelPhoto} variant="outlined">
                                            Annuler changement
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <input type="file" id="avatar" accept="image/png, image/jpeg image/jpg" style={{ display: 'none' }} onChange={handleFileChange} />
                                <label htmlFor="avatar" className="custom-file-label">Choisir une photo</label>
                            </div>
                        </div>

                        {/* Bloc Informations */}
                        <div className="edit-informations">
                            <h2>Mes informations</h2>
                            <TextField className="change-info" label="Prénom" fullWidth margin="normal" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} />
                            <TextField className="change-info" label="Nom de famille" fullWidth margin="normal" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                            <FormControl className="gender">
                                <FormLabel id="radio-button-gender">Genre</FormLabel>
                                <RadioGroup
                                    row
                                    aria-labelledby="radio-button-gender"
                                    name="radio-button-gender"
                                    value={newGender}
                                    onChange={(e) => setNewGender(e.target.value)}
                                >
                                    <FormControlLabel value="male" control={<Radio />} label="Homme" />
                                    <FormControlLabel value="female" control={<Radio />} label="Femme" />
                                </RadioGroup>
                            </FormControl>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Date de naissance"
                                    value={newBirthday}
                                    onChange={(newValue) => setNewBirthday(newValue)}
                                />
                            </LocalizationProvider>
                            <TextField className="change-info" label="Email" fullWidth margin="normal" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} helperText={emailError} error={!!emailError} />
                            <PhoneInput
                                value={newPhone}
                                onChange={(value) => setNewPhone(value)}
                                inputStyle={{ width: '100%'}}
                                style={{ marginTop: '20px' }}
                            />
                            <Button className='update-profile-button' variant="contained" type="submit">Sauvegarder les changements</Button>
                        </div>

                    </div>
                </form>
        
                <form onSubmit={handleChangePassword}>
                    <h2>Changer mon mot de passe</h2>
                    <TextField
                        className="change-password"
                        label="Mot de passe actuel"
                        type={showPassword ? "text" : "password"}
                        fullWidth
                        margin="normal"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ), 
                        }}
                    />

                    <TextField
                        className="change-password"
                        label="Nouveau mot de passe"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <TextField
                        className="change-password"
                        label="Confirmer le nouveau mot de passe"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    {passwordError && <p style={{ color: "red", marginTop: "10px" }}>{passwordError}</p>}

                    <Button
                        className="update-password-button"
                        variant="contained"
                        type="submit"
                    >
                        Modifier le mot de passe
                    </Button>
                </form>
              
            </div>
        </div>
    );
}

export default EditProfile;
