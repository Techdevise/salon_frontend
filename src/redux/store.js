import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import salonReducer from './slices/salonSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    salon: salonReducer,
  },
});
