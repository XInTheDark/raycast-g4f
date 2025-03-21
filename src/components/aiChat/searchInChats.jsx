import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";

export const SearchInChats = ({ chatData, setChatData, getChat }) => {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searchLimits] = useState({ numChats: 100, numResults: 50 });

  // Perform search when text changes
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchText.trim().length >= 2) {
        await performSearch(searchText);
      } else {
        setResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(delaySearch);
  }, [searchText]);

  const performSearch = async (query) => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const loadingToast = await showToast({ style: Toast.Style.Animated, title: "Searching chats..." });

    try {
      const searchResults = [];
      const queryLower = query.toLowerCase();
      const maxChats = Math.min(searchLimits.numChats, chatData.chats.length);

      // Search through chats
      for (let i = 0; i < maxChats; i++) {
        const chatMeta = chatData.chats[i];
        const chat = await getChat(chatMeta.id);

        // Search in chat name
        if (chat.name.toLowerCase().includes(queryLower)) {
          searchResults.push({
            chatId: chat.id,
            chatName: chat.name,
            messageIdx: null,
            matchType: "chat_name",
            preview: `Chat name: ${chat.name}`,
            date: new Date(chat.creationDate),
          });
        }

        // Search in messages (messages are in reverse order - newest first)
        for (let j = 0; j < chat.messages.length; j++) {
          const message = chat.messages[j];
          if (!message.visible) continue;

          const userContent = message.first?.content || "";
          const assistantContent = message.second?.content || "";

          // Search in user message
          if (userContent.toLowerCase().includes(queryLower)) {
            searchResults.push({
              chatId: chat.id,
              chatName: chat.name,
              messageIdx: j,
              matchType: "user_message",
              preview: getMatchPreview(userContent, queryLower),
              date: new Date(message.creationDate),
            });
          }

          // Search in assistant message
          if (assistantContent.toLowerCase().includes(queryLower)) {
            searchResults.push({
              chatId: chat.id,
              chatName: chat.name,
              messageIdx: j,
              matchType: "assistant_message",
              preview: getMatchPreview(assistantContent, queryLower),
              date: new Date(message.creationDate),
            });
          }
        }

        // Stop searching if we've reached the results limit
        if (searchResults.length >= searchLimits.numResults) break;
      }

      // Sort results by date (newest first)
      searchResults.sort((a, b) => b.date - a.date);

      setResults(searchResults.slice(0, searchLimits.numResults));
    } catch (error) {
      console.error("Search error:", error);
      await showToast({ style: Toast.Style.Failure, title: "Search failed", message: error.message });
    } finally {
      setIsLoading(false);
      await loadingToast.hide();
    }
  };

  const getMatchPreview = (text, queryLower) => {
    const matchIndex = text.toLowerCase().indexOf(queryLower);
    if (matchIndex === -1) return text.substring(0, 80); // Return first 80 chars if no match

    const contextLength = 40;

    // Calculate exact start and end positions (40 chars on each side)
    let start = Math.max(0, matchIndex - contextLength);
    let end = Math.min(text.length, matchIndex + queryLower.length + contextLength);

    // Extract the substring with exact character counts
    let preview = text.substring(start, end);

    // Add ellipses as needed
    if (start > 0) preview = "..." + preview;
    if (end < text.length) preview = preview + "...";

    // Remove newlines
    preview = preview.replace(/\n/g, " ");

    return preview;
  };

  const navigateToChat = (chatId) => {
    // Update current chat in chatData
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.currentChat = chatId;
      return newChatData;
    });

    pop(); // Go back to main chat view
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search in chats..."
      filtering={false}
      throttle
    >
      {searchText.trim().length < 3 ? (
        <List.EmptyView title="Start typing to search" icon={Icon.MagnifyingGlass} />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView title="No results found" icon={Icon.XMarkCircle} />
      ) : (
        results.map((result, index) => (
          <List.Item
            key={`${result.chatId}-${result.messageIdx || "chat"}-${index}`}
            title={result.chatName.length > 20 ? `${result.chatName.substring(0, 20)}...` : result.chatName}
            subtitle={result.preview}
            accessories={[
              { date: result.date },
              {
                tag: {
                  value:
                    result.matchType === "user_message"
                      ? "You"
                      : result.matchType === "assistant_message"
                      ? "Assistant"
                      : "Chat",
                  color:
                    result.matchType === "user_message"
                      ? "#ff9500"
                      : result.matchType === "assistant_message"
                      ? "#30d158"
                      : "#0a84ff",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Chat" icon={Icon.Message} onAction={() => navigateToChat(result.chatId)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};
