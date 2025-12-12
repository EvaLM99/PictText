import React, { useState, useEffect, useContext } from 'react';
import { Button, TextField, FormControlLabel, RadioGroup, FormLabel, FormControl, Radio} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'react-phone-input-2/lib/material.css';
import PhoneInput from 'react-phone-input-2';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import "./signup.css";
import { AuthContext } from '../../context/AuthContext';

function SignUp() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [gender, setGender] = useState("male");
    const [birthday, setBirthday] = useState(dayjs());
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [emailExists, setEmailExists] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    // ✅ Toggle affichage mot de passe
    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    // ✅ Vérifie la validité du mot de passe
    const validatePassword = (pwd) => {
        const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[.!@#$%^&*()_+]).{8,}$/;
        return regex.test(pwd);
    };

    // ✅ Vérifie si l'e-mail existe déjà en temps réel
    useEffect(() => {
        if (!email) {
        setEmailExists(false);
        setEmailError("");
        return;
        }

        const checkEmail = async () => {
        try {
            const response = await fetch(
            `${process.env.REACT_APP_API_URL}/api/users/check-email?email=${encodeURIComponent(email)}`
            );
            const data = await response.json();
            setEmailExists(data.exists);
            setEmailError(data.exists ? "L'adresse mail existe déjà" : "");
        } catch (err) {
            console.error("Erreur vérification e-mail :", err);
        }
        };

        const delayDebounceFn = setTimeout(() => {
        checkEmail();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [email]);

    // ✅ Soumission du formulaire d'inscription
    const handleSubmit = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setEmailError("");

        if (emailExists) {
        setEmailError("L'adresse mail existe déjà");
        return;
        }

        if (!validatePassword(password)) {
        setPasswordError(
            "Le mot de passe doit contenir au moins 8 caractères, une majuscule et un caractère spécial"
        );
        return;
        }

        if (password !== confirmPassword) {
        setPasswordError("Les mots de passe ne correspondent pas");
        return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                firstName,
                lastName,
                email,
                password,
                gender,
                birthday,
                phone,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Utilisateur créé !');
                login(data.access, data.refresh);
                navigate('/news-feed');

            } else {
                setEmailError(data.message || "Erreur lors de l'inscription");
            }
        } catch (error) {
            console.error("Erreur réseau :", error);
            setEmailError("Une erreur est survenue. Veuillez réessayer.");
        }
    };

  return (
    <div className="signup-wrapper">
        <h1>Inscription</h1>
        <form id="signupForm" onSubmit={handleSubmit}>
            <TextField
                id="firstName"
                label="Prénom"
                variant="standard"
                onChange={(e) => setFirstName(e.target.value)}
            />
            <TextField
                id="lastName"
                label="Nom de famille"
                variant="standard"
                onChange={(e) => setLastName(e.target.value)}
            />
    
            <FormControl className="gender">
                <FormLabel id="radio-button-gender">Genre</FormLabel>
                <RadioGroup
                    row
                    aria-labelledby="radio-button-gender"
                    name="radio-button-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                >
                    <FormControlLabel value="male" control={<Radio />} label="Homme" />
                    <FormControlLabel value="female" control={<Radio />} label="Femme" />
                </RadioGroup>
            </FormControl>


            <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                label="Date de naissance"
                value={birthday}
                onChange={(newValue) => setBirthday(newValue)}
            />
            </LocalizationProvider>
            
            <TextField
                id="email"
                label="E-mail"
                variant="standard"
                fullWidth
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(emailError)}
                helperText={emailError}
            />

            <PhoneInput
                value={phone}
                onChange={(value) => setPhone(value)}
                inputStyle={{ width: '100%'}}
                style={{ marginTop: '20px' }}
            />

            <TextField
                id="password"
                label="Mot de passe"
                variant="standard"
                fullWidth
                type={showPassword ? 'text' : 'password'}
                onChange={(e) => setPassword(e.target.value)}
                error={Boolean(passwordError && !validatePassword(password))}
                helperText={passwordError && !validatePassword(password) ? passwordError : ''}
                InputProps={{
                    endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                        onClick={handleTogglePassword}
                        edge="end"
                        aria-label="toggle password visibility"
                        >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                    ),
                }}
            />
            <TextField
                id="confirm-password"
                label="Confirmer le mot de passe"
                variant="standard"
                fullWidth
                type="password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={password !== confirmPassword}
                helperText={password !== confirmPassword ? "Les mots de passe ne correspondent pas" : ''}
            />

            <div style={{ marginTop: 20, marginBottom: 20 }}>
                <Button
                    className="signup"
                    variant="contained"
                    type="submit"
                    disabled={!firstName || !lastName || !gender || !birthday || !email || !password || !confirmPassword || emailExists}
                >
                    S'inscrire
                </Button>
            </div>
        </form>
    </div>
  );
}

export default SignUp;
