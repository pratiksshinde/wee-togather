import { create } from "zustand";

export const useRoomStore = create((set) => ({
  users: [],

  setUsers: (users) => set({ users }),
  isHost: false,
  setIsHost: (val) => set({ isHost: val }),
  addUser: (user) =>
    set((state) => ({
      users: [...state.users, user],
    })),

  removeUser: (id) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
    })),
}));