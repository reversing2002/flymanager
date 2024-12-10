import React from 'react';
import { Outlet } from 'react-router-dom';

const ChatPage: React.FC = () => {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="h-full">
        <Outlet />
      </div>
    </div>
  );
};

export default ChatPage;