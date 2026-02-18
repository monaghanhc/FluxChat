import { useEffect, useMemo, useRef, useState } from 'react';
import type { MessageDto, RoomSummary } from '@chat/shared';
import { AuthForm } from './components/AuthForm';
import { ChatHeader } from './components/ChatHeader';
import { MessageInput } from './components/MessageInput';
import { MessageList } from './components/MessageList';
import { ProfileEditor } from './components/ProfileEditor';
import { RoomList } from './components/RoomList';
import { api, isApiClientError, type ApiUser } from './lib/api';
import { clearStoredToken, getStoredToken, setStoredToken } from './lib/env';
import { createSocket, type FluxSocket } from './lib/socket';

type AuthMode = 'login' | 'signup';

const mergeMessages = (current: MessageDto[], incoming: MessageDto[]): MessageDto[] => {
  const byId = new Map<string, MessageDto>();
  [...current, ...incoming].forEach((message) => {
    byId.set(message.id, message);
  });

  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

const nextUnread = (room: RoomSummary, roomId: string): RoomSummary => {
  if (room.id !== roomId) {
    return room;
  }

  return {
    ...room,
    unreadCount: room.unreadCount + 1,
  };
};

export const App = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<ApiUser | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, MessageDto[]>>({});
  const [hasMoreByRoom, setHasMoreByRoom] = useState<Record<string, boolean>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const [presenceByRoom, setPresenceByRoom] = useState<
    Record<string, Array<{ id: string; displayName: string; avatarUrl?: string }>>
  >({});
  const [typingByRoom, setTypingByRoom] = useState<Record<string, string[]>>({});
  const [appError, setAppError] = useState<string | undefined>(undefined);

  const socketRef = useRef<FluxSocket | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const joinedRoomIdsRef = useRef<string[]>([]);
  const roomsRef = useRef<RoomSummary[]>([]);

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) ?? null, [rooms, activeRoomId]);
  const activeMessages = activeRoomId ? messagesByRoom[activeRoomId] ?? [] : [];
  const activePresence = activeRoomId ? presenceByRoom[activeRoomId] ?? [] : [];
  const activeTyping = activeRoomId ? typingByRoom[activeRoomId] ?? [] : [];

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    joinedRoomIdsRef.current = rooms.filter((room) => room.joined).map((room) => room.id);
    roomsRef.current = rooms;
  }, [rooms]);

  const loadRooms = async (currentToken: string) => {
    const response = await api.listRooms(currentToken);
    setRooms(response.rooms);

    if (!activeRoomRef.current) {
      const preferred = response.rooms.find((room) => room.joined) ?? response.rooms[0] ?? null;
      if (preferred) {
        setActiveRoomId(preferred.id);
      }
    }
  };

  const loadCurrentUser = async (currentToken: string) => {
    const response = await api.me(currentToken);
    setUser(response.user);
  };

  const bootstrap = async (currentToken: string) => {
    try {
      await Promise.all([loadCurrentUser(currentToken), loadRooms(currentToken)]);
      setAppError(undefined);
    } catch (error) {
      clearStoredToken();
      setToken(null);
      setUser(null);
      setRooms([]);
      setActiveRoomId(null);

      if (isApiClientError(error)) {
        setAppError(error.message);
      } else {
        setAppError('Session expired. Please sign in again.');
      }
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    void bootstrap(token);
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      joinedRoomIdsRef.current.forEach((roomId) => {
        socket.emit('room:join', { roomId });
      });
    });

    socket.on('room:presence', ({ roomId, usersOnline }) => {
      setPresenceByRoom((prev) => ({
        ...prev,
        [roomId]: usersOnline,
      }));
    });

    socket.on('typing:update', ({ roomId, usersTyping }) => {
      setTypingByRoom((prev) => ({
        ...prev,
        [roomId]: usersTyping,
      }));
    });

    socket.on('message:new', ({ roomId, message }) => {
      setMessagesByRoom((prev) => ({
        ...prev,
        [roomId]: mergeMessages(prev[roomId] ?? [], [message]),
      }));

      if (activeRoomRef.current === roomId) {
        setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)));
        if (token) {
          void api.markRead(token, roomId);
        }
      } else {
        setRooms((prev) => prev.map((room) => nextUnread(room, roomId)));

        if (
          typeof Notification !== 'undefined' &&
          document.hidden &&
          Notification.permission === 'granted' &&
          message.userId !== user.id
        ) {
          new Notification(`#${roomsRef.current.find((room) => room.id === roomId)?.name ?? 'room'}`, {
            body: `${message.userDisplayName}: ${message.text}`,
          });
        }
      }
    });

    socket.on('message:ack', ({ tempId, message, error }) => {
      if (error) {
        setAppError(error);
        return;
      }

      if (!tempId || !message) {
        return;
      }

      setMessagesByRoom((prev) => {
        const roomMessages = prev[message.roomId] ?? [];
        return {
          ...prev,
          [message.roomId]: mergeMessages(
            roomMessages.filter((item) => item.id !== tempId),
            [message],
          ),
        };
      });
    });

    socket.on('room:error', ({ message }) => {
      setAppError(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  useEffect(() => {
    if (!token || !activeRoomId) {
      return;
    }

    const hydrateMessages = async () => {
      const response = await api.listMessages(token, activeRoomId, undefined, 20);
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoomId]: mergeMessages([], response.messages),
      }));
      setHasMoreByRoom((prev) => ({
        ...prev,
        [activeRoomId]: response.hasMore,
      }));

      await api.markRead(token, activeRoomId);
      setRooms((prev) =>
        prev.map((room) => (room.id === activeRoomId ? { ...room, unreadCount: 0 } : room)),
      );

      socketRef.current?.emit('room:join', { roomId: activeRoomId });
    };

    void hydrateMessages().catch((error) => {
      if (isApiClientError(error)) {
        setAppError(error.message);
      }
    });
  }, [token, activeRoomId]);

  const handleAuthSubmit = async (payload: {
    email: string;
    password: string;
    displayName?: string;
  }) => {
    setAuthLoading(true);
    setAuthError(undefined);

    try {
      const response =
        authMode === 'signup'
          ? await api.signup({
              email: payload.email,
              password: payload.password,
              displayName: payload.displayName ?? '',
            })
          : await api.login({ email: payload.email, password: payload.password });

      setStoredToken(response.token);
      setToken(response.token);
      setUser(response.user);
      setAppError(undefined);

      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    } catch (error) {
      if (isApiClientError(error)) {
        setAuthError(error.message);
      } else {
        setAuthError('Authentication failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const ensureRoomJoined = async (roomId: string): Promise<void> => {
    if (!token) {
      return;
    }

    const targetRoom = roomsRef.current.find((room) => room.id === roomId);
    if (targetRoom?.joined) {
      return;
    }

    await api.joinRoom(token, roomId);
    setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, joined: true } : room)));
  };

  const handleRoomSelect = (roomId: string) => {
    const select = async () => {
      await ensureRoomJoined(roomId);
      setActiveRoomId(roomId);
      socketRef.current?.emit('room:join', { roomId });
    };

    void select().catch((error) => {
      if (isApiClientError(error)) {
        setAppError(error.message);
      }
    });
  };

  const handleCreateRoom = async (roomName: string) => {
    if (!token) {
      return;
    }

    const created = await api.createRoom(token, roomName);
    setRooms((prev) => [
      ...prev,
      {
        id: created.room.id,
        name: created.room.name,
        isPublic: created.room.isPublic,
        joined: false,
        unreadCount: 0,
      },
    ]);

    await ensureRoomJoined(created.room.id);
    setActiveRoomId(created.room.id);
    socketRef.current?.emit('room:join', { roomId: created.room.id });
  };

  const handleLoadOlder = async () => {
    if (!token || !activeRoomId) {
      return;
    }

    const existing = messagesByRoom[activeRoomId] ?? [];
    const before = existing[0]?.createdAt;
    if (!before) {
      return;
    }

    setLoadingMore((prev) => ({ ...prev, [activeRoomId]: true }));
    try {
      const response = await api.listMessages(token, activeRoomId, before, 20);
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoomId]: mergeMessages(response.messages, prev[activeRoomId] ?? []),
      }));
      setHasMoreByRoom((prev) => ({ ...prev, [activeRoomId]: response.hasMore }));
    } finally {
      setLoadingMore((prev) => ({ ...prev, [activeRoomId]: false }));
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeRoomId || !user) {
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    const optimistic: MessageDto = {
      id: tempId,
      roomId: activeRoomId,
      userId: user.id,
      userDisplayName: user.displayName,
      userAvatarUrl: user.avatarUrl,
      text,
      createdAt: new Date().toISOString(),
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoomId]: mergeMessages(prev[activeRoomId] ?? [], [optimistic]),
    }));

    socketRef.current?.emit('message:send', {
      roomId: activeRoomId,
      text,
      tempId,
    });
  };

  const handleTypingStart = () => {
    if (!activeRoomId) {
      return;
    }
    socketRef.current?.emit('typing:start', { roomId: activeRoomId });
  };

  const handleTypingStop = () => {
    if (!activeRoomId) {
      return;
    }
    socketRef.current?.emit('typing:stop', { roomId: activeRoomId });
  };

  const handleProfileUpdate = async (payload: { displayName?: string; avatarBase64?: string }) => {
    if (!token) {
      return;
    }

    const response = await api.updateProfile(token, payload);
    setUser(response.user);
  };

  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setRooms([]);
    setMessagesByRoom({});
    setActiveRoomId(null);
    setPresenceByRoom({});
    socketRef.current?.disconnect();
  };

  if (!token || !user) {
    return (
      <AuthForm
        mode={authMode}
        loading={authLoading}
        error={authError}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <h1>FluxChat</h1>
        <div>
          <span>{user.displayName}</span>
          <button onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        <RoomList
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelect={handleRoomSelect}
          onCreate={handleCreateRoom}
        />

        <section className="chat-panel">
          {activeRoom ? (
            <>
              <ChatHeader roomName={activeRoom.name} usersOnline={activePresence} />

              <MessageList
                messages={activeMessages}
                currentUserId={user.id}
                hasMore={hasMoreByRoom[activeRoom.id] ?? false}
                loadingMore={loadingMore[activeRoom.id] ?? false}
                onLoadMore={handleLoadOlder}
              />

              {activeTyping.length > 0 ? (
                <p className="typing-indicator" data-testid="typing-indicator">
                  {activeTyping.length} user(s) typing...
                </p>
              ) : null}

              <MessageInput
                disabled={!activeRoom.joined}
                onSend={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
              />
            </>
          ) : (
            <div className="empty-state">Create or join a room to start chatting.</div>
          )}

          {appError ? <p className="error app-error">{appError}</p> : null}
        </section>

        <aside className="profile-sidebar">
          <h3>Profile</h3>
          <ProfileEditor displayName={user.displayName} onSave={handleProfileUpdate} />
        </aside>
      </main>
    </div>
  );
};
