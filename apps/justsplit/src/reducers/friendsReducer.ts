// src/reducers/friendsReducer.ts
import { AppState } from '../context/AppContext';

// Define the friends reducer functions
const friendsReducer = {
  // Function to handle sending a friend request
  sendFriendRequest: (state: AppState, payload: { from: string; to: string }): AppState => {
    const { from, to } = payload;
    
    // Update sender's friendRequestsSent
    const updatedUsers = state.users.map(user => {
      if (user.id === from) {
        const friendRequestsSent = [...(user.friendRequestsSent || [])];
        if (!friendRequestsSent.includes(to)) {
          friendRequestsSent.push(to);
        }
        return { ...user, friendRequestsSent };
      }
      
      // Update recipient's friendRequestsReceived
      if (user.id === to) {
        const friendRequestsReceived = [...(user.friendRequestsReceived || [])];
        if (!friendRequestsReceived.includes(from)) {
          friendRequestsReceived.push(from);
        }
        return { ...user, friendRequestsReceived };
      }
      
      return user;
    });
    
    // Update currentUser if it's the sender
    let currentUser = state.currentUser;
    if (currentUser && currentUser.id === from) {
      const friendRequestsSent = [...(currentUser.friendRequestsSent || [])];
      if (!friendRequestsSent.includes(to)) {
        friendRequestsSent.push(to);
      }
      currentUser = { ...currentUser, friendRequestsSent };
    }
    
    return { ...state, users: updatedUsers, currentUser };
  },
  
  // Function to handle accepting a friend request
  acceptFriendRequest: (state: AppState, payload: { from: string; to: string }): AppState => {
    const { from, to } = payload;
    
    // Update both users' friends lists and remove request status
    const updatedUsers = state.users.map(user => {
      if (user.id === to) {
        // Recipient accepting the request
        const friends = [...(user.friends || [])];
        const friendRequestsReceived = (user.friendRequestsReceived || []).filter(id => id !== from);
        
        if (!friends.includes(from)) {
          friends.push(from);
        }
        
        return { ...user, friends, friendRequestsReceived };
      }
      
      if (user.id === from) {
        // Sender having request accepted
        const friends = [...(user.friends || [])];
        const friendRequestsSent = (user.friendRequestsSent || []).filter(id => id !== to);
        
        if (!friends.includes(to)) {
          friends.push(to);
        }
        
        return { ...user, friends, friendRequestsSent };
      }
      
      return user;
    });
    
    // Update currentUser if involved
    let currentUser = state.currentUser;
    if (currentUser) {
      if (currentUser.id === to) {
        const friends = [...(currentUser.friends || [])];
        const friendRequestsReceived = (currentUser.friendRequestsReceived || []).filter(id => id !== from);
        
        if (!friends.includes(from)) {
          friends.push(from);
        }
        
        currentUser = { ...currentUser, friends, friendRequestsReceived };
      } else if (currentUser.id === from) {
        const friends = [...(currentUser.friends || [])];
        const friendRequestsSent = (currentUser.friendRequestsSent || []).filter(id => id !== to);
        
        if (!friends.includes(to)) {
          friends.push(to);
        }
        
        currentUser = { ...currentUser, friends, friendRequestsSent };
      }
    }
    
    return { ...state, users: updatedUsers, currentUser };
  },
  
  // Function to handle rejecting a friend request
  rejectFriendRequest: (state: AppState, payload: { from: string; to: string }): AppState => {
    const { from, to } = payload;
    
    // Remove request status from both users
    const updatedUsers = state.users.map(user => {
      if (user.id === to) {
        // Recipient rejecting the request
        const friendRequestsReceived = (user.friendRequestsReceived || []).filter(id => id !== from);
        return { ...user, friendRequestsReceived };
      }
      
      if (user.id === from) {
        // Sender having request rejected
        const friendRequestsSent = (user.friendRequestsSent || []).filter(id => id !== to);
        return { ...user, friendRequestsSent };
      }
      
      return user;
    });
    
    // Update currentUser if involved
    let currentUser = state.currentUser;
    if (currentUser) {
      if (currentUser.id === to) {
        const friendRequestsReceived = (currentUser.friendRequestsReceived || []).filter(id => id !== from);
        currentUser = { ...currentUser, friendRequestsReceived };
      } else if (currentUser.id === from) {
        const friendRequestsSent = (currentUser.friendRequestsSent || []).filter(id => id !== to);
        currentUser = { ...currentUser, friendRequestsSent };
      }
    }
    
    return { ...state, users: updatedUsers, currentUser };
  },
  
  // Function to handle removing a friend
  removeFriend: (state: AppState, payload: { userId: string; friendId: string }): AppState => {
    const { userId, friendId } = payload;
    
    // Remove each other from friends lists
    const updatedUsers = state.users.map(user => {
      if (user.id === userId) {
        const friends = (user.friends || []).filter(id => id !== friendId);
        return { ...user, friends };
      }
      
      if (user.id === friendId) {
        const friends = (user.friends || []).filter(id => id !== userId);
        return { ...user, friends };
      }
      
      return user;
    });
    
    // Update currentUser if it's the user removing the friend
    let currentUser = state.currentUser;
    if (currentUser && currentUser.id === userId) {
      const friends = (currentUser.friends || []).filter(id => id !== friendId);
      currentUser = { ...currentUser, friends };
    }
    
    return { ...state, users: updatedUsers, currentUser };
  }
};

export default friendsReducer;