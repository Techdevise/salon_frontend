import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

// Try to hydrate from localStorage on initial load
try {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  if (token && user) {
    initialState.token = token;
    initialState.user = user;
    initialState.isAuthenticated = true;
  }
} catch (error) {
  console.error('Failed to parse user from local storage:', error);
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    updateProfileImage: (state, action) => {
      if (state.user) {
        state.user.profileImage = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  },
});

export const { loginSuccess, logout, updateProfileImage } = authSlice.actions;

export default authSlice.reducer;
