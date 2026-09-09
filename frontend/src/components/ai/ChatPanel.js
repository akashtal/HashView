/**
 * AI Chat Panel
 *
 * A slide-up bottom sheet that provides a conversational chat interface
 * after a search. Users can ask follow-up questions about businesses,
 * menus, prices, reviews, or request new searches.
 *
 * Features:
 *  - Word-by-word streaming (like ChatGPT)
 *  - Inline business result cards when a new search is triggered
 *  - Suggested follow-up chips for quick interaction
 *  - Keyboard-aware layout
 *  - Typing indicator while AI generates
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  closeChat,
  addUserMessage,
  startStreaming,
  appendToken,
  finishStreaming,
  addSearchingIndicator,
  addInlineBusinessResults,
  setChatError,
  setSessionId,
  clearChat,
  updateRankedList,
  selectChatIsStreaming,
  selectChatMessages,
  selectChatFollowUps,
  selectChatSessionId,
} from '../../store/slices/aiChatSlice';

import AIChatService from '../../services/aiChat.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.82;
const ACCENT = '#5e399e';

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();

    bounce(dot1, 0);
    bounce(dot2, 150);
    bounce(dot3, 300);
  }, []);

  const dotStyle = (anim) => ({
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginHorizontal: 2,
    transform: [{ translateY: anim }],
  });

  return (
    <View style={styles.aiMsgRow}>
      <View style={styles.aiAvatar}>
        <Icon name="sparkles" size={13} color="#fff" />
      </View>
      <View style={[styles.aiBubble, { paddingVertical: 12, paddingHorizontal: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View style={dotStyle(dot1)} />
          <Animated.View style={dotStyle(dot2)} />
          <Animated.View style={dotStyle(dot3)} />
        </View>
      </View>
    </View>
  );
};

// ─── Inline Business Card (shown when AI finds new businesses) ────────────────

const InlineBusinessCard = React.memo(({ biz, onPress }) => {
  const rating = biz.rating?.average?.toFixed(1) || '?';
  const dist = biz.distanceKm
    ? biz.distanceKm < 1
      ? `${Math.round(biz.distanceKm * 1000)}m`
      : `${biz.distanceKm}km`
    : null;
  const imgUri = biz.coverImage?.url || biz.images?.[0]?.url || biz.logo?.url || null;

  return (
    <TouchableOpacity style={styles.inlineBizCard} onPress={onPress} activeOpacity={0.9}>
      {/* Position badge (v2) — enables user to say "ask about #1" */}
      {biz.position && (
        <View style={styles.positionBadge}>
          <Text style={styles.positionBadgeText}>#{biz.position}</Text>
        </View>
      )}
      {imgUri ? (
        <Image source={{ uri: imgUri }} style={styles.inlineBizImage} contentFit="cover" />
      ) : (
        <View style={[styles.inlineBizImage, styles.inlineBizImageFallback]}>
          <Icon name="business" size={18} color={ACCENT} />
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.inlineBizName} numberOfLines={1}>
          {biz.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Icon name="star" size={11} color="#F59E0B" />
          <Text style={styles.inlineBizMeta}>{rating}</Text>
          {dist && (
            <>
              <Text style={styles.inlineBizMeta}>·</Text>
              <Text style={styles.inlineBizMeta}>{dist}</Text>
            </>
          )}
          <Text style={[styles.inlineBizMeta, { color: ACCENT }]}>{biz.category}</Text>
        </View>
        {biz.matchingMenuItems?.length > 0 && (
          <Text style={styles.inlineBizMenuItem} numberOfLines={1}>
            {biz.matchingMenuItems
              .map((m) => `${m.name}${m.price ? ` £${m.price.toFixed(2)}` : ''}`)
              .join(' · ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble = React.memo(({ msg, onBusinessPress, onFollowUp }) => {
  const isUser = msg.role === 'user';

  if (msg.isBizResults) {
    return (
      <View style={styles.bizResultsBlock}>
        <Text style={styles.bizResultsTitle}>{msg.content}</Text>
        {(msg.businesses || []).map((biz) => (
          <InlineBusinessCard key={biz._id} biz={biz} onPress={() => onBusinessPress?.(biz._id)} />
        ))}
      </View>
    );
  }

  if (msg.isSearching) {
    return (
      <View style={styles.aiMsgRow}>
        <View style={styles.aiAvatar}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
        <View style={[styles.aiBubble, { paddingVertical: 10, paddingHorizontal: 14 }]}>
          <Text style={styles.aiBubbleText}>{msg.content}</Text>
        </View>
      </View>
    );
  }

  if (isUser) {
    return (
      <View style={styles.userMsgRow}>
        <LinearGradient
          colors={['#7C5CC4', ACCENT]}
          style={styles.userBubble}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.userBubbleText}>{msg.content}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.aiMsgRow}>
        <View style={styles.aiAvatar}>
          <Icon name="sparkles" size={13} color="#fff" />
        </View>
        <View style={styles.aiBubble}>
          <Text style={[styles.aiBubbleText, msg.isError && { color: '#EF4444' }]}>
            {msg.content}
            {msg.isStreaming && <Text style={{ color: ACCENT }}> ▋</Text>}
          </Text>
        </View>
      </View>
      {/* Follow-up chips — only on last assistant message */}
      {msg.suggestedFollowUps?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginLeft: 42, marginTop: 6, marginBottom: 4 }}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {msg.suggestedFollowUps.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => onFollowUp?.(s)} style={styles.followUpChip}>
              <Text style={styles.followUpChipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

// ─── Main ChatPanel ───────────────────────────────────────────────────────────

export default function ChatPanel({
  visible,
  onClose,
  onBusinessPress,

  // Context passed from the search screen
  searchSessionId,
  searchBusinessIds,
  rankedBusinessList,   // v2: Full ranked list with positions
  searchQuery,
  searchIntent,

  latitude,
  longitude,
}) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null); // Holds the stream abort function

  const messages = useSelector(selectChatMessages);
  const isStreaming = useSelector(selectChatIsStreaming);
  const followUps = useSelector(selectChatFollowUps);
  const sessionId = useSelector(selectChatSessionId);

  const [inputText, setInputText] = useState('');

  // ─── Slide animation ────────────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : PANEL_HEIGHT,
      damping: 20,
      stiffness: 200,
      useNativeDriver: true,
    }).start();

    if (!visible && abortRef.current) {
      abortRef.current(); // Cancel any running stream when panel closes
      abortRef.current = null;
    }
  }, [visible]);

  // ─── Initialize session from search context ─────────────────────────────────
  useEffect(() => {
    if (visible && searchSessionId) {
      dispatch(setSessionId(searchSessionId));
    }
  }, [visible, searchSessionId]);

  // ─── Auto-scroll to bottom on new messages ──────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  }, [messages.length, isStreaming]);

  // ─── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || inputText).trim();
      if (!trimmed || isStreaming) return;

      setInputText('');
      Keyboard.dismiss();

      dispatch(addUserMessage({ content: trimmed }));
      dispatch(startStreaming());

      const abort = await AIChatService.streamChat({
        message: trimmed,
        sessionId: sessionId || searchSessionId,
        latitude,
        longitude,
        searchBusinessIds: sessionId ? undefined : searchBusinessIds,
        // Always pass rankedBusinessList if session doesn't yet have one.
        // sessionId existing doesn't mean the session already has rankedBusinessList —
        // the greeting message creates the session, but rankedBusinessList must also
        // be sent on that first user message to ensure the context is populated.
        rankedBusinessList: rankedBusinessList?.length > 0 ? rankedBusinessList : undefined,
        searchQuery: sessionId ? undefined : searchQuery,
        searchIntent: sessionId ? undefined : searchIntent,

        onToken: (token) => {
          dispatch(appendToken(token));
        },

        onSearching: (query) => {
          dispatch(addSearchingIndicator(query));
        },

        onBusinessResults: ({ businesses, totalCount, query: q }) => {
          dispatch(addInlineBusinessResults({ businesses, totalCount, query: q }));
          // Update rankedList in store if new results arrive
          if (businesses?.length > 0) {
            dispatch(updateRankedList(businesses));
          }
        },

        onDone: ({ fullText, sessionId: newSessionId, suggestedFollowUps }) => {
          dispatch(finishStreaming({ fullText, sessionId: newSessionId, suggestedFollowUps }));
          if (newSessionId && !sessionId) dispatch(setSessionId(newSessionId));
        },

        onError: (errMsg) => {
          dispatch(setChatError(errMsg));
        },
      });

      abortRef.current = abort;
    },
    [
      inputText,
      isStreaming,
      sessionId,
      searchSessionId,
      searchBusinessIds,
      searchQuery,
      searchIntent,
      latitude,
      longitude,
      dispatch,
    ]
  );

  const handleFollowUp = useCallback((text) => sendMessage(text), [sendMessage]);

  // ─── Initial greeting when panel first opens with search context ─────────────
  useEffect(() => {
    if (visible && messages.length === 0 && searchBusinessIds?.length > 0) {
      // Auto-send a greeting to establish context
      // IMPORTANT: rankedBusinessList MUST be included here — this is the first
      // message that creates the session. If omitted, the session has no
      // position/name data and ordinal questions ("tell me about the 2nd one") fail.
      setTimeout(() => {
        dispatch(startStreaming());
        AIChatService.streamChat({
          message: `I just searched for "${searchQuery || 'businesses'}" and got ${searchBusinessIds.length} results. Briefly greet me and mention you can answer questions about these results.`,
          sessionId: searchSessionId,
          latitude,
          longitude,
          searchBusinessIds,
          rankedBusinessList,   // ← CRITICAL: must be here to populate session.rankedBusinessList
          searchQuery,
          searchIntent,
          onToken: (tok) => dispatch(appendToken(tok)),
          onSearching: (q) => dispatch(addSearchingIndicator(q)),
          onBusinessResults: (d) => dispatch(addInlineBusinessResults(d)),
          onDone: (d) => {
            dispatch(finishStreaming(d));
            if (d.sessionId) dispatch(setSessionId(d.sessionId));
          },
          onError: (e) => dispatch(setChatError(e)),
        }).then((abort) => {
          abortRef.current = abort;
        });
      }, 400);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: slideAnim.interpolate({
                inputRange: [0, PANEL_HEIGHT],
                outputRange: [1, 0],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom },
        ]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.handle} />
          <View style={styles.headerContent}>
            <LinearGradient
              colors={[ACCENT, '#7C5CC4']}
              style={styles.headerIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="sparkles" size={16} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Ask AI</Text>
              <Text style={styles.headerSub}>
                {searchQuery ? `About: "${searchQuery}"` : 'Ask anything about businesses'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                dispatch(clearChat());
              }}
              style={styles.headerBtn}
            >
              <Icon name="refresh-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Icon name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Messages ── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (SCREEN_HEIGHT - PANEL_HEIGHT) : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MessageBubble
                msg={item}
                onBusinessPress={onBusinessPress}
                onFollowUp={handleFollowUp}
              />
            )}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<EmptyState />}
            ListFooterComponent={isStreaming && messages.length === 0 ? <TypingIndicator /> : null}
          />

          {/* ── Input Bar ── */}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Ask about menus, prices, reviews..."
              placeholderTextColor="#C4B5FD"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              multiline
              maxLength={500}
              editable={!isStreaming}
              selectionColor={ACCENT}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isStreaming) && styles.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isStreaming}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconWrap}>
      <Icon name="sparkles" size={28} color={ACCENT} />
    </View>
    <Text style={styles.emptyTitle}>Ask me anything!</Text>
    <Text style={styles.emptySubtitle}>
      Questions about menu items, prices,{'\n'}reviews, dietary options, or directions
    </Text>
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 16,
        gap: 8,
      }}
    >
      {[
        '🍗 What dishes do they have?',
        '💷 What are the prices?',
        '⭐ What do reviews say?',
        '🥗 Any vegan options?',
      ].map((s, i) => (
        <View key={i} style={styles.exampleChip}>
          <Text style={styles.exampleChipText}>{s}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },

  // User bubble
  userMsgRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubbleText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  // AI bubble
  aiMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
    marginTop: 2,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  aiBubbleText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1F2937',
  },

  // Follow-up chips
  followUpChip: {
    backgroundColor: '#EDE9FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  followUpChipText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
  },

  // Inline business results
  bizResultsBlock: {
    marginBottom: 12,
    marginLeft: 40,
  },
  bizResultsTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlineBizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inlineBizImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    flexShrink: 0,
  },
  inlineBizImageFallback: {
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineBizName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  inlineBizMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inlineBizMenuItem: {
    fontSize: 11,
    color: ACCENT,
    marginTop: 3,
    fontWeight: '600',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  exampleChip: {
    backgroundColor: '#F3F0FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exampleChipText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '500',
  },

  // v2: Position badge on inline business cards
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  positionBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '800',
  },
});
