import React, { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";

const PresenceContext = createContext({});
export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider = ({ children }) => {
    const socket = useSocket();
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        if (!socket) return;

        const handleOnline = ({ userId }) => {
            setOnlineUsers(prev => new Set(prev).add(userId));
        };

        const handleOffline = ({ userId }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        };

        socket.on("friend-online", handleOnline);
        socket.on("friend-offline", handleOffline);

        return () => {
            socket.off("friend-online", handleOnline);
            socket.off("friend-offline", handleOffline);
        };
    }, [socket]);

    const isOnline = (userId) => onlineUsers.has(userId);

    return (
        <PresenceContext.Provider value={{ isOnline }}>
            {children}
        </PresenceContext.Provider>
    );
};
