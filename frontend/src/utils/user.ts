import { store } from '../state/store.js';

export async function fetchProfileData() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const res = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const user = data.user;
            let avatarSrc = store.getState().userAvatar;

            if (user.avatar && user.avatar.data_base64) {
                avatarSrc = `data:${user.avatar.content_type || 'image/jpeg'};base64,${user.avatar.data_base64}`;
            } else if (user.avatar_url) {
                avatarSrc = user.avatar_url;
            }

            // Frontend-only solution: Fetch all users to derive friends list
            // because /api/profile does not return friendships in the backend current state.
            let friendsList = [];
            try {
                const usersRes = await fetch('/api/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (usersRes.ok) {
                    const allUsers = await usersRes.json();
                    friendsList = allUsers
                        .filter((u: any) => u.friendship_status === 'accepted')
                        .map((u: any) => ({
                            id: u.id,
                            username: u.username,
                            avatar: u.avatar && u.avatar.data_base64
                                ? `data:${u.avatar.content_type || 'image/jpeg'};base64,${u.avatar.data_base64}`
                                : (u.avatar_url || '/default-avatar.png'),
                            online: u.is_online,
                            friendship_id: u.friendship_id
                        }));
                }
            } catch (e) {
                console.error('Failed to fetch users for friends list:', e);
            }

            store.setState({
                isLoggedIn: true,
                currentUser: user.username,
                userEmail: user.email || localStorage.getItem('user_email') || 'Email non disponibile',
                currentUserId: user.id,
                userAvatar: avatarSrc,
                friends: friendsList,
                gameHistory: data.matches ? data.matches.map((m: any) => ({
                    id: m.id,
                    opponent: m.opponent_alias || 'Unknown',
                    score: `${m.user_score}-${m.opponent_score}`,
                    result: m.user_score > m.opponent_score ? 'Vittoria' : 'Sconfitta',
                    date: new Date(m.played_at).toLocaleDateString()
                })) : []
            });

            return data;
        }
    } catch (err) {
        console.error('Failed to fetch profile:', err);
    }
}
