import { createContext, useContext } from "react";

const WorkspaceContext = createContext({
  refreshWorkspace: async () => {},
});

export function WorkspaceProvider({ value, children }) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
