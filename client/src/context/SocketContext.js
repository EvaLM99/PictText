import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { userId, isLoggedIn } = useContext(AuthContext);
  const socketRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    // ✅ Ne connecter que si l'utilisateur est connecté
    if (!isLoggedIn || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // ✅ Éviter les reconnexions multiples
    if (socketRef.current?.connected) {
      console.log("✅ Socket déjà connectée");
      return;
    }

    const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
    const s = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });
    
    s.on("connect", () => {
      console.log("✅ Socket connectée:", s.id);
      console.log("👤 Joining user room:", userId);
      s.emit("join_user", userId);
      
      // ✅ Heartbeat pour rester actif
      heartbeatIntervalRef.current = setInterval(() => {
        s.emit("heartbeat");
      }, 30000);
    });
    
    s.on("connect_error", (error) => {
      console.error("❌ Erreur connexion socket:", error);
    });

    s.on("disconnect", (reason) => {
      console.log("🔌 Socket déconnectée:", reason);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    });

    socketRef.current = s;
    setSocket(s);

    // ✅ Déconnexion propre à la fermeture
    const handleBeforeUnload = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      console.log("🔌 Nettoyage socket");
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, isLoggedIn]); // ✅ Seulement quand userId ou isLoggedIn changent

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};