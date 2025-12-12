import { useNavigate } from "react-router-dom";
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext.js';
import { Button, TextField, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Badge } from "@mui/material";
import { useFetchWithAuth } from "../../utils/fetchWithAuth.js";
import OnlineBadge from "../onlineBadge.js";
import "./contacts.css";
import { Check, X } from "lucide-react";
import { usePresence } from "../../context/PresenceContext.js";


function Contact() {
  const [queryResearch, setQueryResearch]=useState("");
  const [users, setUsers]=useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState(null);
  const fetchWithAuth = useFetchWithAuth();
  const { isLoggedIn, userId } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [friends, setFriends] = useState([]);
  const [userSentInvitations, setUserSentInvitations] = useState([]);
  const [userReceivedInvitations, setUserReceivedInvitations] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [actionLoading, setActionLoading] = useState(false);
  const [choiceFriendsMenu, setChoiceFriendsMenu] = useState("friends");
  const navigate = useNavigate();
  const {isOnline} = usePresence();

  
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchFriendData();
  }, [isLoggedIn, userId]);

  const fetchFriendData = async () => {
    if (!isLoggedIn) return;
    try {
        const res = await fetchWithAuth("GET", `/api/users/${userId}/friends`);
        setUserData(res.data);
        setFriends(res.data.friends);
        setUserSentInvitations(res.data.sentInvitations);
        setUserReceivedInvitations(res.data.receivedInvitations);
    } catch (err) {
        console.error("Erreur récupération friends:", err);
    }
  };

  const fetchUsers = async (query) => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const res = await fetchWithAuth("GET", `/api/users/search?query=${encodeURIComponent(query)}`);
      // depending on your fetchWithAuth response shape you might need res.data
      setUsers(res.data ?? res);
    } catch (err) {
      console.error("Erreur récupération des utilisateurs :", err);
      setErrorUsers("Impossible de récupérer les utilisateurs");
    } finally {
      setLoadingUsers(false);
    }
  };
    
    const handleResearch = async (e) => {
        e.preventDefault();
        if (!queryResearch.trim()) return;
        fetchUsers(queryResearch);
    };

    const handleOpenModal = (user) => {
        setSelectedUser(user);
        setOpen(true);
    };

    const handleCloseModal = () => {
        setOpen(false);
        setSelectedUser(null);
    };

    // Perform friend-related action depending on actionType
    // actionType: "invite" | "cancel" | "accept" | "decline" | "remove"
    const handleFriendAction = async (actionType) => {
        if (!selectedUser) return;
        setActionLoading(true);

        try {
            const targetId = selectedUser._id;
            if (actionType === "invite") {
                await fetchWithAuth("POST", `/api/users/friends/${targetId}/invite`);
            } else if (actionType === "cancel") {
                await fetchWithAuth("POST", `/api/users/friends/${targetId}/cancel`);
            } else if (actionType === "accept") {
                await fetchWithAuth("POST", `/api/users/friends/${targetId}/accept`);
            } else if (actionType === "decline") {
                await fetchWithAuth("POST", `/api/users/friends/${targetId}/decline`);
            } else if (actionType === "remove") {
                await fetchWithAuth("DELETE", `/api/users/friends/${targetId}`);
            } else {
                throw new Error("Action inconnue");
            }

            handleCloseModal();
            await fetchFriendData();

            // Après action : rafraîchir la liste. Tu peux aussi mettre à jour users localement.
            if (queryResearch.trim()) {
                await fetchUsers(queryResearch);
            } 

            
        } catch (err) {
            console.error("Erreur action friend :", err);
        // tu peux afficher une notification ici
        } finally {
            setActionLoading(false);
        }
    };

    // helper to update status locally as a fallback when not refetching from server
    function computeStatusAfterAction(currentStatus, actionType) {
        // best-effort small state machine
        if (actionType === "invite") return "invitation_sent";
        if (actionType === "cancel") return "not_friends";
        if (actionType === "accept") return "friends";
        if (actionType === "decline") return "not_friends";
        if (actionType === "remove") return "not_friends";
        return currentStatus;
    }

  
    return (
        <div className="contacts-container">
            <div className="search-new-contacts">
                <form onSubmit={handleResearch}>
                    <TextField
                        id="search"
                        label="Rechercher..."
                        variant="standard"
                        value={queryResearch}
                        onChange={(e) => setQueryResearch(e.target.value)}
                    />
                    <Button
                        className="button-comment"
                        variant="contained"
                        type="submit"
                        disabled = {!queryResearch}
                        sx = {{backgroundColor: "var(--primaryColor)"}}
                    >
                        Rechercher
                    </Button>
                </form>
                <div className="users">
                {users && users.map((user) => (
                    <div className="user" key={user._id}>
                        <Avatar alt={`${user.firstName} ${user.lastName}`} src={`${process.env.REACT_APP_API_URL}${user.profilePicture}`} sx={{marginRight: '5px'}}/>
                        <p onClick={() => navigate(`/profile/${user._id}`)} className="view-profile-cursor">{user.firstName} {user.lastName}</p>
                        <button onClick={() => handleOpenModal(user)}>
                            {user.friendStatus === "not_friends" && "Ajouter comme ami(e)"}
                            {user.friendStatus === "invitation_sent" && "Invitation envoyée"}
                            {user.friendStatus === "invitation_received" && "Accepter l’invitation"}
                            {user.friendStatus === "friends" && "Amis"}
                        </button>
                    </div>

                ))
                }
                </div>
                <Dialog open={open} onClose={handleCloseModal}>
                <DialogTitle>
                  {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "Utilisateur"}
                </DialogTitle>

                <DialogContent>
                  {!selectedUser && <div>Chargement...</div>}

                  {selectedUser && (
                    <>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                        <Avatar src={`${process.env.REACT_APP_API_URL}${selectedUser.profilePicture}`} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{selectedUser.firstName} {selectedUser.lastName}</div>
                          <div style={{ color: "#666", fontSize: 13 }}>
                            Statut : {selectedUser.friendStatus}
                          </div>
                        </div>
                      </div>

                      {/* Content text depending on status */}
                      {selectedUser.friendStatus === "not_friends" && (
                        <div>Souhaitez-vous envoyer une invitation à {selectedUser.firstName} ?</div>
                      )}

                      {selectedUser.friendStatus === "invitation_sent" && (
                        <div>Vous avez déjà envoyé une invitation. Voulez-vous l'annuler ?</div>
                      )}

                      {selectedUser.friendStatus === "invitation_received" && (
                        <div>{selectedUser.firstName} vous a envoyé une invitation. Accepter ou refuser ?</div>
                      )}

                      {selectedUser.friendStatus === "friends" && (
                        <div>Voulez-vous supprimer {selectedUser.firstName} de vos amis ?</div>
                      )}
                    </>
                  )}
                </DialogContent>

                <DialogActions>
                  <Button onClick={handleCloseModal} disabled={actionLoading}>Annuler</Button>

                  {selectedUser && selectedUser.friendStatus === "not_friends" && (
                    <Button onClick={() => handleFriendAction("invite")} disabled={actionLoading} variant="contained">
                      {actionLoading ? <CircularProgress size={18} /> : "Envoyer l'invitation"}
                    </Button>
                  )}

                  {selectedUser && selectedUser.friendStatus === "invitation_sent" && (
                    <Button onClick={() => handleFriendAction("cancel")} disabled={actionLoading} color="error" variant="contained">
                      {actionLoading ? <CircularProgress size={18} /> : "Annuler l'invitation"}
                    </Button>
                  )}

                  {selectedUser && selectedUser.friendStatus === "invitation_received" && (
                    <>
                      <Button onClick={() => handleFriendAction("decline")} disabled={actionLoading} color="error">
                        {actionLoading ? <CircularProgress size={18} /> : "Refuser"}
                      </Button>
                      <Button onClick={() => handleFriendAction("accept")} disabled={actionLoading} variant="contained">
                        {actionLoading ? <CircularProgress size={18} /> : "Accepter"}
                      </Button>
                    </>
                  )}

                  {selectedUser && selectedUser.friendStatus === "friends" && (
                    <Button onClick={() => handleFriendAction("remove")} disabled={actionLoading} color="error" variant="contained">
                      {actionLoading ? <CircularProgress size={18} /> : "Supprimer des amis"}
                    </Button>
                  )}
                </DialogActions>
              </Dialog>
            </div>
            <div className="friends">
              <div className="friends-menu">
                <div className="menu-item">
                  <Badge color="secondary" badgeContent={friends.length}>
                      <button
                          className={choiceFriendsMenu === "friends" ? "active" : ""}
                          onClick={() => setChoiceFriendsMenu("friends")}
                      >
                          Mes amis
                      </button>
                  </Badge>
              </div>

              <div className="menu-item">
                  <Badge color="secondary" badgeContent={userSentInvitations.length}>
                      <button
                          className={choiceFriendsMenu === "sentInvit" ? "active" : ""}
                          onClick={() => setChoiceFriendsMenu("sentInvit")}
                      >
                          Invitations envoyées
                      </button>
                  </Badge>
              </div>

              <div className="menu-item">
                  <Badge color="secondary" badgeContent={userReceivedInvitations.length}>
                      <button
                          className={choiceFriendsMenu === "receivedInvit" ? "active" : ""}
                          onClick={() => setChoiceFriendsMenu("receivedInvit")}
                      >
                          Invitations reçues
                      </button>
                  </Badge>
              </div>

            </div>
            <div className="users">
              {choiceFriendsMenu === "sentInvit" ? (
                <>
                  {userSentInvitations.map((sentInv) => (
                    <div className="user" key={sentInv._id}>
                      <div className="user-left">
                        <Avatar alt={`${sentInv.user.firstName} ${sentInv.user.lastName}`} src={`${process.env.REACT_APP_API_URL}${sentInv.user.profilePicture}`} sx={{marginRight: '5px'}}/>
                        <p onClick={() => navigate(`/profile/${sentInv.user._id}`)} className="view-profile-cursor">{sentInv.user.firstName} {sentInv.user.lastName}</p>
                      </div>
                      <div className="user-buttons">
                        <button
                          onClick={() =>
                            handleOpenModal({
                                _id: sentInv.user._id,
                                firstName: sentInv.user.firstName,
                                lastName: sentInv.user.lastName,
                                profilePicture: sentInv.user.profilePicture,
                                friendStatus: "invitation_sent"
                            })
                          }
                        >
                          <X color='red'/>
                        </button>
                      </div> 
                    </div>
                ))}
              </>
              ) :
              choiceFriendsMenu === "receivedInvit" ? (
                <>
                  {userReceivedInvitations.map((receivedInv) => (
                    <div className="user" key={receivedInv._id}>
                      <div className="user-left">
                        <Avatar alt={`${receivedInv.user.firstName} ${receivedInv.user.lastName}`} src={`${process.env.REACT_APP_API_URL}${receivedInv.user.profilePicture}`} sx={{marginRight: '5px'}}/>
                        <p onClick={() => navigate(`/profile/${receivedInv.user._id}`)} className="view-profile-cursor">{receivedInv.user.firstName} {receivedInv.user.lastName}</p>
                      </div>
                      <div className="user-buttons">
                        <button
                          onClick={() =>
                            handleOpenModal({
                                _id: receivedInv.user._id,
                                firstName: receivedInv.user.firstName,
                                lastName: receivedInv.user.lastName,
                                profilePicture: receivedInv.user.profilePicture,
                                friendStatus: "invitation_received"
                            })
                          }
                        >
                          <Check color='green'/>
                        </button>
                        <button
                          onClick={() =>
                            handleOpenModal({
                                _id: receivedInv.user._id,
                                firstName: receivedInv.user.firstName,
                                lastName: receivedInv.user.lastName,
                                profilePicture: receivedInv.user.profilePicture,
                                friendStatus: "invitation_received"
                            })
                          }
                        >
                          <X color='red'/>
                        </button>
                      </div>
                    </div>
                ))}
              </>
              ) : (
                <>
                  {friends.map((friend) => (
                    <div className="user" key={friend._id}>
                      <div className="user-left">
                        <OnlineBadge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          invisible={!isOnline(friend.user._id)}
                          badgeSize={12}
                        >
                          <Avatar alt={`${friend.user.firstName} ${friend.user.lastName}`} src={`${process.env.REACT_APP_API_URL}${friend.user.profilePicture}`} sx={{marginRight: '5px'}}/>
                        </OnlineBadge>
                        <p onClick={() => navigate(`/profile/${friend.user._id}`)} className="view-profile-cursor">{friend.user.firstName} {friend.user.lastName}</p>
                      </div>
                      <div className="user-buttons">
                        <button
                          onClick={() =>
                            handleOpenModal({
                                _id: friend.user._id,
                                firstName: friend.user.firstName,
                                lastName: friend.user.lastName,
                                profilePicture: friend.user.profilePicture,
                                friendStatus: "friends"
                            })
                          }
                        >
                          <X color='red'/>
                        </button>
                      </div> 
                    </div>
                ))}
              </>
              )
              }
            </div>
          </div>
      </div>
    ); 

}

export default Contact;