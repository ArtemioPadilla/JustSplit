'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import Button from '../../components/ui/Button';
import { Friendship } from '../../types';
import { sendFriendRequest, getUserFriendships, updateFriendshipStatus, removeFriendship } from '../../services/firebaseService';

export default function FriendsPage() {
  const { state } = useAppContext();
  const { isLoading: authLoading } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendshipsLoading, setFriendshipsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for direct friend request
  const [friendEmail, setFriendEmail] = useState('');
  const [requestStatus, setRequestStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | null;
  }>({ message: '', type: null });
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  
  // Load friendships when page loads or auth state changes
  useEffect(() => {
    const loadFriendships = async () => {
      if (!state?.currentUser?.id) {
        console.log("No current user for friendships, setting friendshipsLoading to false");
        setFriendshipsLoading(false);
        return;
      }
      
      console.log("Fetching friendships for user:", state.currentUser.id);
      setFriendshipsLoading(true);
      try {
        const userFriendships = await getUserFriendships(state.currentUser.id);
        console.log("Fetched friendships:", userFriendships);
        setFriendships(userFriendships);
      } catch (error) {
        console.error('Error loading friendships:', error);
        setError('Failed to load friends. Please try again later.');
      } finally {
        console.log("Friendships loading finished.");
        setFriendshipsLoading(false);
      }
    };
    
    if (!authLoading && state?.currentUser?.id) {
      loadFriendships();
    } else if (!authLoading && !state?.currentUser) {
      // Auth is done, but no user is logged in. No friendships to load.
      setFriendshipsLoading(false);
    }
    // If authLoading is true, this effect will re-run when authLoading changes.
  }, [state?.currentUser?.id, authLoading, state.currentUser]);
  
  // For debugging
  useEffect(() => {
    console.log("Current state:", {
      authLoading, // Added for debug
      friendshipsLoading, // Renamed
      error,
      friendshipsCount: friendships.length,
      currentUser: state?.currentUser?.id
    });
  }, [authLoading, friendshipsLoading, error, friendships, state?.currentUser]);
  
  // Add debugging and user authentication check
  useEffect(() => {
    // Debug current user status
    console.log("Current user auth status:", {
      stateExists: !!state,
      currentUserExists: !!state?.currentUser,
      userId: state?.currentUser?.id || 'none',
      userName: state?.currentUser?.name || 'none'
    });
  }, [state?.currentUser, state]);
  
  // Check if authentication is still in progress
  if (authLoading) {
    return <div className={styles.loadingState}>Authenticating...</div>;
  }
  
  // Check if app context state is available (should be if authLoading is false)
  if (!state) {
    return <div className={styles.loadingState}>Loading application data...</div>;
  }

  // If authentication is complete but no user is logged in
  if (!state.currentUser) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Friends</h1>
        <div style={{marginBottom: '10px', padding: '5px', fontSize: '12px', color: '#666', background: '#f5f5f5'}}>
          Logged in as: Not Logged In
        </div>
        <p>Please log in to manage your friends.</p>
        {/* Optionally, provide a login link/button here */}
      </div>
    );
  }
  
  // Get all users excluding the current user
  const allUsers = state?.users?.filter(user => user.id !== state.currentUser?.id) || [];
  
  // Filter users by search term
  const filteredUsers = searchTerm.trim() 
    ? allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : allUsers;
  
  // Helper function to get friendship status with a user
  const getFriendshipWith = (userId: string) => {
    return friendships.find(
      f => f.users.includes(userId) && f.users.includes(state?.currentUser?.id || '')
    );
  };
  
  // Handle send friend request
  const handleSendRequest = async (targetUserId: string) => {
    if (!state?.currentUser?.id) return;
    
    try {
      await sendFriendRequest(state.currentUser.id, targetUserId);
      // Refresh friendships
      const userFriendships = await getUserFriendships(state.currentUser.id);
      setFriendships(userFriendships);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };
  
  // Handle accepting friend request
  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await updateFriendshipStatus(friendshipId, 'accepted');
      // Refresh friendships
      const userFriendships = await getUserFriendships(state?.currentUser?.id || '');
      setFriendships(userFriendships);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };
  
  // Handle rejecting friend request
  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await updateFriendshipStatus(friendshipId, 'rejected');
      // Refresh friendships
      const userFriendships = await getUserFriendships(state?.currentUser?.id || '');
      setFriendships(userFriendships);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };
  
  // Handle removing friend
  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      await removeFriendship(friendshipId);
      // Refresh friendships
      const userFriendships = await getUserFriendships(state?.currentUser?.id || '');
      setFriendships(userFriendships);
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };
  
  // Handle direct friend request submission
  const handleAddFriend = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with email:", friendEmail);
    
    if (!friendEmail.trim()) {
      setRequestStatus({
        message: 'Please enter a valid email address',
        type: 'error'
      });
      return;
    }
    
    // Check if we have a current user with an ID
    // More detailed error to help diagnose the problem
    if (!state?.currentUser) {
      setRequestStatus({
        message: 'User session not found. Please try logging in again.',
        type: 'error'
      });
      return;
    }
    
    if (!state.currentUser.id) {
      setRequestStatus({
        message: 'User ID not available. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }
    
    setIsProcessingRequest(true);
    setRequestStatus({ message: 'Looking for user...', type: 'info' });
    
    try {
      // Find user by email
      const userToAdd = state.users.find(
        user => user.email?.toLowerCase() === friendEmail.toLowerCase() && 
                user.id !== state.currentUser?.id
      );
      
      if (!userToAdd) {
        setRequestStatus({
          message: 'No user found with this email address',
          type: 'error'
        });
        setIsProcessingRequest(false);
        return;
      }
      
      // Check if already friends or request is pending
      const existingFriendship = getFriendshipWith(userToAdd.id);
      
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          setRequestStatus({
            message: `You're already friends with ${userToAdd.name}`,
            type: 'info'
          });
        } else if (existingFriendship.status === 'pending') {
          if (existingFriendship.requestedBy === state.currentUser.id) {
            setRequestStatus({
              message: `You already sent a friend request to ${userToAdd.name}`,
              type: 'info'
            });
          } else {
            setRequestStatus({
              message: `${userToAdd.name} already sent you a friend request`,
              type: 'info'
            });
          }
        }
      } else {
        // If no friendship exists, send a request
        await sendFriendRequest(state.currentUser.id, userToAdd.id);
        
        // Refresh friendships list
        const userFriendships = await getUserFriendships(state.currentUser.id);
        setFriendships(userFriendships);
        
        setRequestStatus({
          message: `Friend request sent to ${userToAdd.name}!`,
          type: 'success'
        });
        
        // Clear the input field
        setFriendEmail('');
      }
    } catch (error) {
      console.error('Error processing friend request:', error);
      setRequestStatus({
        message: 'An error occurred while processing your request',
        type: 'error'
      });
    } finally {
      setIsProcessingRequest(false);
    }
  };
  
  // Group users by friendship status
  const friends = filteredUsers.filter(user => {
    const friendship = getFriendshipWith(user.id);
    return friendship && friendship.status === 'accepted';
  });
  
  const pendingRequests = filteredUsers.filter(user => {
    const friendship = getFriendshipWith(user.id);
    return friendship && friendship.status === 'pending' && friendship.requestedBy !== state?.currentUser?.id;
  });
  
  const sentRequests = filteredUsers.filter(user => {
    const friendship = getFriendshipWith(user.id);
    return friendship && friendship.status === 'pending' && friendship.requestedBy === state?.currentUser?.id;
  });
  
  const nonFriends = filteredUsers.filter(user => !getFriendshipWith(user.id));
  
  // Add a helper function to render user avatar with improved styling
  const renderUserAvatar = (user: { id: string; name: string; email?: string; avatarUrl?: string }) => {
    if (user?.avatarUrl) {
      return (
        <div className={styles.userAvatar}>
          <Image 
            src={user.avatarUrl}
            alt={`${user.name}&apos;s avatar`}
            className={styles.avatarImage}
            width={40}
            height={40}
          />
        </div>
      );
    }
    
    return (
      <div className={styles.userAvatar}>
        <span className={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</span>
      </div>
    );
  };

  // Add a helper function to render user card with improved styling
  const renderUserCard = (user: { id: string; name: string; email?: string; avatarUrl?: string }, actions: React.ReactNode, extraContent?: React.ReactNode) => {
    return (
      <div key={user.id} className={styles.userCard}>
        <Link 
          href={`/friends/${user.id}`}
          className={styles.userLink}
        >
          {renderUserAvatar(user)}
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>{user.name}</h3>
            <p className={styles.userEmail}>{user.email || 'No email provided'}</p>
            {extraContent}
          </div>
        </Link>
        
        <div className={styles.actions}>
          {actions}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Friends</h1>
      
      {/* Hide debug info in production */}
      {process.env.NODE_ENV !== 'production' && (
        <div className={styles.debugInfo}>
          Logged in as: {state.currentUser.name || 'Unknown'}
        </div>
      )}
      
      {/* Add Friend By Email Form - updated styling */}
      <div className={styles.addFriendCard}>
        <h2 className={styles.sectionTitle}>Add New Friend</h2>
        <form onSubmit={handleAddFriend} className={styles.addFriendForm}>
          <div className={styles.formRow}>
            <input
              type="email"
              placeholder="Enter friend's email address"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              className={styles.emailInput}
              disabled={isProcessingRequest}
              required
            />
            <Button 
              type="submit"
              variant="primary"
              disabled={isProcessingRequest || !friendEmail.trim()}
            >
              {isProcessingRequest ? 'Sending...' : 'Add Friend'}
            </Button>
          </div>
          
          {requestStatus.message && (
            <div className={`${styles.statusMessage} ${requestStatus.type ? styles[requestStatus.type] : ''}`}>
              {requestStatus.message}
            </div>
          )}
        </form>
      </div>
      
      {/* Improved search container */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search friends..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      
      {friendshipsLoading ? (
        <div className={styles.loadingState}>
          <p>Loading friends...</p>
          {!state.currentUser && <p>No user is currently logged in. Please log in to see your friends.</p>}
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary">Retry</Button>
        </div>
      ) : (
        <div className={styles.friendsContent}>
          {pendingRequests.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Friend Requests</h2>
              <div className={styles.usersList}>
                {pendingRequests.map(user => {
                  const friendship = getFriendshipWith(user.id);
                  
                  return renderUserCard(
                    user,
                    <>
                      <Button 
                        onClick={() => friendship && handleAcceptRequest(friendship.id)} 
                        variant="primary"
                      >
                        Accept
                      </Button>
                      <Button 
                        onClick={() => friendship && handleRejectRequest(friendship.id)} 
                        variant="secondary"
                      >
                        Decline
                      </Button>
                    </>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Friends ({friends.length})</h2>
            <div className={styles.usersList}>
              {friends.length === 0 ? (
                <p className={styles.emptyState}>You don&apos;t have any friends yet.</p>
              ) : (
                friends.map(user => {
                  const friendship = getFriendshipWith(user.id);
                  
                  return renderUserCard(
                    user,
                    <Button 
                      onClick={() => friendship && handleRemoveFriend(friendship.id)} 
                      variant="secondary"
                    >
                      Remove
                    </Button>
                  );
                })
              )}
            </div>
          </div>
          
          {sentRequests.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Sent Requests</h2>
              <div className={styles.usersList}>
                {sentRequests.map(user => {
                  const friendship = getFriendshipWith(user.id);
                  
                  return renderUserCard(
                    user,
                    <Button 
                      onClick={() => friendship && handleRemoveFriend(friendship.id)} 
                      variant="secondary"
                    >
                      Cancel
                    </Button>,
                    <span className={styles.pendingBadge}>Pending</span>
                  );
                })}
              </div>
            </div>
          )}
          
          {nonFriends.length > 0 && searchTerm && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Add Friends</h2>
              <div className={styles.usersList}>
                {nonFriends.map(user => (
                  renderUserCard(
                    user,
                    <Button 
                      onClick={() => handleSendRequest(user.id)} 
                      variant="primary"
                    >
                      Add Friend
                    </Button>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
