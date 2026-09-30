import { createSlice } from '@reduxjs/toolkit';

const salonSlice = createSlice({
  name: 'salon',
  initialState: {
    selectedSalonId: null,   // always start null — set after server verifies ownership
    selectedSalonInfo: null,
    salons: [],
    salonsLoaded: false,
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
