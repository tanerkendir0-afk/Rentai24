import React, { useState, useCallback } from "react";
import { View, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AgentSelector from "@/components/chat/AgentSelector";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import ConversationDrawer from "@/components/chat/ConversationDrawer";
import FilePreview from "@/components/chat/FilePreview";
import { useChat } from "@/hooks/useChat";
import { useFileUpload } from "@/hooks/useFileUpload";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ChatScreen() {
  const [selectedAgent, setSelectedAgent] = useState("customer-support");
  const [showConversations, setShowConversations] = useState(false);

  const {
    messages,
    conversations,
    activeConversation,
    isStreaming,
    sendMessage,
    loadConversation,
    newConversation,
    deleteConversation,
    stopStreaming,
  } = useChat(selectedAgent);

  const { files, uploading, pickDocument, pickImage, removeFile, clearFiles } =
    useFileUpload();

  const handleSend = useCallback(
    (text: string) => {
      const fileUrls = files
        .filter((f) => f.url)
        .map((f) => f.url as string);
      sendMessage(text, fileUrls.length > 0 ? fileUrls : undefined);
      clearFiles();
    },
    [files, sendMessage, clearFiles],
  );

  const handleAgentChange = useCallback(
    (agentId: string) => {
      setSelectedAgent(agentId);
      newConversation();
    },
    [newConversation],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-border">
          <Text className="text-lg font-bold text-foreground">Chat</Text>
          <TouchableOpacity
            onPress={() => setShowConversations(true)}
            className="flex-row items-center"
          >
            <Ionicons name="chatbubbles-outline" size={22} color="#94a3b8" />
            {conversations.length > 0 && (
              <View className="bg-primary rounded-full w-5 h-5 items-center justify-center ml-1">
                <Text className="text-white text-[10px] font-bold">
                  {conversations.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Agent selector */}
        <AgentSelector
          selectedAgent={selectedAgent}
          onSelect={handleAgentChange}
        />

        {/* Messages */}
        <View className="flex-1">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            agentType={selectedAgent}
          />
        </View>

        {/* File preview */}
        <FilePreview files={files} onRemove={removeFile} />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onAttach={pickDocument}
          onCamera={pickImage}
          isStreaming={isStreaming}
          onStop={stopStreaming}
        />
      </KeyboardAvoidingView>

      {/* Conversations modal */}
      <Modal
        visible={showConversations}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ConversationDrawer
          conversations={conversations}
          activeId={activeConversation?.visibleId || null}
          onSelect={loadConversation}
          onNew={() => {
            newConversation();
            setShowConversations(false);
          }}
          onDelete={deleteConversation}
          onClose={() => setShowConversations(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}
