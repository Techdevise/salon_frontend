import { createSlice } from '@reduxjs/toolkit';

const initialSelectedSalonId = typeof window !== 'undefined' ? localStorage.getItem('selectedSalonId') : null;

const salonSlice = createSlice({
  name: 'salon',
  initialState: {
    selectedSalonId: initialSelectedSalonId,
    selectedSalonInfo: null,
    salons: [],
    salonsLoaded: false, // tracks if salon list has been fetched
  },
  reducers: {
    setSalons: (state, action) => {
      state.salons = action.payload;
      state.salonsLoaded = true;
    },
    setSelectedSalon: (state, action) => {
      if (action.payload) {
        state.selectedSalonId = action.payload._id;
        state.selectedSalonInfo = action.payload;
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedSalonId', action.payload._id);
        }
      } else {
        state.selectedSalonId = null;
        state.selectedSalonInfo = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedSalonId');
        }
      }
    },
    clearSalon: (state) => {
      state.selectedSalonId = null;
      state.selectedSalonInfo = null;
      state.salons = [];
      state.salonsLoaded = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedSalonId');
      }
    }
  }
});

export const { setSalons, setSelectedSalon, clearSalon } = salonSlice.actions;
export default salonSlice.reducer;
