import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useContext, useCallback, useRef } from "react";

export const useFetchWithAuth = () => {
  const { accessToken: token, refreshAccessToken } = useContext(AuthContext);
  const isRefreshingRef = useRef(false);

  const fetchWithAuth = useCallback(async (method, endpoint, data = null, isForm = false) => {
    try {
      let url = endpoint;
      const headers = { Authorization: `Bearer ${token}` };
      if (!isForm) headers["Content-Type"] = "application/json";

      // ✅ Gérer les paramètres GET
      if (method.toUpperCase() === "GET" && data) {
        const params = new URLSearchParams(data).toString();
        url = `${endpoint}?${params}`;
        data = null;
      }

      // ✅ Ne pas envoyer de body vide pour DELETE
      if (method.toUpperCase() === "DELETE") {
        data = undefined;
      } else if (!data && ["POST", "PATCH", "PUT"].includes(method.toUpperCase())) {
        data = {};
      }

      return await api({ method, url, data, headers });
      
    } catch (err) {
      // ✅ Gérer le refresh token une seule fois
      if (err.response?.status === 401 && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        
        try {
          const newToken = await refreshAccessToken();
          if (!newToken) throw new Error("Unable to refresh token");

          const headers = { Authorization: `Bearer ${newToken}` };
          if (!isForm) headers["Content-Type"] = "application/json";

          let retryData = data;
          if (method.toUpperCase() === "DELETE") {
            retryData = undefined;
          } else if (!retryData && ["POST", "PATCH", "PUT"].includes(method.toUpperCase())) {
            retryData = {};
          }

          return await api({ method, url: endpoint, data: retryData, headers });
          
        } finally {
          isRefreshingRef.current = false;
        }
      } else {
        throw err;
      }
    }
  }, [token, refreshAccessToken]);

  return fetchWithAuth;
};