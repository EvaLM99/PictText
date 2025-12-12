import './App.css';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header/header';
import SignUp from './components/Signup/signup';
import NewsFeed from './components/NewsFeed/newsFeed';
import NewPost from './components/Post/NewPost/newPost';
import Login from './components/Login/login';
import PostDetail from './components/Post/PostDetail/postDetail';
import Contact from './components/Contacts/contacts';
import EditProfile from './components/Profile/EditProfile/editProfile';
import Profile from './components/Profile/Profile/profile';
import Home from './components/Home/home';
import ConversationList from './components/Conversations/ConversationsList/conversationList';
import ConversationDetail from './components/Conversations/ConversationDetail/conversationDetail';



function App() {
  
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/contacts" element={<Contact />} />
        <Route path="/new-post" element={<NewPost />} />
        <Route path="/news-feed" element={<NewsFeed />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/conversations" element={<ConversationList />} />
        <Route path="/conversations/:id" element={<ConversationDetail />} />
      </Routes>
    </div>
  );
}

export default App;
